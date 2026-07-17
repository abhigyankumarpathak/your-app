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

---

## Runtime breakdown

| Section | Time | Screen |
|---------|------|--------|
| 1. Hook / title | 0:00–0:12 | App logo → Dashboard |
| 2. Onboarding (quick) | 0:12–0:28 | Onboarding carousel |
| 3. Dashboard + Study timer | 0:28–1:00 | Dashboard, Study |
| 4. Gamification | 1:00–1:35 | Game screen, quests, pet, Star Catch |
| 5. Productivity: Goals, Tasks, Schedule, Wellness | 1:35–2:05 | those screens |
| 6. Personalization + cross-platform | 2:05–2:20 | Settings, web build |
| 7. **The Code** | 2:20–2:55 | Editor |
| 8. Close | 2:55–3:00 | Dashboard / logo |

---

## Section-by-section script

### 1. Hook / Title — 0:00–0:12
**On screen:** App opens to the Dashboard hero card animating in. Overlay the title
*"Focus — a study companion for students."*

**VO:** "This is Focus — a cross-platform study app that turns getting your work done
into something that actually feels rewarding. It runs on iOS, Android, and the web."

### 2. Onboarding — 0:12–0:28
**On screen:** Swipe through a few onboarding steps — name, avatar (pick an emoji +
color), grade, subjects, daily study goal. Move fast; don't type full sentences.

**VO:** "First launch is a quick 7-step setup — your name, an avatar, your subjects,
and a daily study goal. All of it is saved locally, so the app works fully offline."

### 3. Dashboard + Study timer — 0:28–1:00
**On screen:** Land on Dashboard. Point (cursor/tap) at: the level + XP bar, the
streak flame chip, the 2×2 stat grid (Study Time / Tasks / Sleep / Screen Time).
Then tap **Start Study** → the timer screen. Start the timer, let it run 2–3 seconds,
tag a subject, stop it. Show the "+XP earned / streak updated" toast.

**VO:** "The dashboard is your daily overview — level, XP, streak, and today's stats.
Hit *Start Study* to launch the focus timer. It supports a free timer and Pomodoro
mode. Finish a session and you earn XP, keep your streak alive, and unlock
achievements — every minute of study is one XP."

### 4. Gamification — 1:00–1:35
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

### 5. Productivity — 1:35–2:05
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

### 6. Personalization + cross-platform — 2:05–2:20
**On screen:** Open **Settings**. Change the **theme** (e.g. Light → Midnight) and the
**accent color** using the custom color wheel — show the *whole app* instantly
restyling. Then a 2-second cut to the **same app running in a browser** (web build) to
prove it's cross-platform.

**VO:** "Everything is themeable — five theme styles and any accent color you want from
a custom color wheel, and the whole app — including the artwork — recolors live. And
the exact same codebase runs as a website."

### 7. The Code — 2:20–2:55  ⭐ *required coding section*
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

### 8. Close — 2:55–3:00
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
