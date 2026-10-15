-- Merchants of Edinburgh Golf Club — member app schema
-- Run in the Supabase SQL editor (or `supabase db push`) on a fresh project.
-- Every table has row-level security on. Members see their own records plus
-- club-wide content; staff (members.is_staff) can manage everything.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────── members ──

create table public.members (
  id               uuid primary key references auth.users on delete cascade,
  member_no        text unique not null,
  first_name       text not null,
  last_name        text not null,
  category         text not null default 'Full member',
  handicap_index   numeric(4,1),
  low_index        numeric(4,1),
  valid_to         date,
  account_balance  numeric(10,2) not null default 0,   -- amount owed to the club
  bar_balance      numeric(10,2) not null default 0,   -- prepaid bar & catering card
  is_staff         boolean not null default false,
  alert_prefs      jsonb not null default
                     '{"course":true,"tee":true,"comps":true,"news":true,"offers":false}',
  created_at       timestamptz not null default now()
);

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_staff from members where id = auth.uid()), false)
$$;

-- New auth users get a member row from the metadata the club office supplies
-- when inviting them: { first_name, last_name, member_no, category }.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into members (id, member_no, first_name, last_name, category)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'member_no', 'PENDING-' || left(new.id::text, 8)),
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'category', 'Full member')
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table members enable row level security;
create policy "read own or staff" on members for select
  using (id = auth.uid() or is_staff());
create policy "staff manage" on members for all
  using (is_staff()) with check (is_staff());

-- Members may only change their own alert preferences.
create or replace function public.set_alert_prefs(p_prefs jsonb) returns void
language sql security definer set search_path = public as $$
  update members set alert_prefs = p_prefs where id = auth.uid()
$$;

-- Directory for adding playing partners: names and handicaps only.
create or replace function public.member_directory(p_search text)
returns table (id uuid, name text, handicap_index numeric)
language sql stable security definer set search_path = public as $$
  select id, first_name || ' ' || last_name, handicap_index
  from members
  where auth.uid() is not null
    and id <> auth.uid()
    and (first_name || ' ' || last_name) ilike '%' || p_search || '%'
  order by last_name, first_name
  limit 20
$$;

-- ──────────────────────────────────────────────────────── club settings ──

create table public.club_settings (
  id                    boolean primary key default true check (id),
  course_status         text not null default 'Course open',
  course_note           text not null default '',
  member_advance_days   int  not null default 14,
  visitor_advance_days  int  not null default 7,
  cancel_hours          int  not null default 24,
  guest_fee             numeric(8,2),
  buggy_price           numeric(8,2),
  trolley_price         numeric(8,2),
  buggies_total         int  not null default 6,
  dining_times          text[] not null default
                          array['12:00','12:30','13:00','13:30','18:00','18:30','19:00','19:30'],
  dining_covers         int  not null default 40,
  payments_url          text,
  club_phone            text not null default '0131 447 1219'
);
insert into club_settings default values;

alter table club_settings enable row level security;
create policy "members read" on club_settings for select using (auth.uid() is not null);
create policy "staff manage" on club_settings for all using (is_staff()) with check (is_staff());

-- ────────────────────────────────────────────────────────────── course ──

create table public.course_holes (
  hole          smallint primary key check (hole between 1 and 18),
  par           smallint not null,
  yards         smallint not null,
  stroke_index  smallint not null,
  green_lat     double precision,   -- centre of green, for GPS distances
  green_lng     double precision
);

alter table course_holes enable row level security;
create policy "members read" on course_holes for select using (auth.uid() is not null);
create policy "staff manage" on course_holes for all using (is_staff()) with check (is_staff());

-- ─────────────────────────────────────────────────────────── tee times ──

create table public.tee_slots (
  id              uuid primary key default gen_random_uuid(),
  starts_at       timestamptz not null unique,
  capacity        smallint not null default 4,
  blocked_reason  text          -- e.g. 'Society booking', 'Competition'
);

