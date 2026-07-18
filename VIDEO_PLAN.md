# Focus App — Demo Video Plan

*Target length: 2:30–3:00 · Format: screen recording + voiceover · Orientation: phone portrait for the app, screen-share for code*

---

## Goal

A tight, energetic walkthrough that shows (1) what the app does for a student, and
(2) how it's built. Someone watching should come away thinking "polished product"
*and* "real engineering behind it."

## Setup checklist (before recording)

- Seed a demo account with some history so streaks, XP, level (aim for **Level 5+**
  so the pet is a Wolf/Eagle, not an egg), a few completed quests, and a couple of
  earned achievements are visible. Empty screens look unfinished on camera.
- Pick a punchy accent color (e.g. the purple/indigo preset) and a theme you like —
  you'll switch it live near the end.
- Have the **Study timer** ready to start, at least one **Goal** and **Task** already
  created, and one wellness log so analytics render.
- If demoing Google Calendar / Apple Health, sign in / sync **beforehand** so the
  screens show real data — don't burn runtime on OAuth popups.
- Record app on **iOS simulator or a real phone**; record the coding section on the
  desktop with the editor + a running Metro/Expo terminal visible.
- Silence notifications; use a clean home screen.
- **Record out of order.** Sections 2–3 (login + onboarding) need a *signed-out, fresh*
  install, but sections 4–7 need the *seeded* account. Shoot the seeded material first,
  then sign out / reset (Settings fires the `RESET_APP` event) and grab the login and
  onboarding footage last. Reassemble in the edit.
- Have the **web build open in a browser, already signed into the same account**, ready
  for the cross-platform cut in section 7.

---

## Runtime breakdown

| Section | Time | Screen |
|---------|------|--------|
| 1. Hook / title | 0:00–0:10 | App logo → Dashboard |
| 2. Sign up / log in | 0:10–0:22 | Login screen |
| 3. Onboarding (quick) | 0:22–0:36 | Onboarding carousel |
| 4. Dashboard + Study timer | 0:36–1:05 | Dashboard, Study |
| 5. Gamification | 1:05–1:35 | Game screen, quests, pet, Star Catch |
| 6. Productivity: Goals, Tasks, Schedule, Wellness | 1:35–2:02 | those screens |
| 7. Settings: theming, notifications, account & sync | 2:02–2:25 | Settings, web build |
| 8. **The Code** | 2:25–2:57 | Editor |
| 9. Close | 2:57–3:02 | Dashboard / logo |

---

## Section-by-section script

### 1. Hook / Title — 0:00–0:10
**On screen:** App opens to the Dashboard hero card animating in. Overlay the title
*"Focus — a study companion for students."*

**VO:** "This is Focus — a cross-platform study app that turns getting your work done
into something that actually feels rewarding. It runs on iOS, Android, and the web."

### 2. Sign up / Log in — 0:10–0:22
**On screen:** Fresh launch showing the **Login gate** (`app/login.tsx`). Show the
sign-up form, type an email + password, and toggle between **Sign In** and **Sign Up**.
Then tap **"Maybe later"** to show the skip path — and continue into onboarding from
there.

> **Recording tip:** don't create a real account live — sign-up may hit an email
> confirmation wall and stall the take. Type the fields, then cut to either a
> pre-made account signing in cleanly, or take the "Maybe later" path.

**VO:** "Accounts are optional but useful. Sign up with an email and password and your
progress syncs across devices through Supabase — or tap *Maybe later* and use the app
entirely offline on the device. Nothing is gated behind an account."

### 3. Onboarding — 0:22–0:36
**On screen:** Swipe through a few onboarding steps — name, avatar (pick an emoji +
color), grade, subjects, daily study goal. Move fast; don't type full sentences.

**VO:** "First launch is a quick 7-step setup — your name, an avatar, your subjects,
and a daily study goal. All of it is saved locally, so the app works fully offline."

### 4. Dashboard + Study timer — 0:36–1:05
**On screen:** Land on Dashboard. Point (cursor/tap) at: the level + XP bar, the
streak flame chip, the 2×2 stat grid (Study Time / Tasks / Sleep / Screen Time).
Then tap **Start Study** → the timer screen. Start the timer, let it run 2–3 seconds,
tag a subject, stop it. Show the "+XP earned / streak updated" toast.

**VO:** "The dashboard is your daily overview — level, XP, streak, and today's stats.
Hit *Start Study* to launch the focus timer. It supports a free timer and Pomodoro
mode. Finish a session and you earn XP, keep your streak alive, and unlock
achievements — every minute of study is one XP."

### 5. Gamification — 1:05–1:35
**On screen:** Go to the **Quests & Levels** screen. Show:
- the **Study Pet** at the top (custom SVG creature that evolves with your level),
- the **daily quests** with their shield crests + progress bars — complete one on camera,
- the **Duolingo-style level path** with medallion nodes,
- tap the **Daily Treasure** chest (burst animation + reward modal),
- launch **Star Catch** and catch a few falling stars for bonus XP,
- scroll the **achievement grid** and tap one badge for its detail modal.

