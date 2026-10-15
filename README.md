# Merchants Member App

The member app for Merchants of Edinburgh Golf Club, for iOS and Android. It's built with Expo (React Native) and Supabase, from the 19-screen design on the club's design canvas.

## What members can do

| Area | Screens |
| --- | --- |
| Sign in | Email and password, password reset |
| Tee times | 14-day tee sheet, booking with members and guests, buggy and trolley hire, WHS pre-registration, cancellation, check-in |
| Membership card | QR code for the club's scanners |
| Club news & notifications | Pinned and filtered news, notification list, alert preferences |
| Events | Competitions, social nights and leagues, entry with a partner, live leaderboard (net and gross) |
| Brasserie | Table booking by date, time and party size, with live availability |
| Lessons | Lesson types and the pro's open times |
| Course | Hole-by-hole card, GPS distance to the green once green positions are added |
| Scorecard | Hole-by-hole scoring with Stableford points, putts and fairways, submitted to the club |
| Handicap | Index, low index, and the last 20 differentials with the counting 8 highlighted |
| Account | Balance, bar card, invoices and recent charges |

## First-time setup

1. **Create the backend.** Make a free project at [supabase.com](https://supabase.com). In the SQL editor, run `supabase/schema.sql`, then `supabase/seed.sql`.
2. **Connect the app.** Copy `.env.example` to `.env.local` and paste in the project URL and publishable key from *Project Settings → API*.
3. **Add a test member.** In *Authentication → Users → Add user*, create a user with an email and password. Then set their details in the `members` table: name, member number, handicap index and `valid_to`. To make someone staff, set `is_staff` to `true`.
4. **Run it.**
   ```bash
   npm install
   npx expo start
   ```
   Scan the QR code with **Expo Go** on your phone (App Store or Google Play).

## Running the club day to day

Staff manage content in the Supabase dashboard's *Table Editor*:

- **Course status** (the green band on Home): `club_settings.course_status` and `course_note`.
- **News**: add rows to `news_posts`. Set `pinned` to keep one at the top.
- **Notifications**: add rows to `notifications`. Leave `member_id` empty to send to everyone.
- **Tee sheet**: run `select generate_tee_slots('2026-11-01', '07:30', '16:00', 8);` for each new day. To block a time for a society or competition, set `blocked_reason` on the slot.
- **Events**: add rows to `events`. Set `is_live` during a competition to show its live leaderboard.
- **Prices**: `club_settings.guest_fee`, `buggy_price` and `trolley_price`, plus `lesson_types.price`. Until a price is set, the app shows "Ask the pro shop".
- **Handicaps**: update `members.handicap_index` and add `handicap_records` rows from the club's WHS system.

Booking rules are enforced on the server: capacity, the booking window, the cancellation cut-off and buggy numbers. Members can't bypass them by editing requests.

## Before going live: TODO

- [ ] **Course card.** `seed.sql` uses the design's sample yardages and stroke indexes. Replace them with the official card, and add `green_lat`/`green_lng` per hole to turn on GPS.
- [ ] **Prices** in `club_settings` and `lesson_types`.
- [ ] **Payments.** Set `club_settings.payments_url` to the club's payment page. There are no in-app card payments yet.
- [ ] **QR format.** The card encodes `MERCHANTS:<member number>`. Confirm it matches what the club's scanners expect (`src/app/check-in.tsx`).
- [ ] **Brand font.** TT Norms is licensed. Add the font files to `assets/fonts` and load them with `expo-font`. Until then the app uses the system font.
- [ ] **Club professional's name** (`src/app/lessons.tsx`).
- [ ] **App icon and splash.** Replace the placeholder images in `assets/images` with the club crest.

## Not built yet

- Push notifications. Notifications currently appear in the app only.
- Automatic WHS submission to Scottish Golf. Submitted cards go to the club, and the handicap secretary posts them.
- Visitor booking. Visitors are sent to the website.
- Add to calendar and Apple/Google Wallet cards. Both need a custom development build.
- A staff admin screen. For now, staff use the Supabase dashboard.

## Publishing to the stores

Builds and store submission use EAS. Neither needs a Mac.

```bash
npx eas-cli@latest build --platform all
npx eas-cli@latest submit --platform ios      # needs an Apple Developer account ($99/yr)
npx eas-cli@latest submit --platform android  # needs a Google Play account ($25 once)
```

The bundle IDs are `com.merchantsgolf.members` (set in `app.json`).

## Project layout

```
src/app/            screens (Expo Router; each file is a route)
  (tabs)/           Home, Tee times, Events, Course, More
src/components/     branded UI pieces and icons
src/lib/            Supabase client, data functions, session, formatting
src/theme.ts        brand colours and type
supabase/           database schema and starter data
```