create table public.tee_bookings (
  id             uuid primary key default gen_random_uuid(),
  slot_id        uuid not null references tee_slots on delete cascade,
  member_id      uuid not null references members on delete cascade,
  players        jsonb not null,  -- [{ "name": "...", "kind": "member"|"guest", "member_id"?: uuid }]
  buggy          boolean not null default false,
  trolley        boolean not null default false,
  whs_prereg     boolean not null default false,
  status         text not null default 'confirmed' check (status in ('confirmed','cancelled')),
  checked_in_at  timestamptz,
  created_at     timestamptz not null default now()
);
create index on tee_bookings (slot_id) where status = 'confirmed';
create index on tee_bookings (member_id);

alter table tee_slots enable row level security;
alter table tee_bookings enable row level security;
create policy "members read" on tee_slots for select using (auth.uid() is not null);
create policy "staff manage" on tee_slots for all using (is_staff()) with check (is_staff());
create policy "own or staff" on tee_bookings for select using (member_id = auth.uid() or is_staff());
create policy "staff manage" on tee_bookings for all using (is_staff()) with check (is_staff());
-- Members create, cancel and check in only through the functions below.

-- The day's sheet with availability, without exposing other members' details.
create or replace function public.tee_sheet(p_day date)
returns table (slot_id uuid, starts_at timestamptz, capacity smallint, booked int,
               blocked_reason text, my_booking_id uuid)
language sql stable security definer set search_path = public as $$
  select s.id, s.starts_at, s.capacity,
         coalesce(sum(jsonb_array_length(b.players)) filter (where b.status = 'confirmed'), 0)::int,
         s.blocked_reason,
         (array_agg(b.id) filter (where b.member_id = auth.uid() and b.status = 'confirmed'))[1]
  from tee_slots s
  left join tee_bookings b on b.slot_id = s.id
  where (s.starts_at at time zone 'Europe/London')::date = p_day
    and auth.uid() is not null
  group by s.id
  order by s.starts_at
$$;

create or replace function public.book_tee_time(
  p_slot uuid, p_players jsonb, p_buggy boolean, p_trolley boolean, p_prereg boolean)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_slot tee_slots;
  v_set club_settings;
  v_booked int;
  v_guests int;
  v_id uuid;
  v_buggies int;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into v_set from club_settings;
  select * into v_slot from tee_slots where id = p_slot for update;
  if not found then raise exception 'That tee time no longer exists'; end if;
  if v_slot.blocked_reason is not null then raise exception 'That tee time is not available'; end if;
  if v_slot.starts_at <= now() then raise exception 'That tee time has passed'; end if;
  if v_slot.starts_at > now() + make_interval(days => v_set.member_advance_days) then
    raise exception 'Members can book up to % days ahead', v_set.member_advance_days;
  end if;
  if jsonb_array_length(p_players) < 1 then raise exception 'Add at least one player'; end if;

  select coalesce(sum(jsonb_array_length(players)), 0) into v_booked
  from tee_bookings where slot_id = p_slot and status = 'confirmed';
  if v_booked + jsonb_array_length(p_players) > v_slot.capacity then
    raise exception 'Only % space(s) left at this time', v_slot.capacity - v_booked;
  end if;

  if p_buggy then
    select count(*) into v_buggies from tee_bookings b join tee_slots s on s.id = b.slot_id
    where b.buggy and b.status = 'confirmed'
      and s.starts_at between v_slot.starts_at - interval '4 hours' and v_slot.starts_at + interval '4 hours';
    if v_buggies >= v_set.buggies_total then raise exception 'No buggies left around this time'; end if;
  end if;

  insert into tee_bookings (slot_id, member_id, players, buggy, trolley, whs_prereg)
  values (p_slot, auth.uid(), p_players, p_buggy, p_trolley, p_prereg)
  returning id into v_id;

  -- Charge extras to the member's account where the club has set a price.
  select count(*) into v_guests from jsonb_array_elements(p_players) p where p->>'kind' = 'guest';
  if v_guests > 0 and v_set.guest_fee is not null then
    insert into transactions (member_id, description, amount)
    values (auth.uid(), 'Guest green fee × ' || v_guests, -(v_set.guest_fee * v_guests));
  end if;
  if p_buggy and v_set.buggy_price is not null then
    insert into transactions (member_id, description, amount) values (auth.uid(), 'Buggy hire', -v_set.buggy_price);
  end if;
  if p_trolley and v_set.trolley_price is not null then
    insert into transactions (member_id, description, amount) values (auth.uid(), 'Trolley hire', -v_set.trolley_price);
  end if;
  return v_id;
