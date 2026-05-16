import type { Session, User } from '@supabase/supabase-js';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { getSupabase } from '../services/supabase';
import { onSignedInSync, pushLocalToCloud } from '../services/sync';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<{ ok: boolean; error?: string }>;
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

    client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = client.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    const client = getSupabase();
    if (!client) return { error: 'Sign-in is not configured yet. Add Supabase keys to enable it.' };
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { error: error.message };
    const sync = await onSignedInSync();
    if (!sync.ok && sync.error) return { error: `Signed in, but sync failed: ${sync.error}` };
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
    if (!sync.ok && sync.error) return { error: `Account created, but sync failed: ${sync.error}` };
    return {};
  };

  const signOut: AuthContextValue['signOut'] = async () => {
    const client = getSupabase();
    if (!client) return;
    // Push any unsaved local changes before tearing down the session.
    await pushLocalToCloud().catch(() => undefined);
    await client.auth.signOut();
  };

  const syncNow: AuthContextValue['syncNow'] = async () => pushLocalToCloud();

  return (
    <AuthContext.Provider
      value={{ user: session?.user ?? null, session, loading, signIn, signUp, signOut, syncNow }}
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
