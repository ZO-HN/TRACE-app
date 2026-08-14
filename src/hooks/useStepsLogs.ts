// Real steps persistence — see docs/migrations-drafts/011_steps_tracking.sql.
// Mirrors useBodyweightLogs' shape exactly (one row per user per day,
// upsert on conflict). Degrades gracefully (isSupported: false) until that
// migration is applied, same pattern as useWorkoutFolders/usePrograms.

import { useCallback, useEffect, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../lib/supabase';

const TABLE_MISSING_CODE = '42P01';

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
  /** Upserts today's entry (one row per user per day — logging again today edits it). */
  logToday: (steps: number) => Promise<{ ok: boolean; error?: string }>;
}

export function useStepsLogs(userId: string, limit = 30): UseStepsLogs {
  const [entries, setEntries] = useState<StepsEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('steps_logs')
      .select('id, recorded_date, steps')
      .eq('user_id', userId)
      .order('recorded_date', { ascending: false })
      .limit(limit);

    if (fetchError) {
      setIsSupported(fetchError.code !== TABLE_MISSING_CODE);
      setError(fetchError.code === TABLE_MISSING_CODE ? null : fetchError.message);
      setEntries([]);
    } else {
      setIsSupported(true);
      setError(null);
      setEntries((data as StepsEntry[]) ?? []);
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
        .from('steps_logs')
        .upsert({ id: randomUUID(), user_id: userId, recorded_date: today, steps }, { onConflict: 'user_id,recorded_date' });

      if (upsertError) return { ok: false, error: upsertError.message };
      await refresh();
      return { ok: true };
    },
    [userId, refresh],
  );

  return { entries, isLoading, isSupported, error, logToday };
}