end $$;

create or replace function public.cancel_tee_booking(p_booking uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_start timestamptz; v_hours int;
begin
  select s.starts_at into v_start from tee_bookings b join tee_slots s on s.id = b.slot_id
  where b.id = p_booking and b.member_id = auth.uid() and b.status = 'confirmed';
  if not found then raise exception 'Booking not found'; end if;
  select cancel_hours into v_hours from club_settings;
  if v_start - now() < make_interval(hours => v_hours) then
    raise exception 'Inside % hours — please call the pro shop to change this booking', v_hours;
  end if;
  update tee_bookings set status = 'cancelled' where id = p_booking;
end $$;

create or replace function public.check_in(p_booking uuid) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare v_start timestamptz; v_now timestamptz := now();
begin
  select s.starts_at into v_start from tee_bookings b join tee_slots s on s.id = b.slot_id
  where b.id = p_booking and b.member_id = auth.uid() and b.status = 'confirmed';
  if not found then raise exception 'Booking not found'; end if;
  if v_now < v_start - interval '90 minutes' then raise exception 'Check-in opens 90 minutes before your tee time'; end if;
  if v_now > v_start + interval '30 minutes' then raise exception 'This tee time has passed'; end if;
  update tee_bookings set checked_in_at = coalesce(checked_in_at, v_now) where id = p_booking;
  return v_now;
end $$;

-- Staff: create a day's slots, e.g. select generate_tee_slots('2026-10-18', '07:30', '16:00', 8);
create or replace function public.generate_tee_slots(p_day date, p_first time, p_last time, p_minutes int)
returns int
language plpgsql security definer set search_path = public as $$
declare v_t time := p_first; v_n int := 0;
begin
  if not is_staff() and auth.uid() is not null then raise exception 'Staff only'; end if;
  while v_t <= p_last loop
    insert into tee_slots (starts_at) values ((p_day + v_t) at time zone 'Europe/London')
    on conflict (starts_at) do nothing;
    v_n := v_n + 1;
    v_t := v_t + make_interval(mins => p_minutes);
  end loop;
  return v_n;
end $$;

-- ──────────────────────────────────────────────────────────────── news ──

create table public.news_posts (
  id            uuid primary key default gen_random_uuid(),
  category      text not null check (category in ('Course','Clubhouse','Competitions','Local rules')),
  title         text not null,
  body          text not null,
  author        text not null,
  pinned        boolean not null default false,
  published_at  timestamptz not null default now()
);
alter table news_posts enable row level security;
create policy "members read" on news_posts for select using (auth.uid() is not null);
create policy "staff manage" on news_posts for all using (is_staff()) with check (is_staff());

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid references members on delete cascade,  -- null = everyone
  category    text not null check (category in ('course','tee','comps','news','offers','account')),
  title       text not null,
  body        text not null default '',
  link        text,          -- app route, e.g. '/events/<id>'
  created_at  timestamptz not null default now()
);
alter table notifications enable row level security;
create policy "own or broadcast" on notifications for select
  using (member_id = auth.uid() or (member_id is null and auth.uid() is not null) or is_staff());
create policy "staff manage" on notifications for all using (is_staff()) with check (is_staff());

-- ─────────────────────────────────────────────────────────────── events ──

create table public.events (
  id                uuid primary key default gen_random_uuid(),
  kind              text not null check (kind in ('Competition','Social','League')),
  title             text not null,
  starts_at         timestamptz not null,
  summary           text not null default '',
  format            text,
  fee_text          text,
  prizes            text,
  entries_close_at  timestamptz,
  capacity          int,
  pairs             boolean not null default false,   -- entry needs a partner
  is_live           boolean not null default false,
  entries_count     int not null default 0
);

create table public.event_entries (
  id               uuid primary key default gen_random_uuid(),
  event_id         uuid not null references events on delete cascade,
  member_id        uuid not null references members on delete cascade,
  partner_name     text,
  preferred_start  text,
  places           int not null default 1,
  created_at       timestamptz not null default now(),
  unique (event_id, member_id)
);

alter table events enable row level security;
alter table event_entries enable row level security;
create policy "members read" on events for select using (auth.uid() is not null);
create policy "staff manage" on events for all using (is_staff()) with check (is_staff());
create policy "own or staff" on event_entries for select using (member_id = auth.uid() or is_staff());
create policy "staff manage" on event_entries for all using (is_staff()) with check (is_staff());

