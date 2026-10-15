-- Push notifications, scheduled jobs, staff tools and the scorecard queue.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

-- ───────────────────────────────────────────────────────── push tokens ──

create table public.push_tokens (
  token       text primary key,         -- ExponentPushToken[...]
  member_id   uuid not null references members on delete cascade,
  platform    text,
  updated_at  timestamptz not null default now()
);
alter table push_tokens enable row level security;
create policy "own" on push_tokens for select using (member_id = auth.uid());
grant select on push_tokens to authenticated;

-- A phone belongs to whoever signed in on it last.
create or replace function public.register_push_token(p_token text, p_platform text) returns void
language sql security definer set search_path = public as $$
  insert into push_tokens (token, member_id, platform) values (p_token, auth.uid(), p_platform)
  on conflict (token) do update set member_id = auth.uid(), platform = excluded.platform, updated_at = now()
$$;

create or replace function public.unregister_push_token(p_token text) returns void
language sql security definer set search_path = public as $$
  delete from push_tokens where token = p_token and member_id = auth.uid()
$$;

-- Every new notification row is pushed to the phones of members who want that category.
-- Expo's push service takes up to 100 messages per request.
create or replace function public.send_push() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare v_batch jsonb;
begin
  for v_batch in
    select jsonb_agg(msg) from (
      select jsonb_build_object(
               'to', t.token, 'title', new.title, 'body', new.body, 'sound', 'default',
               'channelId', 'default', 'data', jsonb_build_object('url', coalesce(new.link, '/notifications'))
             ) as msg,
             (row_number() over () - 1) / 100 as grp
      from push_tokens t join members m on m.id = t.member_id
      where (new.member_id is null or m.id = new.member_id)
        and (new.category = 'account' or coalesce((m.alert_prefs ->> new.category)::boolean, true))
    ) x group by grp
  loop
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := v_batch,
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
    );
  end loop;
  return new;
end $$;

create trigger on_notification_push after insert on notifications
  for each row execute function public.send_push();

-- ───────────────────────────────────────────────────────── scheduled jobs ──

-- Reminder the evening before, to the booker and any members they added.
create or replace function public.send_tee_reminders() returns int
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  insert into notifications (member_id, category, title, body, link)
  select distinct on (who, b.id) who, 'tee', 'Your tee time is tomorrow',
         to_char(s.starts_at at time zone 'Europe/London', 'HH24:MI') || ' · '
           || jsonb_array_length(b.players) || ' player' || case when jsonb_array_length(b.players) = 1 then '' else 's' end
           || case when b.buggy then ' · Buggy booked' else '' end,
         '/check-in'
  from tee_bookings b
  join tee_slots s on s.id = b.slot_id
  cross join lateral (
    select b.member_id as who
    union
    select (p->>'member_id')::uuid from jsonb_array_elements(b.players) p where p->>'member_id' is not null
  ) w
  where b.status = 'confirmed'
    and (s.starts_at at time zone 'Europe/London')::date = (now() at time zone 'Europe/London')::date + 1;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke execute on function public.send_tee_reminders() from public, anon, authenticated;

-- 17:00 UTC is 6pm in summer and 5pm in winter.
select cron.schedule('tee-reminders', '0 17 * * *', 'select public.send_tee_reminders()');
-- Keep the tee sheet open 14 days ahead.
select cron.schedule('roll-tee-sheet', '0 2 * * *',
  $$select public.generate_tee_slots((now() at time zone 'Europe/London')::date + 14, '07:30', '16:00', 8)$$);

-- ───────────────────────────────────────────────────────── staff tools ──

-- The full tee sheet for a day, with names and check-in status.
create or replace function public.staff_tee_sheet(p_day date)
returns table (slot_id uuid, starts_at timestamptz, capacity smallint, blocked_reason text, bookings jsonb)
language sql stable security definer set search_path = public as $$
  select s.id, s.starts_at, s.capacity, s.blocked_reason,
         coalesce(jsonb_agg(jsonb_build_object(
           'id', b.id, 'booker', m.first_name || ' ' || m.last_name, 'member_no', m.member_no,
           'players', b.players, 'buggy', b.buggy, 'trolley', b.trolley, 'checked_in_at', b.checked_in_at
         ) order by b.created_at) filter (where b.id is not null), '[]')
  from tee_slots s
  left join tee_bookings b on b.slot_id = s.id and b.status = 'confirmed'
  left join members m on m.id = b.member_id
  where (s.starts_at at time zone 'Europe/London')::date = p_day and is_staff()
  group by s.id
  order by s.starts_at
