import type { Session, User } from '@supabase/supabase-js';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { getSupabase } from '../services/supabase';
import { onSignedInSync, pullCloudToLocal, pushLocalToCloud } from '../services/sync';

/** Fired after a successful cloud pull so contexts that cache AsyncStorage
 *  values (theme, profile, …) know to reload themselves. */
export const CLOUD_PULLED_EVENT = 'CLOUD_PULLED';

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

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    const client = getSupabase();
    if (!client) return { error: 'Sign-in is not configured yet. Add Supabase keys to enable it.' };
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { error: error.message };
    const sync = await onSignedInSync();
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
    // Always clear local session state, even with Supabase unconfigured —
    // otherwise the button silently does nothing.
    setSession(null);
  };

  const syncNow: AuthContextValue['syncNow'] = async () => pushLocalToCloud();

  const pullNow: AuthContextValue['pullNow'] = async () => {
    const result = await pullCloudToLocal();
    if (result.ok && result.hasData) {
      // Notify caches (theme, profile, …) to re-read AsyncStorage.
      DeviceEventEmitter.emit(CLOUD_PULLED_EVENT);
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
