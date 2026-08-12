// Rep-range PRs (1-5 / 6-10 / 11+) for a single exercise — queries set_logs
// directly (joined to its session for the achieved date) rather than the
// get_personal_records RPC, which only returns one best-e1RM row per
// exercise. See src/lib/analytics/repRangePRs.ts for the grouping math.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { groupByRepRange, type RepRangePR, type RepRangeSetRow } from '../lib/analytics/repRangePRs';

export interface UseRepRangePRs {
  ranges: RepRangePR[];
  isLoading: boolean;
  error: string | null;
}

interface SetLogRow {
  weight_kg: number | null;
  reps: number | null;
  session: { completed_at: string | null } | null;
}

export function useRepRangePRs(userId: string, exerciseId: string | null): UseRepRangePRs {
  const [ranges, setRanges] = useState<RepRangePR[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!exerciseId) {
      setRanges([]);
      return;
    }
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      const { data, error: fetchError } = await supabase
        .from('set_logs')
        .select('weight_kg, reps, session:workout_sessions!inner(completed_at, user_id)')
        .eq('exercise_id', exerciseId)
        .eq('session.user_id', userId);

      if (cancelled) return;
      if (fetchError) {
        setError(fetchError.message);
        setIsLoading(false);
        return;
      }

      const rows: RepRangeSetRow[] = ((data as unknown as SetLogRow[]) ?? [])
        .filter((r) => r.weight_kg != null && r.reps != null)
        .map((r) => ({
          weight_kg: r.weight_kg as number,
          reps: r.reps as number,
          achieved_at: r.session?.completed_at ?? '',
        }));

      setError(null);
      setRanges(groupByRepRange(rows));
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, exerciseId]);

  return { ranges, isLoading, error };
}
