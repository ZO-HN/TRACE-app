import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

// Dev-only auto-login — skips the sign-in screen during development by
// signing into a real account (still a real Supabase session, so RLS keeps
// working normally everywhere; this is NOT an auth bypass). Set
// EXPO_PUBLIC_DEV_AUTO_LOGIN_EMAIL/PASSWORD in .env.local to enable; unset
// them (or just don't set them) to get the normal login screen back once
// the app is ready to test for real. Hard-gated to __DEV__ so it can never
// fire in a release build even if those vars somehow end up set there —
// but .env.local itself must never be used to produce a production build,
// since EXPO_PUBLIC_* values are inlined into the JS bundle in plaintext
// regardless of the __DEV__ runtime check.
const DEV_AUTO_LOGIN_EMAIL = process.env.EXPO_PUBLIC_DEV_AUTO_LOGIN_EMAIL;
const DEV_AUTO_LOGIN_PASSWORD = process.env.EXPO_PUBLIC_DEV_AUTO_LOGIN_PASSWORD;
const DEV_AUTO_LOGIN_ENABLED = __DEV__ && !!DEV_AUTO_LOGIN_EMAIL && !!DEV_AUTO_LOGIN_PASSWORD;

// ==========================================
// Every account in this app is a trainee (this client never creates coach
// accounts). Signups no longer auto-enroll under a default coach — a new
// trainee starts with coach_id = NULL and is gated behind ChooseCoachScreen
// (see app/_layout.tsx) until they pick a coach or enter a referral code.
// No role/demo-profile branching here; that complexity belongs to the coach
// dashboard's version of this hook.
// ==========================================

export type ExperienceTier = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

/** Matches public.profiles. estimated_1rm-style note: coach_id is assigned
 * server-side by handle_new_user() — never set it from the client. */
export interface TraceProfile {
  id: string;
  email: string;
  role: 'coach' | 'trainee';
  coach_id: string | null;
  coach_code: string | null;
  first_name: string;
  last_name: string;
  dob: string | null;
  experience_level: ExperienceTier;
  primary_goal: string | null;
  injury_notes: string | null;
  wearable_sync_active: boolean;
  premium_status: boolean;
  created_at: string;
  updated_at: string;
}

export interface UseTraceUserReturn {
  user: User | null;
  profile: TraceProfile | null;
  isLoading: boolean;
  error: Error | null;
  /** True once profile.coach_id is set. New signups start unenrolled —
   * see ChooseCoachScreen, which is what sets it. */
  isEnrolled: boolean;
  /** Re-fetch the profile row — call after claim_coach_by_id/claim_coach_by_code
   * succeeds so the gate re-evaluates without a full app reload. */
  refetchProfile: () => Promise<void>;
}

export function useTraceUser(): UseTraceUserReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<TraceProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchProfile(currentUser: User) {
      try {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (profileError) throw profileError;
        if (isMounted) setProfile(data as TraceProfile);
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch profile'));
          setProfile(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    async function init() {
      setIsLoading(true);
      setError(null);

      const {
        data: { session },
        error: authError,
      } = await supabase.auth.getSession();
      if (authError && isMounted) {
        setError(authError);
        setIsLoading(false);
        return;
      }

      let currentUser = session?.user ?? null;

      if (!currentUser && DEV_AUTO_LOGIN_ENABLED) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: DEV_AUTO_LOGIN_EMAIL!,
          password: DEV_AUTO_LOGIN_PASSWORD!,
        });
        if (signInError) {
          console.warn('DEV_AUTO_LOGIN failed, falling back to the sign-in screen:', signInError.message);
        } else {
          currentUser = signInData.user;
        }
      }

      userRef.current = currentUser;
      if (isMounted) setUser(currentUser);

      if (!currentUser) {
        if (isMounted) {
          setProfile(null);
          setIsLoading(false);
        }
        return;
      }

      await fetchProfile(currentUser);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      const currentUser = session?.user ?? null;
      userRef.current = currentUser;
      setUser(currentUser);
      if (!currentUser) {
        setProfile(null);
        setIsLoading(false);
      } else {
        fetchProfile(currentUser);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refetchProfile = useCallback(async () => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();
    if (profileError) {
      setError(profileError instanceof Error ? profileError : new Error('Failed to refetch profile'));
      return;
    }
    setProfile(data as TraceProfile);
  }, []);

  return {
    user,
    profile,
    isLoading,
    error,
    isEnrolled: profile?.coach_id != null,
    refetchProfile,
  };
}
