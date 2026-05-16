import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured && __DEV__) {
  console.warn(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY is not set. ' +
      'Login & cross-device sync are disabled until you add them. See README.md.'
  );
}

let _client: SupabaseClient | null = null;

// Lazy-init: Expo Router's static web bundling evaluates this module in Node,
// where global WebSocket (Node < 22) and `window` are missing — so realtime-js
// and AsyncStorage's web adapter would throw at module load. Creating the client
// on first real use avoids that without needing a `ws` polyfill.
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (typeof window === 'undefined' && typeof navigator === 'undefined') return null;
  if (!_client) {
    _client = createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return _client;
}
