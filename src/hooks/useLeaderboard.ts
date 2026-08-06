// Per-exercise leaderboard, scoped to the caller + who they follow, via the
// get_exercise_leaderboard RPC. That RPC (and the follows table behind it)
// doesn't exist in this Supabase project yet — see
// docs/migrations-drafts/004_leaderboards.sql. Until it's applied this
// degrades to an empty, "not yet available" state rather than erroring,
// which doubles as an early smoke test: this is testable right now, before
// any migration lands.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { LeaderboardEntry } from '../lib/leaderboard/types';

const UNDEFINED_TABLE = '42P01';
const UNDEFINED_FUNCTION = '42883';

interface LeaderboardRow {
  user_id: string;
  display_name: string;
  weight_lbs: number;
  reps: number;
  rpe: number | null;
  volume: number;
  sets: number;
}

export interface UseLeaderboard {
  entries: LeaderboardEntry[];
  isLoading: boolean;
  /** False once we've confirmed get_exercise_leaderboard isn't callable yet. */
  isAvailable: boolean;
}

export function useLeaderboard(userId: string, exerciseId: string | null): UseLeaderboard {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);

  const load = useCallback(async () => {
    if (!exerciseId) {
      setEntries([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase.rpc('get_exercise_leaderboard', {
      p_exercise_id: exerciseId,
    });

    if (error) {
      setIsAvailable(error.code !== UNDEFINED_TABLE && error.code !== UNDEFINED_FUNCTION);
      setEntries([]);
    } else {
      setIsAvailable(true);
      setEntries(
        ((data as LeaderboardRow[]) ?? []).map((row) => ({
          userId: row.user_id,
          displayName: row.display_name,
          weightLbs: row.weight_lbs,
          reps: row.reps,
          rpe: row.rpe,
          volume: row.volume,
          sets: row.sets,
          isSelf: row.user_id === userId,
        })),
      );
    }
    setIsLoading(false);
  }, [userId, exerciseId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { entries, isLoading, isAvailable };
}
