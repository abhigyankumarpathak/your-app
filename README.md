# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Cross-device sync (Supabase)

Login and cross-device progress sync are powered by [Supabase](https://supabase.com). The app works fine without it — sign-in just stays disabled until you wire it up.

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
```

### 4. (Optional) Disable email confirmations during development

In **Authentication → Providers → Email**, turn off "Confirm email" if you want sign-up to log you in immediately. Re-enable it before shipping.

### How sync works

- The app persists progress to `AsyncStorage` exactly as before, so it always works offline.
- All synced keys (profile, sessions, tasks, goals, wellness, theme, avatar, streak, XP, achievements, quests, onboarding) are bundled into one JSON document per user.
- The first time you sign in on a device, the cloud row is pulled if it exists; otherwise the device's local progress is uploaded.
- "☁️ Sync Now" in Settings pushes the current local state on demand. Signing out also pushes first so nothing is lost.
- Conflict resolution is last-write-wins on the whole blob — fine for a single-user app on a handful of devices, easy to upgrade to per-table sync later.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
# your-app
# your-app
