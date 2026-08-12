// Training volume grouped by muscle over a trailing window.
//
// Computed client-side from set_logs -> exercises -> exercise_muscles ->
// muscle_groups instead of the get_muscle_analytics RPC, which only ever
// grouped by the legacy flat exercises.target_muscle_group column (a
// server-side SQL function — fixing it in place would need a migration,
// out of scope for this repo). Per-muscle rows give primary muscles full
// volume/set credit and secondary muscles half volume credit (still a full
// set), so secondary muscles tagged on the dashboard become visible here.
// Exercises with no exercise_muscles rows yet fall back to the flat column,
// so nothing regresses for untagged exercises.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { MuscleRole } from '../lib/workout/catalog';

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

interface SetLogRow {
  weight_kg: number | null;
  reps: number | null;
  is_warmup?: boolean | null;
  exercise: {
    target_muscle_group: string | null;
    exercise_muscles: { role: MuscleRole; muscle_group: { name: string } | null }[] | null;
  } | null;
}

const SECONDARY_VOLUME_WEIGHT = 0.5;

function aggregate(rows: SetLogRow[]): MuscleAnalyticsRow[] {
  const byMuscle = new Map<string, { volume: number; sets: number }>();

  const credit = (name: string | null | undefined, volume: number) => {
    if (!name) return;
    const entry = byMuscle.get(name) ?? { volume: 0, sets: 0 };
    entry.volume += volume;
    entry.sets += 1;
    byMuscle.set(name, entry);
  };

  for (const row of rows) {
    if (row.is_warmup) continue; // warm-up sets don't count toward training volume
    const volume = (row.weight_kg ?? 0) * (row.reps ?? 0);
    const muscles = row.exercise?.exercise_muscles?.filter((m) => m.muscle_group) ?? [];
    if (muscles.length > 0) {
      for (const m of muscles) {
        credit(m.muscle_group!.name, m.role === 'secondary' ? volume * SECONDARY_VOLUME_WEIGHT : volume);
      }
    } else {
      credit(row.exercise?.target_muscle_group, volume);
    }
  }

  return Array.from(byMuscle.entries())
    .map(([target_muscle_group, { volume, sets }]) => ({
      target_muscle_group,
      total_volume_kg: volume,
      total_sets: sets,
    }))
    .sort((a, b) => b.total_volume_kg - a.total_volume_kg);
}

export function useMuscleAnalytics(userId: string, days = 30): UseMuscleAnalytics {
  const [rows, setRows] = useState<MuscleAnalyticsRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data: sessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', userId)
        .gte('completed_at', cutoff);
      if (cancelled) return;
      if (sessionsError) {
        setError(sessionsError.message);
        setIsLoading(false);
        return;
      }

      const sessionIds = (sessions ?? []).map((s: { id: string }) => s.id);
      if (sessionIds.length === 0) {
        setError(null);
        setRows([]);
        setIsLoading(false);
        return;
      }

      // is_warmup is a draft column (008_tracked_parity_tier_a.sql) — not
      // live yet everywhere. Try selecting it; on "column does not exist"
      // (42703), retry without it so the screen keeps working pre-migration.
      const UNDEFINED_COLUMN = '42703';
      let data: unknown;
      let setLogsError: { message: string; code?: string } | null;
      ({ data, error: setLogsError } = await supabase
        .from('set_logs')
        .select(
          'weight_kg, reps, is_warmup, exercise:exercises(target_muscle_group, exercise_muscles(role, muscle_group:muscle_groups(name)))',
        )
        .in('session_id', sessionIds));
      if (setLogsError?.code === UNDEFINED_COLUMN) {
        ({ data, error: setLogsError } = await supabase
          .from('set_logs')
          .select(
            'weight_kg, reps, exercise:exercises(target_muscle_group, exercise_muscles(role, muscle_group:muscle_groups(name)))',
          )
          .in('session_id', sessionIds));
      }
      if (cancelled) return;
      if (setLogsError) setError(setLogsError.message);
      else {
        setError(null);
        setRows(aggregate((data as unknown as SetLogRow[]) ?? []));
      }
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, days]);

  return { rows, isLoading, error };
}
