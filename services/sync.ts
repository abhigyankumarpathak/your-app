import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase } from './supabase';

// Keys that belong to the user (synced across devices).
// Device-specific keys (notification IDs, permission cache) are intentionally excluded.
export const SYNCED_KEYS = [
  'focusUserProfile',
  'focusSessions',
  'focusTasks',
  'focusActivities',
  'focusWellness',
  'focusGoals',
  'focusThemeColor',
  'focusCustomColor',
  'focusThemePreset',
  'focusFontSize',
  'focusEnableAnimations',
  'focusAvatar',
  'focusAvatarBg',
  'focusAvatarImage',
  'focusStreak',
  'focusXP',
  'focusAchievements',
  'focusPomodoroEnabled',
  'focusDailyTreasure',
  'focusDailyQuests',
  'focusOnboardingComplete',
] as const;

const LAST_SYNCED_AT_KEY = 'focusLastSyncedAt';

type ProgressBlob = Record<string, string>;

async function readLocalBlob(): Promise<ProgressBlob> {
  const entries = await AsyncStorage.multiGet(SYNCED_KEYS as unknown as string[]);
  const blob: ProgressBlob = {};
  for (const [key, value] of entries) {
    if (value !== null) blob[key] = value;
  }
  return blob;
}

async function writeLocalBlob(blob: ProgressBlob): Promise<void> {
  const pairs: [string, string][] = [];
  const toRemove: string[] = [];
  for (const key of SYNCED_KEYS) {
    const value = blob[key];
    if (typeof value === 'string') pairs.push([key, value]);
    else toRemove.push(key);
  }
  if (pairs.length) await AsyncStorage.multiSet(pairs);
  if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
}

export async function pushLocalToCloud(): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabase();
  if (!client) return { ok: false, error: 'Supabase is not configured' };
  const { data: userData } = await client.auth.getUser();
  const user = userData.user;
  if (!user) return { ok: false, error: 'Not signed in' };

  const data = await readLocalBlob();
  const updatedAt = new Date().toISOString();

  const { error } = await client
    .from('progress')
    .upsert({ user_id: user.id, data, updated_at: updatedAt }, { onConflict: 'user_id' });

  if (error) return { ok: false, error: error.message };

  await AsyncStorage.setItem(LAST_SYNCED_AT_KEY, updatedAt);
  return { ok: true };
}

export async function pullCloudToLocal(): Promise<{ ok: boolean; hasData: boolean; error?: string }> {
  const client = getSupabase();
  if (!client) return { ok: false, hasData: false, error: 'Supabase is not configured' };
  const { data: userData } = await client.auth.getUser();
  const user = userData.user;
  if (!user) return { ok: false, hasData: false, error: 'Not signed in' };

  const { data, error } = await client
    .from('progress')
    .select('data, updated_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return { ok: false, hasData: false, error: error.message };
  if (!data) return { ok: true, hasData: false };

  await writeLocalBlob((data.data as ProgressBlob) ?? {});
  await AsyncStorage.setItem(LAST_SYNCED_AT_KEY, data.updated_at ?? new Date().toISOString());
  return { ok: true, hasData: true };
}

// Called once when a user signs in. If the cloud row exists, pull it (other device wins);
// if it doesn't, push the device's existing local progress up so nothing is lost.
export async function onSignedInSync(): Promise<{ ok: boolean; direction: 'pulled' | 'pushed' | 'none'; error?: string }> {
  if (!getSupabase()) return { ok: false, direction: 'none', error: 'Supabase is not configured' };
  const pull = await pullCloudToLocal();
  if (!pull.ok) return { ok: false, direction: 'none', error: pull.error };
  if (pull.hasData) return { ok: true, direction: 'pulled' };
  const push = await pushLocalToCloud();
  if (!push.ok) return { ok: false, direction: 'none', error: push.error };
  return { ok: true, direction: 'pushed' };
}

export async function getLastSyncedAt(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_SYNCED_AT_KEY);
}
