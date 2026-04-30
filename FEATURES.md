# Focus App — Feature Reference

*Last updated: 2026-04-29*

---

## Screens (Drawer Navigation)

| Screen | Route | Purpose |
|--------|-------|---------|
| Dashboard | `/` | Daily overview, streak, XP, achievements |
| Study | `/study` | Focus timer and session history |
| Goals | `/goals` | SMART goal tracker |
| Tasks | `/tasks` | Task management |
| Schedule | `/schedule` | Weekly planner |
| Wellness | `/wellness` | Sleep and mood logging |
| Screen Time | `/screentime` | Manual screen time tracking |
| Quests & Levels | `/game` | Duolingo-style level path, daily quests, achievement grid |
| Settings | `/settings` | Appearance and notification preferences |

---

## Onboarding

6-step animated carousel shown on first launch. Collects a user profile saved to `AsyncStorage`.

- **Step 0** — Name input
- **Step 1** — Grade (6th–College) and optional school name
- **Step 2** — Subject selection (Math, Science, English, History, CS/Coding, Art, Music, Languages, PE/Sports, Other)
- **Step 3** — Focus areas (Academic Excellence, Competitions & Awards, Health & Wellness, Time Management, Personal Growth, Extracurriculars)
- **Step 4** — Permissions: Calendar, Health App, Screen Time, Notifications
- **Step 5** — Daily study goal (1h / 1.5h / 2h / 3h / 4h / 5+h) and profile summary

Onboarding can be reset via `RESET_APP` device event (used by Settings).

---

## Dashboard

- Time-of-day greeting (morning / afternoon / evening)
- Today's date display
- **Streak + XP banner** — shows current streak, level, XP, and progress bar to next level. Tapping expands the achievements shelf.
- **Achievements shelf** — horizontal scrollable row showing all 7 achievements (earned vs locked)
- **Stat cards** — Study Time, Tasks Pending, Sleep Last Night, Screen Time. Each card is tappable and navigates to the relevant screen.
- Quick tips section

---

## Study Timer

- **Free timer** — start, pause, resume, stop. Displays `HH:MM:SS`.
- **Pomodoro mode** — 25-min work / 5-min break / 15-min long break cycles
- Subject field for tagging sessions
- Animated pulse while running (respects animation toggle)
- Haptic feedback on start/stop (via `expo-haptics`)
- Sessions saved to `AsyncStorage` with date, duration, subject
- **Session history** grouped by date (Today / Yesterday / date string)
- After saving a session: XP awarded, streak updated, achievements checked

---

## Gamification

Powered by `services/streaks.ts` and `services/quests.ts`.

### Streaks
- Increments when a session is logged on a new calendar day
- Resets to 1 if a day is skipped
- Tracks current streak and all-time longest streak

### XP & Levels
- 1 XP per minute of study time per session
- Bonus XP awarded on quest completion (see Daily Quests)
- Level = `floor(totalXP / 100)` — so every 100 XP is a new level
- XP progress bar on dashboard shows distance to next level
- Level-up toast shown when a session or quest pushes you to a new level

### Level Titles

| Level | Title |
|-------|-------|
| 0 | Rookie |
| 1 | Learner |
| 2 | Scholar |
| 3 | Achiever |
| 4 | Expert |
| 5 | Master |
| 6 | Champion |
| 7 | Genius |
| 8 | Legend |
| 9+ | Prodigy |

### Daily Quests

Powered by `services/quests.ts`. 3 quests are selected each day from a pool of 10 using a date-seeded deterministic shuffle (same quests all day, fresh set each morning).

Completing a quest awards bonus XP instantly. Each quest can only be completed once per day.

| ID | Icon | Title | Description | Bonus XP |
|----|------|-------|-------------|----------|
| `study_starter` | 🎯 | Study Starter | Log 1 session today | +10 |
| `double_session` | 🔁 | Double Down | Log 2 sessions today | +20 |
| `triple_session` | 🎰 | Triple Threat | Log 3 sessions today | +35 |
| `subject_hopper` | 🌀 | Subject Hopper | Study 2 different subjects today | +25 |
| `multi_scholar` | 🌈 | Multi-Scholar | Study 3 different subjects today | +40 |
| `focus_block` | ⚡ | Focus Block | Study 30+ min in one session | +30 |
| `deep_focus` | 🧠 | Deep Focus | Study 1+ hour in one session | +50 |
| `hour_hero` | 🦸 | Hour Hero | Study 1+ hour total today | +40 |
| `note_taker` | 📝 | Note Taker | Add notes to a session | +15 |
| `goal_crusher` | 🏅 | Goal Crusher | Hit your daily study goal | +50 |

Quest state stored in `focusDailyQuests` key (`{ date, questIds, completedIds }`).

