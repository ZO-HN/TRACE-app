// Per-exercise personal records (best estimated_1rm) via the
// get_personal_records RPC — computed server-side, no new table.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface PersonalRecord {
  exercise_id: string;
  exercise_name: string;
  target_muscle_group: string;
  best_estimated_1rm: number | null;
  best_weight_kg: number;
  best_reps: number;
  achieved_at: string;
}

export interface UsePersonalRecords {
  records: PersonalRecord[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function usePersonalRecords(userId: string): UsePersonalRecords {
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      const { data, error: rpcError } = await supabase.rpc('get_personal_records', {
        p_user_id: userId,
      });
      if (cancelled) return;
      if (rpcError) setError(rpcError.message);
      else {
        setError(null);
        setRecords((data as PersonalRecord[]) ?? []);
      }
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, tick]);

  return { records, isLoading, error, refresh };
}