$$;

-- Membership card QR codes read "MEGC:<member id>".
create or replace function public.staff_lookup_card(p_code text)
returns table (member_id uuid, name text, member_no text, category text, valid_to date,
               booking_id uuid, starts_at timestamptz, players int, checked_in_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare v_id uuid;
begin
  if not is_staff() then raise exception 'Staff only'; end if;
  begin
    v_id := substring(p_code from '^MEGC:([0-9a-f-]{36})$')::uuid;
  exception when others then v_id := null;
  end;
  if v_id is null then raise exception 'That isn’t a Merchants membership card'; end if;
  return query
    select m.id, m.first_name || ' ' || m.last_name, m.member_no, m.category, m.valid_to,
           b.id, s.starts_at, jsonb_array_length(b.players), b.checked_in_at
    from members m
    left join lateral (
      select b.* from tee_bookings b join tee_slots s2 on s2.id = b.slot_id
      where b.status = 'confirmed'
        and (b.member_id = m.id or b.players @> jsonb_build_array(jsonb_build_object('member_id', m.id::text)))
        and (s2.starts_at at time zone 'Europe/London')::date = (now() at time zone 'Europe/London')::date
      order by s2.starts_at limit 1
    ) b on true
    left join tee_slots s on s.id = b.slot_id
    where m.id = v_id;
  if not found then raise exception 'No member found for this card'; end if;
end $$;

-- ─────────────────────────────────────────────── handicap secretary queue ──

alter table rounds add column posted_at timestamptz, add column posted_by uuid references members;
create policy "staff update" on rounds for update using (is_staff()) with check (is_staff());

create or replace function public.staff_scorecards(p_posted boolean)
returns table (id uuid, member_id uuid, name text, member_no text, played_on date, tee text, gender text,
               course_handicap int, marker_name text, holes jsonb, gross int, posted_at timestamptz,
               event_title text, handicap_index numeric)
language sql stable security definer set search_path = public as $$
  select r.id, r.member_id, m.first_name || ' ' || m.last_name, m.member_no, r.played_on, r.tee, r.gender,
         r.course_handicap, r.marker_name, r.holes,
         (select sum((h->>'s')::int) from jsonb_array_elements(r.holes) h where jsonb_typeof(h) = 'object')::int,
         r.posted_at, e.title, m.handicap_index
  from rounds r join members m on m.id = r.member_id
  left join events e on e.id = r.event_id
  where r.status = 'submitted' and (r.posted_at is not null) = p_posted and is_staff()
  order by r.played_on desc, r.updated_at desc
  limit 100
$$;

-- Mark a card as posted to WHS, optionally recording the member's new index.
create or replace function public.staff_mark_posted(p_round uuid, p_new_index numeric, p_differential numeric)
returns void
language plpgsql security definer set search_path = public as $$
declare v_member uuid; v_day date;
begin
  if not is_staff() then raise exception 'Staff only'; end if;
  update rounds set posted_at = now(), posted_by = auth.uid()
  where id = p_round and status = 'submitted' returning member_id, played_on into v_member, v_day;
  if v_member is null then raise exception 'Card not found'; end if;
  if p_differential is not null then
    insert into handicap_records (member_id, played_on, differential) values (v_member, v_day, p_differential);
  end if;
  if p_new_index is not null then
    update members set handicap_index = p_new_index,
      low_index = least(coalesce(low_index, p_new_index), p_new_index)
    where id = v_member;
    insert into notifications (member_id, category, title, body, link)
    values (v_member, 'comps', 'Handicap updated', 'Your handicap index is now ' || p_new_index, '/handicap');
  end if;
end $$;

grant execute on all functions in schema public to authenticated;
revoke execute on function public.send_tee_reminders() from authenticated;
revoke execute on function public.send_push() from authenticated;