Dashboard shows a collapsible **Daily Quests** card (between achievements shelf and stat cards) with per-quest progress bars, XP badges, and strikethrough on completed quests.

Session save toast now shows total XP (session + quest bonus), badge count, quest count, and level-up message when applicable.

### Achievements (7 total)

| ID | Icon | Label | Condition |
|----|------|-------|-----------|
| `first_session` | 🎓 | First Session | Complete 1 session |
| `streak_3` | 🔥 | 3-Day Streak | 3 consecutive study days |
| `streak_7` | ⚡ | 7-Day Streak | 7 consecutive study days |
| `marathon` | 📚 | Marathon | 3+ hours studied in one day |
| `century` | 🏆 | Century | 100 total sessions |
| `well_rounded` | 🌈 | Well-Rounded | 5+ distinct subjects studied |
| `perfect_day` | ✅ | Perfect Day | Hit daily study goal |

---

## SMART Goals

### Time Horizons (tabs)
- Daily ☀️ — habits and tasks for today
- Weekly 📅 — goals to finish this week
- Monthly 🗓️ — monthly milestones
- Long-term 🏆 — competitions, projects, big ambitions

### Goal Categories
Academic, Competition, Wellness, Project, Extracurricular, Personal

### Goal Structure (SMART framework)
Each goal captures: title, category, time horizon, and five SMART fields:
- **S**pecific — what exactly to achieve
- **M**easurable — how to track progress
- **A**chievable — is it realistic?
- **R**elevant — why it matters
- **T**ime-bound — deadline or timeframe

Creation uses a guided step-by-step modal with example answers for each field.

### Goal Features
- Progress tracking: 0% / 25% / 50% / 75% / 100% tap buttons
- Toggle complete / incomplete
- Delete with confirmation
- Goal-task linking: tasks can be linked to a goal; linked tasks are shown on the goal detail view
- **Built-in daily study hours goal card** on the Daily tab — shows today's progress vs the study goal set in onboarding
- Stats header shows X/Y goals achieved per time horizon

---

## Tasks

- Create, complete, and delete tasks
- Tasks can be linked to a goal (`goalId`)
- Color-coded with theme accent
- Separate sections for pending and completed
- Task due dates trigger scheduled notifications

---

## Schedule

- Weekly view organized by day
- Color-coded activities with time tracking

---

## Wellness

- **Sleep logging** — bedtime, wake time, auto-calculated duration
- **Mood tracking** — 5 levels (😴 😑 😐 🙂 😄)
- Analytics: average sleep hours, average screen time, total logs
- Recent activity list with date and mood indicators

---

## Screen Time

- Manual daily screen time logging (in hours)
- Displayed on dashboard stat card

---

## Notifications

Powered by `services/notifications.ts` using `expo-notifications`.

| Type | Trigger | Message |
|------|---------|---------|
| Study reminder | Daily at user-set time | "Time to study!" |
| Bedtime reminder | Daily at user-set time | "Wind down and log your sleep" |
| Streak-at-risk | Daily at 8:00 PM | "Don't break your streak!" |
| Task due alert | 8:00 AM on task due date | Task title |

Android uses a notification channel named "Focus Reminders" with MAX importance and vibration.

---

## Theme System

Configured in Settings, persisted via `ThemeContext`.

| Setting | Options |
|---------|---------|
| Theme style | Light, Dark, Warm |
| Accent color | Blue, Green, Purple, Orange, Pink, Red, Indigo, Cyan (8 options) |
| Text size | Small, Medium, Large |
| Animations | On / Off |

---

## Platform Support

- iOS 13.0+ and Android 8.0+
- Responsive design (scales to screen size)
- Platform-specific notification channel (Android)
- Permission flows: Calendar, Health (opens system settings), Screen Time (opens system settings), Notifications

---

## Data Storage

All data is stored locally via `AsyncStorage`. No cloud sync.

| Key | Contents |
|-----|----------|
| `focusUserProfile` | Name, grade, school, subjects, focus areas, study goal |
| `focusOnboardingComplete` | Boolean flag |
| `focusSessions` | Array of study sessions |
| `focusTasks` | Array of tasks |
| `focusWellness` | Array of wellness logs |
| `focusGoals` | Array of SMART goals |
| `focusStreak` | Current/longest streak and last date |
| `focusXP` | Total XP integer |
| `focusAchievements` | Array of earned achievement IDs |
| `focusDailyQuests` | `{ date, questIds[], completedIds[] }` — today's quest selection and completion |
| `focusStudyReminderId` | Scheduled notification ID |
| `focusBedtimeReminderId` | Scheduled notification ID |
| `focusStreakReminderId` | Scheduled notification ID |
| `focusTaskNotifMap` | Map of taskId → notification ID |
