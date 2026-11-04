// Recent completed workout_sessions for the signed-in trainee. Owner SELECT
// is allowed under RLS (see CLAUDE.md's insert-once note); this hook never
// writes.

import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useOutboxStore } from '../lib/outbox/outboxStore';
import { forUser } from '../lib/outbox/ownership';

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
  error: string | null;
  refresh: () => void;
}

export function useSessionSummaries(userId: string, limit = 10): UseSessionSummaries {
  const [remote, setRemote] = useState<{ userId: string; sessions: SessionSummary[] }>({ userId, sessions: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const items = useOutboxStore((state) => state.items);
  const sessions = useMemo(() => {
    const merged = new Map((remote.userId === userId ? remote.sessions : []).map((session) => [session.id, session]));
    for (const item of forUser(items, userId)) {
      if (item.table !== 'workout_sessions' || !('session_name' in item.payload) || !item.payload.completed_at) continue;
      if (item.status === 'synced' && merged.has(item.id)) continue;
      const payload = item.payload;
      merged.set(item.id, {
        id: item.id, session_name: payload.session_name ?? 'Workout', completed_at: payload.completed_at!,
        duration_seconds: payload.duration_seconds ?? 0, rpe_average: payload.rpe_average ?? null,
        compliance_score: payload.compliance_score ?? null,
      });
    }
    return [...merged.values()].sort((a, b) => b.completed_at.localeCompare(a.completed_at)).slice(0, limit);
  }, [remote, items, userId, limit]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const { data, error } = await supabase
          .from('workout_sessions')
          .select('id, session_name, completed_at, duration_seconds, rpe_average, compliance_score')
          .eq('user_id', userId)
          .order('completed_at', { ascending: false })
          .limit(limit);

        if (error) throw new Error(error.message);
        if (!cancelled && data) {
          setRemote({ userId, sessions: data as SessionSummary[] });
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load workout history.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, limit, tick]));

  return { sessions, isLoading, error, refresh };
}
