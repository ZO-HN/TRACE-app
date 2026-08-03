// Training volume grouped by target muscle group over a trailing window,
// via the get_muscle_analytics RPC.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface MuscleAnalyticsRow {
  target_muscle_group: string;
  total_volume_kg: number;
  total_sets: number;
}

export interface UseMuscleAnalytics {
  rows: MuscleAnalyticsRow[];
  isLoading: boolean;
  error: string | null;
}

export function useMuscleAnalytics(userId: string, days = 30): UseMuscleAnalytics {
  const [rows, setRows] = useState<MuscleAnalyticsRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      const { data, error: rpcError } = await supabase.rpc('get_muscle_analytics', {
        p_user_id: userId,
        p_days: days,
      });
      if (cancelled) return;
      if (rpcError) setError(rpcError.message);
      else {
        setError(null);
        setRows((data as MuscleAnalyticsRow[]) ?? []);
      }
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, days]);

  return { rows, isLoading, error };
}
