// Recent completed workout_sessions for the signed-in trainee. Owner SELECT
// is allowed under RLS (see CLAUDE.md's insert-once note); this hook never
// writes.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface SessionSummary {
  id: string;
  session_name: string;
  completed_at: string;
  duration_seconds: number;
  rpe_average: number | null;
  compliance_score: number | null;
}

export interface UseSessionSummaries {
  sessions: SessionSummary[];
  isLoading: boolean;
  refresh: () => void;
}

export function useSessionSummaries(userId: string, limit = 10): UseSessionSummaries {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const { data, error } = await supabase
          .from('workout_sessions')
          .select('id, session_name, completed_at, duration_seconds, rpe_average, compliance_score')
          .eq('user_id', userId)
          .order('completed_at', { ascending: false })
          .limit(limit);

        if (!cancelled && !error && data) {
          setSessions(data as SessionSummary[]);
        }
      } catch {
        // Offline — leave the last-known list in place.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, limit, tick]);

  return { sessions, isLoading, refresh };
}
