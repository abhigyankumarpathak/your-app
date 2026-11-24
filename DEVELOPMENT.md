# Focus — Developer Guide

How to run, build, and deploy Focus from source. For what the app does, see [README.md](README.md); for a detailed feature reference, see [FEATURES.md](FEATURES.md).

## Get started

```bash
npm install
npx expo start
```

Focus is an [Expo](https://expo.dev) app using [file-based routing](https://docs.expo.dev/router/introduction) — screens live in the `app/` directory.

## Running on Windows / Linux / any non-Mac (Expo Go)

Collaborators **don't need a Mac, Xcode, or the iOS simulator.** They run the app
on their own phone (iOS or Android) through the free **Expo Go** app, while the
project owner can keep building the native dev client on the Mac simulator.

### One-time setup (each collaborator)

1. Install [Node.js LTS](https://nodejs.org) and the **Expo Go** app from the
   App Store / Google Play on their phone.
2. Clone the repo and install dependencies:
   ```bash
   git clone <repo-url>
   cd your-app
   npm install
   ```
3. Create the env file (the real `.env` is never committed):
   ```bash
   cp .env.example .env      # Windows: copy .env.example .env
   ```
   Then paste in the two `EXPO_PUBLIC_SUPABASE_*` values. Ask the project owner
   to send you theirs so everyone shares the same backend.

### Every time — start the server and scan the QR

```bash
npm run go            # phone + computer on the SAME Wi-Fi
# or, if the QR won't connect (different networks, locked-down/campus Wi-Fi):
npm run go:tunnel     # routes through Expo's servers; slower but works anywhere
```

Open **Expo Go** on the phone and scan the QR code in the terminal
(iPhone: use the Camera app; Android: scan from inside Expo Go). The app loads
over the air — no build step.

> **What works in Expo Go:** everything except the iOS-only **Apple Health**
> integration (steps/sleep/workouts), which needs the native build. The app
> detects this and simply skips those features in Expo Go, so nothing crashes —
> Android phones wouldn't have Apple Health anyway. Local notifications work but
> may print a harmless "not supported in Expo Go" warning.

### Project owner (Mac) — unchanged

Keep running the full native dev client on the iOS simulator:

```bash
npm run ios
```

Both workflows can run against the same Supabase project at the same time.

## Running as a website (web build)

The app runs in a browser as well as on phones:

```bash
npm run web           # dev server with hot reload (http://localhost:8081)
npm run build:web     # static export -> ./dist
npm run serve:web     # serve the built ./dist locally
```

`npm run build:web` produces a plain static site (`app.json` sets
`web.output: "static"`), so every route is prerendered to its own `.html` and
can be hosted on any static host — no Node server required.

### What works on the web

Everything that is pure app logic: the study timer and Pomodoro, tasks, goals,
SMART goals, quests/XP/levels, streaks, the star-catch game, screen-time logging,
wellness logging, themes, avatars, photo upload, and Supabase login + sync.
Data persists to `localStorage` via AsyncStorage.

| Feature | Web | Why |
| --- | --- | --- |
| Apple Health (steps/sleep/workouts) | ❌ | HealthKit is an iOS native API |
| Device calendar | ❌ | expo-calendar reads the OS calendar; browsers have none |
| **Google Calendar** | ✅ | Works on web *and* native — see below |
| Scheduled reminders | ❌ | Local notifications need a native scheduler |
| Automatic screen time | ❌ | OS-restricted on every platform; log it manually |

Health and screen-time screens still work on the web — they fall back to manual
entry rather than disappearing.

## Deploying to Render (public website)

[`render.yaml`](render.yaml) is a Render Blueprint that publishes the web app as a free static site.

1. In the [Render Dashboard](https://dashboard.render.com), choose **New → Blueprint** and connect this repo. Pick the branch that contains `render.yaml`.
2. When prompted, enter `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. These are the same values as your `.env`.
3. Click **Apply**. Render runs `npm ci && npm run build:web` and serves `dist/`.
4. Once it's live, copy the `https://….onrender.com` URL and:
   - In Supabase › **Authentication → URL Configuration**, set **Site URL** to it so email-confirmation links open the website.
   - If you use Google Calendar, add the URL to the web OAuth client's **Authorized JavaScript origins** and set `EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB` in Render.

`EXPO_PUBLIC_*` values are baked in at build time, so redeploy after changing any of them.

## Deploying to Replit

`.replit` is checked in and configured, so importing this repo into Replit works
with no extra setup:

- **Run** starts the dev server on port 5000 (Replit forwards it to port 80).
- **Deploy** runs `npm run build:web` and serves `dist/` as a static deployment.

Because `.env` is gitignored, add your env vars as **Replit Secrets** (Tools →
Secrets) instead — the same `EXPO_PUBLIC_*` names as below.

> `EXPO_PUBLIC_*` vars are **inlined into the bundle at build time**, not read at
> runtime. Metro caches the transform that does the inlining, so a stale cache
> can bake in an old (or empty) value even after you change a Secret. That's why
> `build:web` runs `expo export --clear`. After changing any Secret, re-deploy —
> restarting the app alone won't pick it up.

## Google Calendar (optional)

Adds a **Connect Google Calendar** button on the Schedule screen and a toggle in
Settings → Notifications. This is the only way to show real calendar events on
the web, and on iOS/Android it works alongside the device calendar as a second
source. Access is **read-only** (`calendar.readonly`).

Leave the env vars unset and the feature hides itself — nothing else changes.

### 1. Create the OAuth client(s)

In the [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
enable the **Google Calendar API**, then create credentials for the platforms you
ship:

- **Web application** — add your origins to *Authorized JavaScript origins*
  (e.g. `http://localhost:8081` and `https://<your-repl>.replit.dev`).
- **iOS** — bundle ID `com.amitpathak.focus`.
- **Android** — package `com.amitpathak.focus` + your signing SHA-1.

### 2. Add env vars

```
EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=xxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=yyy.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=zzz.apps.googleusercontent.com
```

Only the platform you actually run needs a value.

### 3. Native only — register the redirect scheme

**Skip this if you only run on the web** — the web flow uses a Google Identity
Services popup and needs no scheme.

iOS/Android use a PKCE redirect back into the app, which needs the *reversed*
client ID registered as a URL scheme. Reverse it by dropping
`.apps.googleusercontent.com` and prefixing `com.googleusercontent.apps.`:

```
client ID : 12345-abcdef.apps.googleusercontent.com
scheme    : com.googleusercontent.apps.12345-abcdef
```

Add it to `app.json` under `expo.ios.infoPlist` (alongside the existing
`NS*UsageDescription` keys):

```json
"CFBundleURLTypes": [
  { "CFBundleURLSchemes": ["com.googleusercontent.apps.12345-abcdef"] }
]
```

For Android, add the same scheme under `expo.android.intentFilters`. Then
rebuild the native app — `app.json` changes don't hot-reload:

```bash
npx expo run:ios      # or: npx expo run:android
```

## Cross-device sync (Supabase)

Login and cross-device progress sync are powered by [Supabase](https://supabase.com). The app works fine without it — sign-in just stays disabled until you wire it up.

> **Shipping to the public?** Accounts must be deletable from inside the app (App Store guideline 5.1.1(v)). That needs the `delete_user` function in step 3 — don't skip it.

### 1. Create a Supabase project

Sign in at [supabase.com](https://supabase.com), create a new project, and grab two values from **Project Settings → API**:

- Project URL
- `anon` public key

### 2. Add env vars

Create a `.env` file in the project root (do **not** commit it):

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Expo loads any var prefixed with `EXPO_PUBLIC_` into the JS bundle. Restart `npx expo start` after editing `.env`.

### 3. Create the progress table

In the Supabase SQL editor, run:

```sql
create table if not exists public.progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

create policy "Users read their own progress"
  on public.progress for select
  using (auth.uid() = user_id);

create policy "Users insert their own progress"
  on public.progress for insert
  with check (auth.uid() = user_id);

create policy "Users update their own progress"
  on public.progress for update
  using (auth.uid() = user_id);

-- Lets a signed-in user delete their own account from Settings › Account & Sync.
-- Required by Apple (guideline 5.1.1(v)) for any app that offers sign-up.
-- Deleting the auth user cascades to their progress row.
create or replace function public.delete_user()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_user() from public, anon;
grant execute on function public.delete_user() to authenticated;
```

> Already set up the table before? Run just the `delete_user` part — without it, **Delete Account** in Settings shows an error.

### 4. Set up the password-reset email

"Forgot password?" in the app emails a 6-digit code. In **Authentication → Emails → Reset Password**, make sure the message includes `{{ .Token }}`, for example:

```html
<h2>Reset your Focus password</h2>
<p>Your code is:</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:4px">{{ .Token }}</p>
<p>Open Focus, enter this code and choose a new password. The code expires in 1 hour.</p>
```

Also check **Authentication → Sign In / Providers → Email → Email OTP Length** is **6**, since the app's code box accepts 6 digits.

### 5. (Optional) Disable email confirmations during development

In **Authentication → Providers → Email**, turn off "Confirm email" if you want sign-up to log you in immediately. **Re-enable it before shipping.**

### How sync works

- The app persists progress to `AsyncStorage` exactly as before, so it always works offline.
- All synced keys (profile, sessions, tasks, goals, wellness, theme, avatar, streak, XP, achievements, quests, onboarding) are bundled into one JSON document per user.
- The first time you sign in on a device, the cloud row is pulled if it exists; otherwise the device's local progress is uploaded.
- Sync is automatic (on launch, on foreground, every 60 s, and on background). **Push** / **Pull** in Settings force it manually. Signing out also pushes first so nothing is lost.
- Conflict resolution is last-write-wins on the whole blob — fine for a single-user app on a handful of devices, easy to upgrade to per-table sync later.
