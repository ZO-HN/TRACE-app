// Reads/writes water_logs for the signed-in trainee — one row per user per
// day, upserted (mirrors useBodyweightLogs' logToday shape). Table doesn't
// exist yet (docs/migrations-drafts/008_tracked_parity_tier_a.sql); until
// applied this degrades to in-memory-only state for the session, same
// TABLE_MISSING_CODE pattern as useBodyweightSettings.

import { useCallback, useEffect, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../lib/supabase';
import { isValidWaterMl, type WaterLogInsert } from '../lib/water/types';

const TABLE_MISSING_CODE = '42P01';

export interface UseWaterLogs {
  todayMl: number | null;
  isLoading: boolean;
  isPersisted: boolean;
  logToday: (amountMl: number) => Promise<{ ok: boolean; error?: string }>;
}

export function useWaterLogs(userId: string): UseWaterLogs {
  const [todayMl, setTodayMl] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPersisted, setIsPersisted] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('water_logs')
      .select('amount_ml')
      .eq('user_id', userId)
      .eq('logged_date', today)
      .maybeSingle();

    if (error) {
      setIsPersisted(error.code !== TABLE_MISSING_CODE);
      setIsLoading(false);
      return;
    }

    setIsPersisted(true);
    setTodayMl(data?.amount_ml ?? null);
    setIsLoading(false);
  }, [userId, today]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logToday = useCallback(
    async (amountMl: number) => {
      if (!isValidWaterMl(amountMl)) {
        return { ok: false, error: 'Enter a realistic amount (0-10,000 mL).' };
      }

      setTodayMl(amountMl); // optimistic — sticks locally even pre-migration

      const payload: WaterLogInsert = {
        id: randomUUID(),
        user_id: userId,
        logged_date: today,
        amount_ml: amountMl,
      };
      const { error } = await supabase
        .from('water_logs')
        .upsert(payload, { onConflict: 'user_id,logged_date' });

      if (error) {
        if (error.code === TABLE_MISSING_CODE) {
          setIsPersisted(false);
          return { ok: true };
        }
        return { ok: false, error: error.message };
      }

      setIsPersisted(true);
      return { ok: true };
    },
    [userId, today],
  );

  return { todayMl, isLoading, isPersisted, logToday };
}
