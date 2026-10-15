-- Starter content. Run after schema.sql. Replace anything marked TODO with the club's real figures.

-- TODO: these yardages and stroke indexes are the prototype's sample card (par 65).
-- Replace with the official scorecard, and add green_lat/green_lng per hole to enable GPS distances.
insert into course_holes (hole, par, yards, stroke_index) values
  (1,4,352,7),(2,4,338,9),(3,3,164,13),(4,4,371,1),(5,3,142,17),(6,4,326,11),
  (7,3,187,15),(8,4,402,3),(9,4,315,5),(10,4,344,8),(11,3,156,14),(12,4,309,10),
  (13,3,171,12),(14,4,388,2),(15,3,133,18),(16,4,297,6),(17,4,361,4),(18,3,149,16);

update club_settings set course_note = 'Buggies permitted';

-- TODO: prices. Left null they show as "Ask the pro shop" in the app.
insert into lesson_types (title, subtitle, minutes, sort) values
  ('30-minute lesson', 'One to one', 30, 1),
  ('60-minute lesson', 'Includes video swing analysis', 60, 2),
  ('Playing lesson', '9 holes of on-course coaching', 120, 3),
  ('Junior lesson', 'Under 18s', 30, 4);

-- Two weeks of tee times, 07:30–16:00 every 8 minutes.
select generate_tee_slots((current_date + d)::date, '07:30', '16:00', 8)
from generate_series(0, 13) d;

-- Lesson slots for the coming week (Tue–Sat).
insert into lesson_slots (starts_at)
select ((current_date + d)::date + t::time) at time zone 'Europe/London'
from generate_series(1, 7) d, unnest(array['10:00','11:00','14:00','15:30']) t
where extract(isodow from current_date + d) between 2 and 6;

insert into news_posts (category, title, body, author, pinned) values
  ('Course', 'Welcome to the new member app',
   'Book tee times, enter competitions, reserve a table at the Brasserie and keep your scorecard — all from your phone.',
   'Club Office', true);

insert into events (kind, title, starts_at, summary, format, prizes, entries_close_at, capacity, pairs) values
  ('Competition', 'Autumn Foursomes', (current_date + 10 + time '08:00') at time zone 'Europe/London',
   'Mixed · Stableford', 'Mixed foursomes · Stableford · 50% of combined handicap',
   'Top 3 pairs · Nearest the pin', (current_date + 7 + time '18:00') at time zone 'Europe/London', 64, true),
  ('Social', 'Quiz night in the Pentland Bar', (current_date + 16 + time '19:30') at time zone 'Europe/London',
   'Teams of up to 6 · Supper included', null, null, null, 60, false);