**VO:** "This is where it gets fun. A study pet that evolves as you level up — all
hand-drawn vector art that recolors to your theme. Daily quests, a level path, a
daily treasure chest, and a quick falling-stars mini-game — all little loops that
reward showing up. There are 20 achievements to collect across four rarity tiers."

### 6. Productivity — 1:35–2:02
**On screen:** Quick tour, ~7 seconds each:
- **Goals** — SMART goal tracker, tap through the horizon tabs (Daily/Weekly/Monthly/
  Long-term), show a goal's progress buttons.
- **Tasks** — check off a task.
- **Schedule** — the weekly planner; if Google Calendar is connected, show real events
  labelled by source.
- **Wellness** — sleep + mood logging and the analytics; if on iOS with Health synced,
  show the "Today from Apple Health" card (steps / exercise / workouts).

**VO:** "Beyond studying, Focus is a full planner — SMART goals across daily to
long-term horizons, tasks, a weekly schedule that merges your device and Google
calendars, and wellness tracking for sleep and mood that can pull from Apple Health."

### 7. Settings: theming, notifications, account & sync — 2:02–2:25
**On screen:** Open **Settings** and move top to bottom through the three things worth
showing:

1. **Appearance (~10s)** — change the **theme** (e.g. Light → Midnight), then open the
   custom **color wheel** and drag to a new accent. Show the *whole app* restyling
   live — including the pet and quest crests. This is the money shot; give it room.
2. **Notifications (~5s)** — scroll to the reminders: study reminder, bedtime
   reminder, streak-at-risk alert, and the permission rows. Just toggle one.
3. **Account & Sync (~8s)** — show the signed-in email, the last-synced timestamp, and
   tap **☁️ Sync Now**. Then cut to the **same account in a browser** (web build) with
   the same data and theme — that single cut proves both cross-platform *and* sync in
   one shot.

**VO:** "Everything is themeable — five theme styles and any accent color from a custom
color wheel, and the whole app, including the artwork, recolors live. Settings also
handles your reminders — study, bedtime, and a streak-at-risk nudge. And under Account,
one tap syncs your progress to the cloud — so here's the same account, same data, same
theme, running as a website."

> **Recording tip:** have the web build already open on a second monitor / browser tab
> and logged into the same account, so the cut lands instantly instead of waiting on a
> page load and sign-in.

### 8. The Code — 2:25–2:57  ⭐ *required coding section*
**On screen:** Switch to the editor + a terminal running `npx expo start`. Walk through,
briefly, with the files open:

1. **`app/` (expo-router):** file-based routing — `app/index.tsx`, `study.tsx`,
   `game.tsx` are literally the routes. React Native + TypeScript throughout.
2. **`services/`:** the logic layer — `streaks.ts` (XP/levels/achievements),
   `quests.ts` (date-seeded daily quest selection), `sync.ts` + `supabase.ts`
   (auth + cross-device sync), `googleCalendar.ts`, `health.ts`, `notifications.ts`.
   Show one — e.g. the level math `Math.floor(totalXP / 100)` or the deterministic
   daily-quest shuffle.
3. **`components/art/`:** open `PetArt.tsx` or `GameIcons.tsx` — point out these
   creatures/crests are hand-built `react-native-svg` on a 100×100 viewBox, tinted
   from the accent via the color math in `theme/design.ts`.
4. **`theme/design.ts`:** the design system — `mix`/`lighten`/`darken`, `readableOn`,
   gradients — one source of truth, so changing the accent restyles everything.
5. Mention the graceful-degradation pattern: Supabase, Google Calendar, and Apple
   Health each **hide or no-op** when unconfigured or unsupported, so the app never
   crashes on web or in Expo Go.

**VO:** "Under the hood it's React Native and Expo with TypeScript. Routing is
file-based — each screen in the `app` folder is a route. All the game logic lives in a
clean services layer: streaks and XP, a date-seeded quest system, Supabase auth and
sync, calendar and health integrations. The artwork is hand-built SVG that recolors
from a central design system — so one accent-color change restyles the entire app.
And every integration degrades gracefully, which is how the same code runs on iOS,
Android, and the web without breaking."

### 9. Close — 2:57–3:02
**On screen:** Cut back to the freshly-themed Dashboard. Title card:
*"Focus — study, leveled up."* + optional repo / links.

**VO:** "Study, leveled up. Thanks for watching."

---

## Editing notes

- **Pace:** app sections should feel snappy — cut dead air between taps. The coding
  section can breathe slightly more but keep it under ~35 seconds.
- **Captions:** on-screen text labels for each section ("Onboarding", "Gamification",
  "The Code") help orient viewers who watch muted.
- **Zoom:** in the code section, bump the editor font size and zoom into the specific
  lines you call out — unreadable code loses the audience.
- **Music:** upbeat, low background bed; duck under the voiceover.
- **Callouts:** consider a highlight/arrow when you point at the XP bar, a quest crest,
  and the SVG art so viewers know where to look.

## Optional 15-second "shorts" cut

If you also want a vertical short: Hook (0:00) → Start a session + XP toast (0:04) →
Evolve pet / complete a quest (0:08) → live theme recolor (0:12) → title card (0:15).
