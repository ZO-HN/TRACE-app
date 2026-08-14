// Real steps persistence — backed by wearable_biometrics.step_count
// (already live, added by the coach-dashboard repo's own
// 20260815000000_steps_and_cardio_tracking.sql — NOT the steps_logs table
// this hook originally targeted; that draft never got applied, and the
// live schema went a different direction: a column on the existing daily
// biometrics table rather than a new one). Upserting here only ever sets
// user_id/recorded_date/step_count — other wearable_biometrics columns on
// the same row (hrv_ms, sleep_score, etc.) are left untouched.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface StepsEntry {
  id: string;
  recorded_date: string;
  steps: number;
}

export interface UseStepsLogs {
  entries: StepsEntry[];
  isLoading: boolean;
  isSupported: boolean;
  error: string | null;
  /** Upserts today's step count (one row per user per day — logging again today edits it). */
  logToday: (steps: number) => Promise<{ ok: boolean; error?: string }>;
}

interface BiometricsRow {
  id: string;
  recorded_date: string;
  step_count: number | null;
}

export function useStepsLogs(userId: string, limit = 30): UseStepsLogs {
  const [entries, setEntries] = useState<StepsEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('wearable_biometrics')
      .select('id, recorded_date, step_count')
      .eq('user_id', userId)
      .not('step_count', 'is', null)
      .order('recorded_date', { ascending: false })
      .limit(limit);

    if (fetchError) {
      setError(fetchError.message);
      setEntries([]);
    } else {
      setIsSupported(true);
      setError(null);
      setEntries(
        ((data as BiometricsRow[]) ?? [])
          .filter((r) => r.step_count != null)
          .map((r) => ({ id: r.id, recorded_date: r.recorded_date, steps: r.step_count as number })),
      );
    }
    setIsLoading(false);
  }, [userId, limit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logToday = useCallback(
    async (steps: number) => {
      const today = new Date().toISOString().slice(0, 10);
      const { error: upsertError } = await supabase
        .from('wearable_biometrics')
        .upsert(
          { user_id: userId, recorded_date: today, step_count: steps },
          { onConflict: 'user_id,recorded_date' },
        );

      if (upsertError) return { ok: false, error: upsertError.message };
      await refresh();
      return { ok: true };
    },
    [userId, refresh],
  );

  return { entries, isLoading, isSupported, error, logToday };
}
