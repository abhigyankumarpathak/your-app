import type { Session, User } from '@supabase/supabase-js';
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
import { getSupabase } from '../services/supabase';
import { autoSync, clearSyncState, onSignedInSync, pullCloudToLocal, pushLocalToCloud } from '../services/sync';

/** Fired after a successful cloud pull so contexts that cache AsyncStorage
 *  values (theme, profile, …) know to reload themselves. */
export const CLOUD_PULLED_EVENT = 'CLOUD_PULLED';

/** Fired after any successful sync in either direction, so screens showing
 *  "last synced …" can refresh the timestamp. */
export const CLOUD_SYNCED_EVENT = 'CLOUD_SYNCED';

/** How often to push local changes up while the app is in the foreground.
 *  Pushes that find nothing changed cost no network. */
const AUTO_PUSH_INTERVAL_MS = 60_000;

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  // `error` means auth itself failed. `warning` means auth succeeded but a
  // follow-up step (the initial sync) didn't — the caller should proceed.
  signIn: (email: string, password: string) => Promise<{ error?: string; warning?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string; warning?: string; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<{ ok: boolean; error?: string }>;
  pullNow: () => Promise<{ ok: boolean; hasData: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = getSupabase();
    if (!client) {
      setLoading(false);
      return;
    }

    let mounted = true;

    // Mirror whatever the SDK reports. Don't proactively clear sessions —
    // the SDK fires SIGNED_OUT itself if a refresh genuinely fails, and any
    // "Invalid Refresh Token" message in dev is non-fatal noise from that
    // recovery path.
    client.auth.getSession()
      .then(({ data }) => {
        if (mounted) setSession(data.session);
      })
      .catch(() => {
        if (mounted) setSession(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const { data: sub } = client.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) setSession(newSession);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Everything below drives sync without the user touching a button:
  // reconcile whenever the app is opened or foregrounded, push on a timer and
  // when it goes to the background.
  const userId = session?.user?.id ?? null;

  const runAutoSync = useRef(async () => {});
  runAutoSync.current = async () => {
    if (!userId) return;
    const result = await autoSync().catch((e) => ({ ok: false, direction: 'none' as const, error: String(e) }));
    if (!result.ok) return;
    if (result.direction === 'pulled') DeviceEventEmitter.emit(CLOUD_PULLED_EVENT);
    if (result.direction !== 'none') DeviceEventEmitter.emit(CLOUD_SYNCED_EVENT);
  };

  useEffect(() => {
    if (!userId) return;

    // 1. On launch / sign-in, and whenever the session changes accounts.
    runAutoSync.current();

    // 2. Coming back from the background — another device may have written.
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') runAutoSync.current();
      // Leaving the app is the last safe moment to save this device's work.
      else pushLocalToCloud({ skipIfUnchanged: true }).catch(() => undefined);
    });

    // 3. Steady drip while the app is open, so a crash or force-quit loses
    //    at most a minute of progress.
    const timer = setInterval(() => {
      pushLocalToCloud({ skipIfUnchanged: true })
        .then((r) => {
          if (r.ok && !r.skipped) DeviceEventEmitter.emit(CLOUD_SYNCED_EVENT);
        })
        .catch(() => undefined);
    }, AUTO_PUSH_INTERVAL_MS);

    return () => {
      appSub.remove();
      clearInterval(timer);
    };
  }, [userId]);

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    const client = getSupabase();
    if (!client) return { error: 'Sign-in is not configured yet. Add Supabase keys to enable it.' };
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { error: error.message };
    const sync = await onSignedInSync();
    // A sign-in that pulled has rewritten AsyncStorage under the running
    // contexts — tell them to re-read before the app renders.
    if (sync.ok && sync.direction === 'pulled') DeviceEventEmitter.emit(CLOUD_PULLED_EVENT);
    if (sync.ok) DeviceEventEmitter.emit(CLOUD_SYNCED_EVENT);
    if (!sync.ok && sync.error) return { warning: `Signed in, but sync failed: ${sync.error}` };
    return {};
  };

  const signUp: AuthContextValue['signUp'] = async (email, password) => {
    const client = getSupabase();
    if (!client) return { error: 'Sign-up is not configured yet. Add Supabase keys to enable it.' };
    const { data, error } = await client.auth.signUp({ email: email.trim(), password });
    if (error) return { error: error.message };
    // If email confirmations are enabled in Supabase, session will be null until the user confirms.
    if (!data.session) return { needsConfirmation: true };
    const sync = await onSignedInSync();
    if (sync.ok && sync.direction === 'pulled') DeviceEventEmitter.emit(CLOUD_PULLED_EVENT);
    if (sync.ok) DeviceEventEmitter.emit(CLOUD_SYNCED_EVENT);
    if (!sync.ok && sync.error) return { warning: `Account created, but sync failed: ${sync.error}` };
    return {};
  };

  const signOut: AuthContextValue['signOut'] = async () => {
    const client = getSupabase();
    if (client) {
      // Push any unsaved local changes before tearing down the session.
      await pushLocalToCloud().catch(() => undefined);
      // Sign out from Supabase (clears session from storage)
      await client.auth.signOut();
    }
    // The sync watermark belongs to the account that just left.
    await clearSyncState().catch(() => undefined);
    // Always clear local session state, even with Supabase unconfigured —
    // otherwise the button silently does nothing.
    setSession(null);
  };

  const syncNow: AuthContextValue['syncNow'] = async () => {
    const result = await pushLocalToCloud();
    if (result.ok) DeviceEventEmitter.emit(CLOUD_SYNCED_EVENT);
    return result;
  };

  const pullNow: AuthContextValue['pullNow'] = async () => {
    const result = await pullCloudToLocal();
    if (result.ok && result.hasData) {
      // Notify caches (theme, profile, …) to re-read AsyncStorage.
      DeviceEventEmitter.emit(CLOUD_PULLED_EVENT);
      DeviceEventEmitter.emit(CLOUD_SYNCED_EVENT);
    }
    return result;
  };

  return (
    <AuthContext.Provider
      value={{ user: session?.user ?? null, session, loading, signIn, signUp, signOut, syncNow, pullNow }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
