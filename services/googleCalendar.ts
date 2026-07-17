import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

/**
 * Google Calendar (read-only) — the cross-platform calendar source.
 *
 * expo-calendar only reads the OS calendar, which doesn't exist in a browser,
 * so on web this is the *only* way to show real events. It also works on
 * iOS/Android, where it sits alongside Apple/system Calendar as a second source.
 *
 * Auth differs per platform because Google's client types do:
 *   - web:    Google Identity Services token client. A "Web application" client
 *             can't do a token exchange without a client_secret, which a public
 *             SPA must never ship — GIS hands back an access token directly.
 *   - native: iOS/Android clients are public clients: PKCE code flow, no secret,
 *             and they hand back a refresh token so sign-in survives restarts.
 */

// Completes the auth session when the browser redirects back on native.
WebBrowser.maybeCompleteAuthSession();

const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const TOKEN_KEY = 'focusGoogleToken';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB;
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS;
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID;

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

function clientId(): string | undefined {
  if (Platform.OS === 'web') return WEB_CLIENT_ID;
  if (Platform.OS === 'ios') return IOS_CLIENT_ID;
  return ANDROID_CLIENT_ID;
}

/** False until a Google OAuth client ID is set for this platform — the UI hides
 *  the Google option entirely rather than offering a button that can't work. */
export const isGoogleCalendarConfigured = (): boolean => Boolean(clientId());

// ── Token storage ───────────────────────────────────────────────────────────

type StoredToken = {
  accessToken: string;
  /** Epoch ms. Treated as expired a minute early to avoid racing the clock. */
  expiresAt: number;
  refreshToken?: string;
};

async function loadToken(): Promise<StoredToken | null> {
  try {
    const raw = await AsyncStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as StoredToken) : null;
  } catch {
    return null;
  }
}

async function saveToken(t: StoredToken): Promise<void> {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(t));
  } catch {}
}

export async function signOutGoogle(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {}
}

/** True if we hold a token that is either still valid or refreshable. */
export async function isGoogleSignedIn(): Promise<boolean> {
  const t = await loadToken();
  if (!t) return false;
  return Boolean(t.refreshToken) || t.expiresAt > Date.now();
}

// ── Sign-in ─────────────────────────────────────────────────────────────────

let gisScript: Promise<void> | null = null;

/** Inject the Google Identity Services script once, on web only. */
function loadGis(): Promise<void> {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('GIS requires a browser'));
  }
  if (gisScript) return gisScript;
  gisScript = new Promise<void>((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) return resolve();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load Google Identity Services'));
    document.head.appendChild(s);
  });
  return gisScript;
}

async function signInWeb(): Promise<boolean> {
  const id = WEB_CLIENT_ID;
  if (!id) return false;
  try {
    await loadGis();
  } catch {
    return false;
  }
  const google = (window as any).google;
  if (!google?.accounts?.oauth2) return false;

  return new Promise<boolean>((resolve) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: id,
      scope: SCOPE,
      callback: async (resp: any) => {
        if (!resp?.access_token) return resolve(false);
        const ttl = Number(resp.expires_in) || 3600;
        await saveToken({
          accessToken: resp.access_token,
          expiresAt: Date.now() + ttl * 1000,
        });
        resolve(true);
      },
      // Fires when the user closes the popup or it's blocked.
      error_callback: () => resolve(false),
    });
    client.requestAccessToken();
  });
}

/** Google's native clients expect the reversed client ID as the redirect scheme:
 *  `123-abc.apps.googleusercontent.com` -> `com.googleusercontent.apps.123-abc` */
function reversedClientId(id: string): string {
  return `com.googleusercontent.apps.${id.replace(/\.apps\.googleusercontent\.com$/, '')}`;
}

async function signInNative(): Promise<boolean> {
  const id = clientId();
  if (!id) return false;
  try {
    const redirectUri = AuthSession.makeRedirectUri({
      native: `${reversedClientId(id)}:/oauthredirect`,
    });
    const request = new AuthSession.AuthRequest({
      clientId: id,
      scopes: [SCOPE],
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      // Required to get a refresh token back from Google.
      extraParams: { access_type: 'offline', prompt: 'consent' },
    });
    const result = await request.promptAsync(discovery);
    if (result.type !== 'success' || !result.params?.code) return false;

    const token = await AuthSession.exchangeCodeAsync(
      {
        clientId: id,
        code: result.params.code,
        redirectUri,
        extraParams: request.codeVerifier ? { code_verifier: request.codeVerifier } : undefined,
      },
      discovery,
    );
    await saveToken({
      accessToken: token.accessToken,
      expiresAt: Date.now() + (token.expiresIn ?? 3600) * 1000,
      refreshToken: token.refreshToken ?? undefined,
    });
    return true;
  } catch (e) {
    console.log('Google sign-in error:', e);
    return false;
  }
}

/** Opens Google's consent screen. Returns true once a token is stored. */
export async function signInToGoogle(): Promise<boolean> {
  if (!isGoogleCalendarConfigured()) return false;
  return Platform.OS === 'web' ? signInWeb() : signInNative();
}

// ── Access token ────────────────────────────────────────────────────────────

/** Valid access token, refreshing if needed. Null means "sign in again". */
async function getAccessToken(): Promise<string | null> {
  const t = await loadToken();
  if (!t) return null;
  // A minute of slack so a token doesn't expire mid-request.
  if (t.expiresAt - 60_000 > Date.now()) return t.accessToken;

  // Web (GIS) issues no refresh token — the user must re-consent.
  const id = clientId();
  if (!t.refreshToken || !id) {
    await signOutGoogle();
    return null;
  }
  try {
    const refreshed = await AuthSession.refreshAsync(
      { clientId: id, refreshToken: t.refreshToken },
      discovery,
    );
    const next: StoredToken = {
      accessToken: refreshed.accessToken,
      expiresAt: Date.now() + (refreshed.expiresIn ?? 3600) * 1000,
      // Google usually omits refresh_token on refresh — keep the original.
      refreshToken: refreshed.refreshToken ?? t.refreshToken,
    };
    await saveToken(next);
    return next.accessToken;
  } catch (e) {
    console.log('Google token refresh failed:', e);
    await signOutGoogle();
    return null;
  }
}

// ── Events ──────────────────────────────────────────────────────────────────

export interface GoogleEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  location?: string;
}

/**
 * Events on the user's primary calendar in [start, end).
 * Returns null when Google isn't connected or the request fails — callers use
 * that to fall back rather than showing an empty week as if it were real.
 */
export async function getGoogleEvents(start: Date, end: Date): Promise<GoogleEvent[] | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const params = new URLSearchParams({
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      // Expands recurring events into individual instances.
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
    });
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (res.status === 401 || res.status === 403) {
      await signOutGoogle();
      return null;
    }
    if (!res.ok) return null;
    const json = await res.json();
    return (json.items ?? [])
      .filter((it: any) => it?.status !== 'cancelled')
      .map((it: any): GoogleEvent => {
        // All-day events use `date` (YYYY-MM-DD); timed ones use `dateTime`.
        const allDay = Boolean(it.start?.date);
        return {
          id: it.id,
          title: it.summary || '(No title)',
          startDate: it.start?.dateTime ?? it.start?.date,
          endDate: it.end?.dateTime ?? it.end?.date,
          allDay,
          location: it.location || undefined,
        };
      })
      .filter((e: GoogleEvent) => e.startDate && e.endDate);
  } catch (e) {
    console.log('Google Calendar fetch error:', e);
    return null;
  }
}
