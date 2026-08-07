// Google sign-in via Supabase's OAuth flow. RN has no URL bar for Supabase
// to read a session out of automatically (see supabase.ts's
// detectSessionInUrl: false), so this opens the provider's consent screen
// in an auth browser session, then manually lifts the access/refresh
// tokens off the redirect URL and hands them to supabase.auth.setSession.
//
// Requires the Google provider to be enabled in the Supabase project's
// Auth settings (with a Google Cloud OAuth client configured for the
// redirect URI this produces) — that's dashboard/console configuration,
// not something this client code can do on its own. Until that's set up,
// signInWithGoogle() will fail with a clear Supabase error rather than
// silently doing nothing.

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../supabase';

WebBrowser.maybeCompleteAuthSession();

export interface GoogleSignInResult {
  ok: boolean;
  /** True when the user closed the browser without completing sign-in —
   * not a real error, just don't show one. */
  cancelled?: boolean;
  error?: string;
}

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const redirectTo = AuthSession.makeRedirectUri({ path: 'auth/callback' });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data?.url) {
    return { ok: false, error: error?.message ?? 'Could not start Google sign-in.' };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { ok: false, cancelled: true };
  }
  if (result.type !== 'success' || !result.url) {
    return { ok: false, error: 'Google sign-in did not complete.' };
  }

  const params = new URL(result.url.replace('#', '?')).searchParams;
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) {
    const errorDescription = params.get('error_description');
    return { ok: false, error: errorDescription ?? 'Google sign-in did not return a session.' };
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (sessionError) return { ok: false, error: sessionError.message };

  return { ok: true };
}
