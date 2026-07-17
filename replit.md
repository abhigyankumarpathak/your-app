# Focus App

A productivity-focused React Native / Expo app with web support. Built with Expo Router, Supabase backend, and React Navigation (drawer layout).

## Features

- Study timer and session history
- Goals, tasks, and weekly schedule
- Wellness logging (sleep, mood)
- Gamification (quests, levels, achievements, XP/streaks)
- Dashboard with daily overview
- Auth via Supabase (email/password); optional guest mode
- Google Calendar integration (optional, web only)
- Apple Health integration (iOS native builds only)

## Stack

- **Framework**: Expo (SDK 54) with Expo Router (file-based routing)
- **Platform targets**: Web (primary on Replit), iOS, Android
- **Backend**: Supabase (auth + database)
- **Navigation**: Expo Router drawer + tabs
- **UI**: React Native + react-native-web

## Running on Replit

**Dev server (web preview):**
```bash
npm run replit
# runs: expo start --web --port 5000
```

The dev server workflow `Dev server` is pre-configured and starts automatically.

**Environment variables required:**
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase publishable/anon key

Both are set in the shared environment.

**Optional env vars (Google Calendar):**
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB`
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS`
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID`

## Notes

- `package.json` has an `overrides` entry for `shell-quote` to satisfy Replit's package security firewall (a transitive dependency was pinned to a blocked version).
- Native features (Apple Health) only work in native builds (iOS), not the web preview.
- For phone testing, use `npm run go` (Expo Go) or `npm run go:tunnel` (tunneled, for different networks).

## User preferences

- Do not change the app code or structure unless explicitly asked.
