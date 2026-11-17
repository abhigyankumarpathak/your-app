# Focus

### ▶️ [**Try Focus in your browser → focus-web-1zap.onrender.com**](https://focus-web-1zap.onrender.com/)

Nothing to download, and an account is optional: tap **"Maybe later"** to jump straight in.

**A study companion for students.** Time your study sessions, keep track of tasks and goals, look after your sleep and screen time, and earn XP, streaks and badges along the way.

Focus runs on iPhone, Android and the web. You can use it without an account. Creating one just lets your progress follow you across devices.

> **A note on AI use**
>
> This app was built by hand. The overwhelming majority of the code, architecture, and product decisions here are my own.
>
> AI assistance was used in a limited, supporting role: refining visual design details, and working through a handful of errors and edge cases that were difficult or impractical to resolve on my own. Everything produced that way was reviewed and integrated by me.
>
> I'm disclosing this because I'd rather be upfront about where the tooling helped than leave it unsaid.

---

## What you can do

**📚 Study**
- A study timer with an optional **Pomodoro** mode (25 min focus, 5 min break, a longer break every 4 rounds). It keeps counting even if you lock your phone.
- Log sessions you forgot to time, add notes, and edit or delete past sessions.
- See your history grouped by day.

**✅ Tasks and goals**
- Tasks with priorities and due dates, plus a reminder on the morning they're due.
- **SMART goals** (Specific, Measurable, Achievable, Relevant, Time-bound) for today, this week, this month or the long term, with tasks you can link to them.

**📅 Schedule**
- A weekly plan for your activities, shown next to the events from your phone's calendar or Google Calendar.

**❤️ Wellness**
- Log your sleep, mood and screen time, and see your averages.
- On iPhone, you can fill in sleep, steps, exercise minutes and workouts from **Apple Health** with one tap.

**🎮 Make it a game**
- Earn **XP** for studying and level up from *Rookie* to *Infinite*.
- Keep a daily **streak**, complete three new **daily quests** each day, and collect 20 **badges**.
- Open a daily treasure chest, play the *Star Catch* mini-game, and watch your study pet grow as you level up.

**🎨 Make it yours**
- Five themes (Light, Dark, Warm, Midnight, Mint), any accent colour you like, three text sizes, and an emoji or photo avatar.
- Study, bedtime and "don't break your streak" reminders.

---

## Getting started

1. Open Focus and **create an account**, **sign in**, or tap **"Maybe later"** to use it on this device only.
2. Answer a few quick setup questions: your name, grade, subjects and daily study goal.
3. Choose which permissions to allow (see below). Every one is optional, and Focus works without any of them.
4. Start your first study session from the **Study** screen.

You can change anything later in **Settings**.

---

## Permissions, and why Focus asks

Focus only asks for something when a feature needs it. If you say no, that feature simply falls back to manual entry.

| Permission | What it's used for |
| --- | --- |
| **Calendar** | Reads your events to show them on the Schedule screen. Focus never changes your calendar. |
| **Apple Health** (iPhone) | Reads sleep, steps, exercise minutes and workouts when you tap *Sync from Apple Health*. Focus never writes to Health. |
| **Photos** | Lets you pick a profile picture. Only the photo you choose is used. |
| **Notifications** | Sends the reminders you turn on in Settings. |

Focus doesn't use your camera, microphone, contacts or location.

---

## Your privacy and your data

- **No ads, no tracking, no selling data.** Focus has no advertising or analytics, and your data is never shared or sold.
- **Stored on your device.** Everything you enter (sessions, tasks, goals, wellness logs, your profile and settings) is saved on your device and works offline.
- **Synced only if you sign in.** With an account, the same data is stored securely in the cloud so it can sync between your devices. Only your account can read it.
- **Health data.** Apple Health is only read when you ask. If you save a wellness log that includes Health numbers, they're stored with that log like anything you type, and synced if you're signed in. They are never used for advertising or shared.
- **Calendar data.** Calendar events are only shown on screen. They're never saved or uploaded.

You can read this summary any time in the app under **Settings › Privacy**.

### Deleting your data

- **Erase this device:** go to **Settings › Reset App**. If you're signed in, your cloud copy is reset too.
- **Delete your account:** go to **Settings › Account & Sync › Delete Account**. This permanently deletes your account and everything stored in the cloud, then erases this device. It can't be undone.

---

## Using more than one device

Sign in with the same account on each device. Focus syncs automatically when you open the app, while you use it, and when you leave it, so there's nothing to press. If you ever need to force it, **Settings › Account & Sync** has **Push** (send this device's data up) and **Pull** (replace this device's data with the cloud copy).

Using Focus in a web browser? Apple Health, your phone's calendar and scheduled reminders need the phone app. Everything else works the same.

---

## Help

**My streak reset.** A streak counts consecutive days with at least one study session. Missing a full day starts it over, but your longest streak is always kept.

**I'm not getting reminders.** Check that notifications are allowed for Focus in your phone's settings, and that the reminder is switched on under **Settings › Notifications & Permissions**. Reminders aren't available in the web version.

**Apple Health isn't syncing.** Open the Health app, tap your profile picture, then **Apps › Focus**, and turn on the data you want to share.

**I signed in on a new phone and my progress isn't there.** Make sure you used the same email address, then go to **Settings › Account & Sync** and tap **Pull**.

Found a bug or have an idea? [Open an issue](https://github.com/abhigyankumarpathak/your-app/issues) on GitHub.

---

## Run it yourself

You'll need [Node.js](https://nodejs.org) 20 or newer.

```bash
git clone https://github.com/abhigyankumarpathak/your-app.git
cd your-app
npm install
cp .env.example .env     # optional: add Supabase keys to turn on accounts and sync
npm run web              # opens Focus in your browser
```

To run it on your phone instead, install the free **Expo Go** app, run `npm run go`, and scan the QR code. Without Supabase keys, everything works except accounts and sync.

See [DEVELOPMENT.md](DEVELOPMENT.md) for the full setup, including building, deploying and Google Calendar, and [FEATURES.md](FEATURES.md) for a detailed reference of how everything works.

---

## License

Focus is open source under the [MIT License](LICENSE).
