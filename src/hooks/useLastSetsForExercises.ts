// Most recent logged (non-warmup, completed) set per exercise, batched
// across every exercise in the active workout — feeds predictNextSet's
// cross-session reference (see src/lib/workout/suggestNextSet.ts). One
// query for the whole session's exercise list instead of one per exercise.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { LastSetForExercise } from '../lib/workout/suggestNextSet';

interface SetLogRow {
  exercise_id: string;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  set_number: number;
  is_warmup?: boolean | null;
  session: { completed_at: string | null } | null;
}

export type LastSetMap = Record<string, LastSetForExercise>;

function pickMostRecentPerExercise(rows: SetLogRow[]): LastSetMap {
  const best = new Map<string, { row: SetLogRow; sortKey: string }>();
  for (const row of rows) {
    if (row.is_warmup) continue;
    if (row.weight_kg == null || row.reps == null) continue;
    const sortKey = `${row.session?.completed_at ?? ''}#${String(row.set_number).padStart(4, '0')}`;
    const current = best.get(row.exercise_id);
    if (!current || sortKey > current.sortKey) {
      best.set(row.exercise_id, { row, sortKey });
    }
  }
  const map: LastSetMap = {};
  for (const [exerciseId, { row }] of best) {
    map[exerciseId] = { weight_kg: row.weight_kg as number, reps: row.reps as number, rpe: row.rpe };
  }
  return map;
}

export function useLastSetsForExercises(userId: string, exerciseIds: string[]): LastSetMap {
  const [map, setMap] = useState<LastSetMap>({});
  const key = exerciseIds.join(',');

  useEffect(() => {
    if (!key) {
      setMap({});
      return;
    }
    let cancelled = false;

    (async () => {
      const ids = key.split(',');
      const UNDEFINED_COLUMN = '42703';
      let data: unknown;
      let fetchError: { message: string; code?: string } | null;

      ({ data, error: fetchError } = await supabase
        .from('set_logs')
        .select('exercise_id, weight_kg, reps, rpe, set_number, is_warmup, session:workout_sessions!inner(completed_at, user_id)')
        .in('exercise_id', ids)
        .eq('session.user_id', userId)
        .eq('is_completed', true));

      if (fetchError?.code === UNDEFINED_COLUMN) {
        ({ data, error: fetchError } = await supabase
          .from('set_logs')
          .select('exercise_id, weight_kg, reps, rpe, set_number, session:workout_sessions!inner(completed_at, user_id)')
          .in('exercise_id', ids)
          .eq('session.user_id', userId)
          .eq('is_completed', true));
      }

      if (cancelled) return;
      if (!fetchError && data) {
        setMap(pickMostRecentPerExercise(data as unknown as SetLogRow[]));
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, key]);

  return map;
}
