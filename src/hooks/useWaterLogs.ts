// Daily water totals are shown as saved only after the backend accepts them.

import { useCallback, useEffect, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../lib/supabase';
import { localDate } from '../lib/localDate';
import { isValidWaterMl, type WaterLogInsert } from '../lib/water/types';

const TABLE_MISSING_CODE = '42P01';

export interface UseWaterLogs {
  todayMl: number | null;
  isLoading: boolean;
  isPersisted: boolean;
  error: string | null;
  logToday: (amountMl: number) => Promise<{ ok: boolean; error?: string }>;
}

export function useWaterLogs(userId: string): UseWaterLogs {
  const [todayMl, setTodayMl] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPersisted, setIsPersisted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = localDate();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('water_logs')
        .select('amount_ml')
        .eq('user_id', userId)
        .eq('logged_date', today)
        .maybeSingle();

      if (error) {
        setIsPersisted(false);
        setError(error.message);
        return;
      }

      setIsPersisted(true);
      setTodayMl(data?.amount_ml ?? null);
      setError(null);
    } catch (cause) {
      setIsPersisted(false);
      setError(cause instanceof Error ? cause.message : 'Could not load water intake.');
    } finally {
      setIsLoading(false);
    }
  }, [userId, today]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logToday = useCallback(
    async (amountMl: number) => {
      if (isLoading || !isPersisted) return { ok: false, error: 'Load today\'s water intake before adding more. Please reopen this page when connected.' };
      if (!isValidWaterMl(amountMl)) {
        return { ok: false, error: 'Enter a realistic amount (0-10,000 mL).' };
      }

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
          return { ok: false, error: 'Water tracking is unavailable. Please contact your coach.' };
        }
        return { ok: false, error: error.message };
      }

      setIsPersisted(true);
      setTodayMl(amountMl);
      return { ok: true };
    },
    [userId, today, isLoading, isPersisted],
  );

  return { todayMl, isLoading, isPersisted, error, logToday };
}