create or replace function public.enter_event(
  p_event uuid, p_partner text, p_start text, p_places int default 1) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_ev events; v_id uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into v_ev from events where id = p_event for update;
  if not found then raise exception 'Event not found'; end if;
  if v_ev.entries_close_at is not null and now() > v_ev.entries_close_at then
    raise exception 'Entries have closed';
  end if;
  if v_ev.pairs and coalesce(trim(p_partner), '') = '' then raise exception 'Add your partner'; end if;
  if v_ev.capacity is not null and v_ev.entries_count + p_places > v_ev.capacity then
    raise exception 'This event is full';
  end if;
  insert into event_entries (event_id, member_id, partner_name, preferred_start, places)
  values (p_event, auth.uid(), nullif(trim(p_partner), ''), p_start, p_places)
  returning id into v_id;
  update events set entries_count = entries_count + p_places where id = p_event;
  return v_id;
end $$;

create or replace function public.withdraw_from_event(p_event uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_places int;
begin
  delete from event_entries where event_id = p_event and member_id = auth.uid()
  returning places into v_places;
  if v_places is not null then
    update events set entries_count = greatest(0, entries_count - v_places) where id = p_event;
  end if;
end $$;

-- ──────────────────────────────────────────────────── rounds & scoring ──

create table public.rounds (
  id               uuid primary key default gen_random_uuid(),
  member_id        uuid not null references members on delete cascade,
  event_id         uuid references events on delete set null,
  played_on        date not null default current_date,
  course_handicap  int not null default 0,
  marker_name      text,
  holes            jsonb not null default '[]',  -- index = hole-1: { "s": strokes, "p": putts, "fw": "Yes"|"No"|"n/a" } or null
  status           text not null default 'in_progress' check (status in ('in_progress','submitted')),
  updated_at       timestamptz not null default now()
);
alter table rounds enable row level security;
create policy "own or staff read" on rounds for select using (member_id = auth.uid() or is_staff());
create policy "own insert" on rounds for insert with check (member_id = auth.uid());
create policy "own update while open" on rounds for update
  using (member_id = auth.uid() and status = 'in_progress') with check (member_id = auth.uid());

-- Live leaderboard: net to par on holes played, handicap applied pro rata.
create or replace function public.event_leaderboard(p_event uuid)
returns table (member_id uuid, name text, thru int, gross int, gross_to_par int, net_to_par int)
language sql stable security definer set search_path = public as $$
  with played as (
    select r.member_id, r.course_handicap, h.hole, (r.holes->(h.hole-1)->>'s')::int as s, h.par
    from rounds r
    join course_holes h on jsonb_typeof(r.holes->(h.hole-1)) = 'object'
    where r.event_id = p_event
  )
  select p.member_id,
         left(m.first_name, 1) || '. ' || m.last_name,
         count(*)::int,
         sum(p.s)::int,
         (sum(p.s) - sum(p.par))::int,
         (sum(p.s) - sum(p.par) - round(max(p.course_handicap) * count(*) / 18.0))::int
  from played p join members m on m.id = p.member_id
  where auth.uid() is not null
  group by p.member_id, m.first_name, m.last_name
$$;

create table public.handicap_records (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references members on delete cascade,
  played_on     date not null,
  differential  numeric(4,1) not null,
  source        text not null default 'WHS'
);
alter table handicap_records enable row level security;
create policy "own or staff" on handicap_records for select using (member_id = auth.uid() or is_staff());
create policy "staff manage" on handicap_records for all using (is_staff()) with check (is_staff());

-- ──────────────────────────────────────────────────── brasserie & lessons ──

create table public.dining_bookings (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references members on delete cascade,
  starts_at   timestamptz not null,
  party_size  int not null check (party_size between 1 and 12),
  requests    text,
  status      text not null default 'confirmed' check (status in ('confirmed','cancelled')),
  created_at  timestamptz not null default now()
);
alter table dining_bookings enable row level security;
create policy "own or staff" on dining_bookings for select using (member_id = auth.uid() or is_staff());
create policy "staff manage" on dining_bookings for all using (is_staff()) with check (is_staff());

create or replace function public.dining_availability(p_day date)
returns table (time_label text, covers_left int)
language sql stable security definer set search_path = public as $$
  select t, (select dining_covers from club_settings) - coalesce((
           select sum(party_size) from dining_bookings
           where status = 'confirmed'
             and starts_at = (p_day + t::time) at time zone 'Europe/London'), 0)::int
  from unnest((select dining_times from club_settings)) as t
  where auth.uid() is not null
$$;

create or replace function public.book_table(p_day date, p_time text, p_party int, p_requests text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_left int; v_id uuid; p_starts timestamptz;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if not p_time = any((select dining_times from club_settings)) then raise exception 'Choose one of the listed times'; end if;
  p_starts := (p_day + p_time::time) at time zone 'Europe/London';
  if p_starts <= now() then raise exception 'That time has passed'; end if;
  perform pg_advisory_xact_lock(hashtext('dining' || p_starts::text));
  select (select dining_covers from club_settings) - coalesce(sum(party_size), 0) into v_left
  from dining_bookings where status = 'confirmed' and starts_at = p_starts;
  if v_left < p_party then raise exception 'Not enough space at that time — try another'; end if;
  insert into dining_bookings (member_id, starts_at, party_size, requests)
  values (auth.uid(), p_starts, p_party, nullif(trim(p_requests), ''))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.cancel_table(p_booking uuid) returns void
language sql security definer set search_path = public as $$
  update dining_bookings set status = 'cancelled'
  where id = p_booking and member_id = auth.uid() and starts_at > now()
$$;

create table public.lesson_types (
  id        uuid primary key default gen_random_uuid(),
  title     text not null,
  subtitle  text not null default '',
  price     numeric(8,2),
  minutes   int not null,
  sort      int not null default 0
);
create table public.lesson_slots (
  id              uuid primary key default gen_random_uuid(),
  starts_at       timestamptz not null,
  booked_by       uuid references members on delete set null,
  lesson_type_id  uuid references lesson_types on delete set null
);
alter table lesson_types enable row level security;
alter table lesson_slots enable row level security;
create policy "members read" on lesson_types for select using (auth.uid() is not null);
create policy "staff manage" on lesson_types for all using (is_staff()) with check (is_staff());
create policy "free or own" on lesson_slots for select
  using ((booked_by is null and auth.uid() is not null) or booked_by = auth.uid() or is_staff());
create policy "staff manage" on lesson_slots for all using (is_staff()) with check (is_staff());

create or replace function public.book_lesson(p_slot uuid, p_type uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update lesson_slots set booked_by = auth.uid(), lesson_type_id = p_type
  where id = p_slot and booked_by is null and starts_at > now();
  if not found then raise exception 'Sorry, that lesson time has just been taken'; end if;
end $$;

create or replace function public.cancel_lesson(p_slot uuid) returns void
language sql security definer set search_path = public as $$
  update lesson_slots set booked_by = null, lesson_type_id = null
  where id = p_slot and booked_by = auth.uid() and starts_at > now() + interval '24 hours'
$$;

-- ────────────────────────────────────────────────────────────── account ──

create table public.transactions (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references members on delete cascade,
  description  text not null,
  amount       numeric(10,2) not null,   -- negative = charge, positive = payment/top-up
  created_at   timestamptz not null default now()
);
create table public.invoices (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references members on delete cascade,
  number     text not null,
  title      text not null,
  issued_on  date not null,
  amount     numeric(10,2) not null,
  status     text not null default 'Due' check (status in ('Paid','Due')),
  pdf_url    text
);
alter table transactions enable row level security;
alter table invoices enable row level security;
create policy "own or staff" on transactions for select using (member_id = auth.uid() or is_staff());
create policy "staff manage" on transactions for all using (is_staff()) with check (is_staff());
create policy "own or staff" on invoices for select using (member_id = auth.uid() or is_staff());
create policy "staff manage" on invoices for all using (is_staff()) with check (is_staff());

-- Charges from book_tee_time land on the member's account balance.
create or replace function public.apply_transaction() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update members set account_balance = account_balance - new.amount where id = new.member_id;
  return new;
end $$;
create trigger on_transaction after insert on transactions
  for each row execute function public.apply_transaction();
