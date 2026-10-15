-- 1. The official scorecard (merchantsgolf.com/the-course, checked 16 Oct 2026).
--    `yards` is the Black tee; Men+ par and stroke index in par/stroke_index.

alter table course_holes
  add column name        text,
  add column yards_blue  smallint,
  add column yards_green smallint,
  add column par_women   smallint,
  add column si_women    smallint;

update course_holes h set
  name = v.name, par = v.par, par_women = v.par_w, stroke_index = v.si, si_women = v.si_w,
  yards = v.black, yards_blue = v.blue, yards_green = v.green
from (values
  ( 1, 'Beeches',          3, 4,  5, 17, 236, 222, 230),
  ( 2, 'Doon ''n Up',      4, 4, 13,  9, 249, 241, 237),
  ( 3, 'Steil''s Quarry',  3, 3, 11,  3, 181, 176, 171),
  ( 4, 'Wester Craig',     4, 4,  1,  7, 395, 382, 317),
  ( 5, 'Braids',           4, 4, 17, 13, 272, 242, 272),
  ( 6, 'Firhill',          4, 4,  9,  1, 391, 385, 378),
  ( 7, 'Napier',           3, 3, 15, 15, 115, 104, 109),
  ( 8, 'Hawthorn',         4, 5,  7,  5, 399, 390, 399),
  ( 9, 'Pumphouse',        4, 5,  3, 11, 417, 416, 410),
  (10, 'Hewitt''s Hike',   4, 4, 10,  6, 280, 263, 276),
  (11, 'Pan',              3, 3,  6, 16, 171, 171, 121),
  (12, 'Easter Craig',     3, 3, 12, 10, 158, 155, 151),
  (13, 'Tap o'' the World',3, 3,  8,  8, 207, 202, 190),
  (14, 'Beer Knowe',       4, 4,  2,  2, 314, 299, 307),
  (15, 'Kestrel View',     4, 4, 18, 18, 250, 242, 236),
  (16, 'Sunnyside',        4, 4,  4,  4, 368, 354, 368),
  (17, 'Deil''s Run',      3, 3, 14, 14, 157, 148, 154),
  (18, 'Millenium House',  4, 4, 16, 12, 275, 271, 263)
) as v(hole, name, par, par_w, si, si_w, black, blue, green)
where h.hole = v.hole;

-- Tee ratings, for WHS course handicap = index × slope ÷ 113 + (course rating − par).
create table public.course_tees (
  tee            text not null,
  gender         text not null check (gender in ('Men','Women')),
  course_rating  numeric(3,1) not null,
  slope          int not null,
  par            int not null,
  sort           int not null,
  primary key (tee, gender)
);
insert into course_tees values
  ('Black','Men',64.8,118,65,1), ('Blue','Men',64.0,116,65,2), ('Green','Men',63.7,115,65,3),
  ('Black','Women',69.0,124,68,4), ('Blue','Women',67.9,121,68,5), ('Green','Women',67.5,120,68,6);
alter table course_tees enable row level security;
create policy "members read" on course_tees for select using (auth.uid() is not null);
create policy "staff manage" on course_tees for all using (is_staff()) with check (is_staff());
grant select, insert, update, delete on course_tees to authenticated;

alter table rounds add column tee text, add column gender text check (gender in ('Men','Women'));

-- Women+ rounds score against the women's par and stroke index.
create or replace function public.event_leaderboard(p_event uuid)
returns table (member_id uuid, name text, thru int, gross int, gross_to_par int, net_to_par int)
language sql stable security definer set search_path = public as $$
  with played as (
    select r.member_id, r.course_handicap, (r.holes->(h.hole-1)->>'s')::int as s,
           case when r.gender = 'Women' then coalesce(h.par_women, h.par) else h.par end as par
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

-- 2. Club facts from the website.
alter table club_settings add column visitor_booking_url text not null
  default 'https://visitors.brsgolf.com/merchantsofedinburgh#/course/1';
alter table members alter column valid_to set default '2027-02-28';  -- membership year runs 1 March – 28 February

-- 3. No double bookings: a member can appear in a tee time only once.
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
  v_members text[];
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into v_set from club_settings;
  -- Locking the slot serialises bookings for it, so the checks below can't race.
  select * into v_slot from tee_slots where id = p_slot for update;
  if not found then raise exception 'That tee time no longer exists'; end if;
  if v_slot.blocked_reason is not null then raise exception 'That tee time is not available'; end if;
  if v_slot.starts_at <= now() then raise exception 'That tee time has passed'; end if;
  if v_slot.starts_at > now() + make_interval(days => v_set.member_advance_days) then
    raise exception 'Members can book up to % days ahead', v_set.member_advance_days;
  end if;
  if jsonb_array_length(p_players) < 1 then raise exception 'Add at least one player'; end if;

  -- Members in this booking: the booker plus any members they added.
  select array_agg(distinct m) into v_members from (
    select auth.uid()::text as m
    union all
    select q->>'member_id' from jsonb_array_elements(p_players) q where q->>'member_id' is not null
  ) x;
  if (select count(*) from jsonb_array_elements(p_players) q where q->>'member_id' is not null)
     > (select count(distinct q->>'member_id') from jsonb_array_elements(p_players) q where q->>'member_id' is not null) then
    raise exception 'The same member is listed twice';
  end if;
  if exists (
    select 1 from tee_bookings b
    where b.slot_id = p_slot and b.status = 'confirmed'
      and (b.member_id::text = any(v_members)
           or exists (select 1 from jsonb_array_elements(b.players) p where p->>'member_id' = any(v_members)))
  ) then
    raise exception 'You, or a member you added, are already booked at this time';
  end if;

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

-- Belt and braces: the database itself refuses a second booking by the same booker.
create unique index tee_bookings_one_per_member_per_slot
  on tee_bookings (slot_id, member_id) where status = 'confirmed';

-- 4. Lessons are with the club's PGA AAT Professional; prices to be confirmed by the club.
update lesson_types set subtitle = 'One to one with the PGA professional' where title = '30-minute lesson';
