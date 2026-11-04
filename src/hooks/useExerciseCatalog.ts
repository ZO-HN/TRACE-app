// Loads the exercise catalog from Supabase and exposes a name -> id lookup.
// Offline (or before env config) the fetch fails softly and the logger falls
// back to placeholder ids; queued items retry once real ids are available.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { indexByName, type ExerciseRow, type MuscleRole } from '../lib/workout/catalog';

interface RawExerciseRow {
  id: string;
  name: string;
  target_muscle_group: string | null;
  exercise_muscles: { role: MuscleRole; muscle_group: { id: string; name: string } | null }[] | null;
}

function mapRow(r: RawExerciseRow): ExerciseRow {
  return {
    id: r.id,
    name: r.name,
    target_muscle_group: r.target_muscle_group ?? undefined,
    muscles: (r.exercise_muscles ?? [])
      .filter((m) => m.muscle_group)
      .map((m) => ({ id: m.muscle_group!.id, name: m.muscle_group!.name, role: m.role })),
  };
}

export interface ExerciseCatalog {
  byName: Record<string, string>;
  rows: ExerciseRow[];
  isLoaded: boolean;
  error: string | null;
  retry: () => void;
}

export function useExerciseCatalog(): ExerciseCatalog {
  const [byName, setByName] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<ExerciseRow[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoaded(false);
    setError(null);

    (async () => {
      try {
        const { data, error } = await supabase
          .from('exercises')
          .select('id, name, target_muscle_group, exercise_muscles(role, muscle_group:muscle_groups(id, name))')
          .order('name');
        if (error) throw new Error(error.message);
        if (!cancelled && !error && data) {
          const mapped = (data as unknown as RawExerciseRow[]).map(mapRow);
          setByName(indexByName(mapped));
          setRows(mapped);
          setIsLoaded(true);
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load exercises.');
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { byName, rows, isLoaded, error, retry };
}
