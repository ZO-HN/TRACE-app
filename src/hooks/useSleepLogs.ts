// sleep_logs for the signed-in trainee — one row per night (upsert by
// sleep_date, like bodyweight_logs). Direct writes. Degrades to an empty
// list until sleep_logs exists — see
// docs/migrations-drafts/006_sleep_tracking.sql.

import { useCallback, useEffect, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../lib/supabase';
import type { SleepLog } from '../lib/sleep/types';

const TABLE_MISSING_CODE = '42P01';

interface LogRow {
  id: string;
  sleep_date: string;
  bedtime: string;
  wake_time: string;
  quality: number;
}

function fromRow(row: LogRow): SleepLog {
  return {
    id: row.id,
    sleepDate: row.sleep_date,
    bedtime: row.bedtime,
    wakeTime: row.wake_time,
    quality: row.quality as SleepLog['quality'],
  };
}

export interface UseSleepLogs {
  logs: SleepLog[];
  isLoading: boolean;
  isSupported: boolean;
  logSleep: (
    sleepDate: string,
    bedtime: string,
    wakeTime: string,
    quality: SleepLog['quality'],
  ) => Promise<{ ok: boolean; error?: string }>;
}

export function useSleepLogs(userId: string, sinceDate: string): UseSleepLogs {
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupported, setIsSupported] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('sleep_logs')
      .select('id, sleep_date, bedtime, wake_time, quality')
      .eq('user_id', userId)
      .gte('sleep_date', sinceDate)
      .order('sleep_date', { ascending: false });

    if (error) {
      setIsSupported(error.code !== TABLE_MISSING_CODE);
      setLogs([]);
    } else {
      setIsSupported(true);
      setLogs(((data as LogRow[]) ?? []).map(fromRow));
    }
    setIsLoading(false);
  }, [userId, sinceDate]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logSleep = useCallback(
    async (
      sleepDate: string,
      bedtime: string,
      wakeTime: string,
      quality: SleepLog['quality'],
    ) => {
      const { error } = await supabase.from('sleep_logs').upsert(
        {
          id: randomUUID(),
          user_id: userId,
          sleep_date: sleepDate,
          bedtime,
          wake_time: wakeTime,
          quality,
        },
        { onConflict: 'user_id,sleep_date' },
      );
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    },
    [userId, refresh],
  );

  return { logs, isLoading, isSupported, logSleep };
}
