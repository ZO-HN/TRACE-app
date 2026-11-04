// Recent bodyweight_logs for the signed-in trainee, plus a log() action.
// Owner FOR ALL under RLS, so this hook both reads and writes (unlike
// useSessionSummaries, which is read-only).

import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../lib/supabase';
import { toBodyweightLogInsert } from '../lib/bodyweight/mapBodyweight';
import { localDate } from '../lib/localDate';
import type { WeightDisplayUnit } from '../lib/units';

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
  /** Upserts today's entry; unit defaults to pounds for existing callers. */
  logToday: (weight: number, note?: string, unit?: WeightDisplayUnit) => Promise<{ ok: boolean; error?: string }>;
}

export function useBodyweightLogs(userId: string, limit = 30): UseBodyweightLogs {
  const [snapshot, setSnapshot] = useState<{ owner: string; entries: BodyweightEntry[] }>({ owner: userId, entries: [] });
  const owner = useRef(userId);
  owner.current = userId;
  const request = useRef(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (owner.current !== userId) return;
    const revision = ++request.current;
    const current = () => owner.current === userId && request.current === revision;
    setIsLoading(true);
    try {
    const { data, error: fetchError } = await supabase
      .from('bodyweight_logs')
      .select('id, recorded_date, weight_kg, note')
      .eq('user_id', userId)
      .order('recorded_date', { ascending: false })
      .limit(limit);

    if (!current()) return;
    if (fetchError) setError(fetchError.message);
    else {
      setError(null);
      setSnapshot({ owner: userId, entries: (data as BodyweightEntry[]) ?? [] });
    }
    } catch (cause) {
      if (current()) setError(cause instanceof Error ? cause.message : 'Could not load weigh-ins.');
    } finally { if (current()) setIsLoading(false); }
  }, [userId, limit]);

  useFocusEffect(useCallback(() => {
    void refresh();
    return () => { request.current += 1; };
  }, [refresh]));

  const logToday = useCallback(
    async (weight: number, note?: string, unit: WeightDisplayUnit = 'lbs') => {
      try {
      const today = localDate();
      const payload = toBodyweightLogInsert(randomUUID(), userId, weight, today, note, unit);
      const { error: upsertError } = await supabase
        .from('bodyweight_logs')
        .upsert(payload, { onConflict: 'user_id,recorded_date' });

      if (upsertError) return { ok: false, error: upsertError.message };
      await refresh();
      return { ok: true };
      } catch (cause) {
        return { ok: false, error: cause instanceof Error ? cause.message : 'Could not save your weigh-in.' };
      }
    },
    [userId, refresh],
  );

  return { entries: snapshot.owner === userId ? snapshot.entries : [], isLoading, error, logToday };
}
