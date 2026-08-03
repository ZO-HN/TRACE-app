// Recent nutrition_logs for the signed-in trainee, plus a logEntry() action
// for the quick-entry logger. Owner FOR ALL under RLS.

import { useCallback, useEffect, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../lib/supabase';
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
      const { error: insertError } = await supabase.from('nutrition_logs').insert(payload);

      if (insertError) return { ok: false, error: insertError.message };
      await refresh();
      return { ok: true };
    },
    [userId, refresh],
  );

  return { entries, isLoading, error, logEntry };
}
