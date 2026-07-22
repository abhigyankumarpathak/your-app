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

// Signature of the blob as of the last successful push. Lets the background
// auto-push skip the network round-trip when nothing has actually changed.
let lastPushedSignature: string | null = null;

function signature(blob: ProgressBlob): string {
  return JSON.stringify(blob, Object.keys(blob).sort());
}

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

export async function pushLocalToCloud(
  opts: { skipIfUnchanged?: boolean } = {}
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const client = getSupabase();
  if (!client) return { ok: false, error: 'Supabase is not configured' };
  const { data: userData } = await client.auth.getUser();
  const user = userData.user;
  if (!user) return { ok: false, error: 'Not signed in' };

  const data = await readLocalBlob();
  // Background pushes bail out when the device hasn't changed anything since
  // the last one. Manual "Sync Now" always goes through.
  const sig = signature(data);
  if (opts.skipIfUnchanged && sig === lastPushedSignature) return { ok: true, skipped: true };
  const updatedAt = new Date().toISOString();

  const { error } = await client
    .from('progress')
    .upsert({ user_id: user.id, data, updated_at: updatedAt }, { onConflict: 'user_id' });

  if (error) return { ok: false, error: error.message };

  lastPushedSignature = sig;
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

  const blob = (data.data as ProgressBlob) ?? {};
  await writeLocalBlob(blob);
  // Local now matches the cloud, so the next auto-push has nothing to send.
  lastPushedSignature = signature(await readLocalBlob());
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

export type SyncDirection = 'pulled' | 'pushed' | 'none';

// The background reconcile: runs on launch, on sign-in, when the app comes
// back to the foreground, on a timer, and when it goes to the background.
// Decides direction by comparing the cloud row's timestamp against the last
// one this device synced — a newer cloud row means another device wrote after
// us, so we take theirs; otherwise this device is the source of truth.
export async function autoSync(): Promise<{ ok: boolean; direction: SyncDirection; error?: string }> {
  const client = getSupabase();
  if (!client) return { ok: false, direction: 'none', error: 'Supabase is not configured' };
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) return { ok: false, direction: 'none', error: 'Not signed in' };

  const { data, error } = await client
    .from('progress')
    .select('updated_at')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (error) return { ok: false, direction: 'none', error: error.message };

  // No cloud row yet — this device seeds it.
  if (!data) {
    const push = await pushLocalToCloud();
    return push.ok ? { ok: true, direction: 'pushed' } : { ok: false, direction: 'none', error: push.error };
  }

  const localSyncedAt = await AsyncStorage.getItem(LAST_SYNCED_AT_KEY);
  const cloudNewer =
    !localSyncedAt ||
    (data.updated_at ? new Date(data.updated_at).getTime() > new Date(localSyncedAt).getTime() : false);

  if (cloudNewer) {
    const pull = await pullCloudToLocal();
    if (!pull.ok) return { ok: false, direction: 'none', error: pull.error };
    return { ok: true, direction: pull.hasData ? 'pulled' : 'none' };
  }

  const push = await pushLocalToCloud({ skipIfUnchanged: true });
  if (!push.ok) return { ok: false, direction: 'none', error: push.error };
  return { ok: true, direction: push.skipped ? 'none' : 'pushed' };
}

// Sign-out has to drop the sync watermark: it belongs to the account that just
// left. Leaving it behind would let the next account's `autoSync` read a
// timestamp newer than its own cloud row and push this device's data over it.
export async function clearSyncState(): Promise<void> {
  lastPushedSignature = null;
  await AsyncStorage.removeItem(LAST_SYNCED_AT_KEY);
}

export async function getLastSyncedAt(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_SYNCED_AT_KEY);
}
