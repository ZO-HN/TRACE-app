// Time series for a single exercise (tonnage, top weight/e1RM per session
// date) via the get_exercise_stats RPC. `exerciseId` may be null to mean
// "no exercise selected" — the hook simply doesn't fetch in that case.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface ExerciseStatPoint {
  session_date: string;
  total_volume_kg: number;
  top_weight_kg: number;
  top_estimated_1rm: number | null;
  total_sets: number;
}

export interface UseExerciseStats {
  points: ExerciseStatPoint[];
  isLoading: boolean;
  error: string | null;
}

export function useExerciseStats(
  userId: string,
  exerciseId: string | null,
  days = 90,
): UseExerciseStats {
  const [points, setPoints] = useState<ExerciseStatPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!exerciseId) {
      setPoints([]);
      return;
    }
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      const { data, error: rpcError } = await supabase.rpc('get_exercise_stats', {
        p_user_id: userId,
        p_exercise_id: exerciseId,
        p_days: days,
      });
      if (cancelled) return;
      if (rpcError) setError(rpcError.message);
      else {
        setError(null);
        setPoints((data as ExerciseStatPoint[]) ?? []);
      }
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, exerciseId, days]);

  return { points, isLoading, error };
}
