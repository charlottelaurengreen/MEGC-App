# Merchants Member App

The member app for Merchants of Edinburgh Golf Club, for iOS and Android. It's built with Expo (React Native) and Supabase, from the 19-screen design on the club's design canvas.

## What members can do

| Area | Screens |
| --- | --- |
| Sign in | Email and password, password reset |
| Tee times | 14-day tee sheet, booking with members and guests, buggy and trolley hire, WHS pre-registration, cancellation, check-in |
| Membership card | Name, member number and category to show at the pro shop |
| Club news & notifications | Pinned and filtered news, notification list, alert preferences |
| Events | Competitions, social nights and leagues, entry with a partner, live leaderboard (net and gross) |
| Brasserie | Table booking by date, time and party size, with live availability |
| Lessons | Lesson types and the pro's open times |
| Course | The official card (hole names; Black, Blue and Green tees; Men+ and Women+), GPS distance to the green once green positions are added |
| Scorecard | Choice of tee and card, WHS course handicap from slope and course rating, Stableford points, putts and fairways, submitted to the club |
| Handicap | Index, low index, and the last 20 differentials with the counting 8 highlighted |
| Account | Balance, bar card, invoices and recent charges |

## First-time setup

1. **Create the backend.** Make a free project at [supabase.com](https://supabase.com). Apply the database with `npx supabase db push --db-url "<session pooler connection string>"`. Alternatively, paste the files in `supabase/migrations/` into the SQL editor, in filename order.
2. **Connect the app.** Copy `.env.example` to `.env.local` and paste in the project URL and publishable key from *Project Settings → API*.
3. **Add a test member.** In *Authentication → Users → Add user*, create a user with an email and password. Then set their details in the `members` table: name, member number, handicap index and `valid_to`. To make someone staff, set `is_staff` to `true`.
4. **Run it.**
   ```bash
   npm install
   npx expo start
   ```
   Scan the QR code with **Expo Go** on your phone (App Store or Google Play). Everything works in Expo Go except push notifications, and possibly Add to calendar. For those, make a development build: `npx eas-cli@latest build --profile development --platform android` (or `ios`), install it on the phone, then `npx expo start`.

## Running the club day to day

Staff manage content in the Supabase dashboard's *Table Editor*:

- **Course status** (the green band on Home): `club_settings.course_status` and `course_note`.
- **News**: add rows to `news_posts`. Set `pinned` to keep one at the top.
- **Notifications**: add rows to `notifications`. Leave `member_id` empty to send to everyone.
- **Tee sheet**: run `select generate_tee_slots('2026-11-01', '07:30', '16:00', 8);` for each new day. To block a time for a society or competition, set `blocked_reason` on the slot.
- **Events**: add rows to `events`. Set `is_live` during a competition to show its live leaderboard.
- **Prices**: `club_settings.guest_fee`, `buggy_price` and `trolley_price`, plus `lesson_types.price`. Until a price is set, the app shows "Ask the pro shop".
- **Handicaps**: update `members.handicap_index` and add `handicap_records` rows from the club's WHS system.

Booking rules are enforced on the server: capacity, the booking window, the cancellation cut-off, buggy numbers, and one booking per member per tee time. Members can't bypass them by editing requests.

## Before going live: TODO

- [ ] **Tee sheet source.** Visitors book through BRS Golf. If members do too, decide whether the app's own tee sheet replaces BRS or whether member booking should link to BRS (see "Decisions" below).
- [ ] **Prices.** The member's-guest green fee, buggy and trolley hire, and lessons (`club_settings`, `lesson_types`). None of these are on the website. Visitor rates are £45–£75.
- [ ] **Payments.** Set `club_settings.payments_url` to the club's payment page. There are no in-app card payments yet.
- [ ] **Green positions.** Add `green_lat`/`green_lng` to each row of `course_holes` to turn on GPS distances.
- [ ] **Brand font.** TT Norms is licensed. Add the font files to `assets/fonts` and load them with `expo-font`. Until then the app uses the system font.
- [ ] **Club professional's name** (`src/app/lessons.tsx`). The website lists only "PGA AAT Professional".
- [ ] **Higher-resolution icon.** `assets/images/icon.png` is upscaled from a 447px image. A 1024px original would be sharper.

## Decisions

- **Tee sheet:** The club uses BRS Golf for visitor bookings. Running a separate tee sheet in the app risks double-booking unless BRS is retired for members, or the app reads and writes BRS (this needs BRS's API, by arrangement with BRS).

## Staff tools

Members with `is_staff = true` see **More → Staff tools**:

- **Tee sheet:** every booking with names, check-in, cancel, and block or unblock times.
- **Scan a membership card:** the phone camera reads the QR code on a member's card, shows their membership and today's tee time, and checks them in. No separate scanners needed.
- **Post & notify:** course status (the green band on Home), news posts, and alerts pushed to members' phones.
- **Events:** add events, announce them, and start or end live scoring for the leaderboard.
- **Scorecards:** the handicap secretary's queue. Enter each card on the Scottish Golf system, then mark it posted, optionally with the new index. The member's app updates and they're notified.

## Push notifications

Every row added to `notifications` is pushed to members' phones by the database, through Expo's push service. Members who have switched that kind of alert off don't get it. Two jobs run automatically: tee-time reminders at 17:00 UTC the day before, and adding a new day to the tee sheet at 02:00 so it always runs 14 days ahead.

Push needs the app linked to EAS (`npx eas-cli@latest init`) and a development or store build. Expo Go on Android can't receive push, and on iOS push needs an Apple Developer account.

## Not built yet

- **Automatic WHS submission.** Scottish Golf only accepts scores from accredited club-management software, so there is no public API to connect to. Use the Scorecards queue instead.
- **Visitor booking in the app.** This needs online card payments (for example, a Stripe account) and a decision about BRS. The visitor button opens BRS.
- **Apple and Google Wallet passes.** These need a Pass Type certificate from the Apple Developer account and a Google Wallet issuer account, plus a small server to sign the passes.
- **Adding members from the app.** Use Supabase → Authentication → Users.

## Publishing to the stores

Builds run in the cloud with EAS, so no Mac is needed. Build settings are in `eas.json`. The bundle ID on both stores is `com.merchantsgolf.members`.

1. **Accounts.**
   - Expo account: free, at expo.dev.
   - Apple Developer Program: $99 a year, at developer.apple.com. Enrol as an organisation; this needs the club's D-U-N-S number, which is free from Dun & Bradstreet.
   - Google Play Console: $25 once, at play.google.com/console. Register as an organisation, verify the identity, and add a D-U-N-S number.
2. **Link the project:** `npx eas-cli@latest login`, then `npx eas-cli@latest init`.
3. **Build:** `npx eas-cli@latest build --platform all --profile production`. EAS creates and stores the signing keys.
4. **Store listings.**
   - Name, description and screenshots: 6.7" iPhone and an Android phone.
   - Privacy policy URL, and the data-safety / App Privacy answers. The app stores name, email, member number, bookings and scores, and uses location on the course only.
   - A demo login for the reviewers. Login is required, so both stores need one.
5. **Submit:** `npx eas-cli@latest submit --platform ios`, then `--platform android`.
   - iOS goes to TestFlight first. Release it for review from App Store Connect.
   - New Google Play personal accounts must run a closed test with 12 testers for 14 days. Organisation accounts are exempt.
6. **Updates:** New versions go through steps 3 and 5 again. To ship small fixes without store review, add EAS Update (`npx expo install expo-updates`, then `npx eas-cli@latest update:configure`).

## Project layout

```
src/app/            screens (Expo Router; each file is a route)
  (tabs)/           Home, Tee times, Events, Course, More
src/components/     branded UI pieces and icons
src/lib/            Supabase client, data functions, session, formatting
src/theme.ts        brand colours and type
supabase/migrations/ database schema and starter data
```
