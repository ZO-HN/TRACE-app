// Recent bodyweight_logs for the signed-in trainee, plus a log() action.
// Owner FOR ALL under RLS, so this hook both reads and writes (unlike
// useSessionSummaries, which is read-only).

import { useCallback, useEffect, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../lib/supabase';
import { toBodyweightLogInsert } from '../lib/bodyweight/mapBodyweight';

export interface BodyweightEntry {
  id: string;
  recorded_date: string;
  weight_kg: number;
  note: string | null;
}

export interface UseBodyweightLogs {
  entries: BodyweightEntry[];
  isLoading: boolean;
  error: string | null;
  /** Upserts today's entry (one row per user per day — logging again today edits it). */
  logToday: (weightLbs: number, note?: string) => Promise<{ ok: boolean; error?: string }>;
}

export function useBodyweightLogs(userId: string, limit = 30): UseBodyweightLogs {
  const [entries, setEntries] = useState<BodyweightEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('bodyweight_logs')
      .select('id, recorded_date, weight_kg, note')
      .eq('user_id', userId)
      .order('recorded_date', { ascending: false })
      .limit(limit);

    if (fetchError) setError(fetchError.message);
    else {
      setError(null);
      setEntries((data as BodyweightEntry[]) ?? []);
    }
    setIsLoading(false);
  }, [userId, limit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logToday = useCallback(
    async (weightLbs: number, note?: string) => {
      const today = new Date().toISOString().slice(0, 10);
      const payload = toBodyweightLogInsert(randomUUID(), userId, weightLbs, today, note);
      const { error: upsertError } = await supabase
        .from('bodyweight_logs')
        .upsert(payload, { onConflict: 'user_id,recorded_date' });

      if (upsertError) return { ok: false, error: upsertError.message };
      await refresh();
      return { ok: true };
    },
    [userId, refresh],
  );

  return { entries, isLoading, error, logToday };
}
