// Recent nutrition_logs for the signed-in trainee, plus a logEntry() action
// for the quick-entry logger. Owner FOR ALL under RLS.
//
// Writes go through the offline outbox (same as set_logs) rather than a
// direct insert — logging food is a real gym/kitchen-floor action that
// should survive a dead connection, unlike the catalog/settings writes
// elsewhere in this feature set.

import { useCallback, useEffect, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../lib/supabase';
import { useOutboxStore } from '../lib/outbox/outboxStore';
import { toNutritionLogInsert } from '../lib/nutrition/mapQuickEntry';
import { hasAnyMacro, parseQuickEntry } from '../lib/nutrition/parseQuickEntry';

export interface NutritionEntry {
  id: string;
  logged_at: string;
  method: 'TYPED' | 'BARCODE' | 'PHOTO';
  description: string | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  calories: number | null;
}

export interface UseNutritionLogs {
  entries: NutritionEntry[];
  isLoading: boolean;
  error: string | null;
  logEntry: (text: string) => Promise<{ ok: boolean; error?: string }>;
}

export function useNutritionLogs(userId: string, limit = 20): UseNutritionLogs {
  const [entries, setEntries] = useState<NutritionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const enqueueNutritionLog = useOutboxStore((s) => s.enqueueNutritionLog);

  const refresh = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('nutrition_logs')
      .select('id, logged_at, method, description, protein_g, carbs_g, fat_g, calories')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(limit);

    if (fetchError) setError(fetchError.message);
    else {
      setError(null);
      setEntries((data as NutritionEntry[]) ?? []);
    }
    setIsLoading(false);
  }, [userId, limit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logEntry = useCallback(
    async (text: string) => {
      const parsed = parseQuickEntry(text);
      if (!hasAnyMacro(parsed)) {
        return { ok: false, error: 'Could not find any macros or calories in that entry.' };
      }
      const payload = toNutritionLogInsert(randomUUID(), userId, text, parsed);
      await enqueueNutritionLog(payload);

      // Optimistic — the row may still be sitting in the outbox offline, so
      // reflect it locally instead of waiting on a refetch that may find nothing.
      setEntries((current) => [
        {
          id: payload.id,
          logged_at: new Date().toISOString(),
          method: payload.method,
          description: payload.description ?? null,
          protein_g: payload.protein_g ?? null,
          carbs_g: payload.carbs_g ?? null,
          fat_g: payload.fat_g ?? null,
          calories: payload.calories ?? null,
        },
        ...current,
      ]);
      return { ok: true };
    },
    [userId, enqueueNutritionLog],
  );

  return { entries, isLoading, error, logEntry };
}
