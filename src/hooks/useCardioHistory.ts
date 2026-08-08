// All of the trainee's cardio entries (any exercise) since `sinceDate` —
// read-only, feeds the Cardio overview's weekly chart / this-week stats /
// PRs / recent days. Degrades to an empty list until cardio_entries
// exists — see docs/migrations-drafts/005_cardio_tracking.sql.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { CardioEntry } from '../lib/cardio/types';

interface EntryRow {
  id: string;
  cardio_exercise_id: string;
  entry_date: string;
  duration_seconds: number;
}

export interface UseCardioHistory {
  entries: CardioEntry[];
  isLoading: boolean;
  isSupported: boolean;
}

export function useCardioHistory(userId: string, sinceDate: string): UseCardioHistory {
  const [entries, setEntries] = useState<CardioEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data, error } = await supabase
        .from('cardio_entries')
        .select('id, cardio_exercise_id, entry_date, duration_seconds')
        .eq('user_id', userId)
        .gte('entry_date', sinceDate);

      if (!isMounted) return;
      if (error) {
        setIsSupported(error.code !== '42P01');
        setEntries([]);
      } else {
        setIsSupported(true);
        setEntries(
          ((data as EntryRow[]) ?? []).map((row) => ({
            id: row.id,
            cardioExerciseId: row.cardio_exercise_id,
            entryDate: row.entry_date,
            durationSeconds: row.duration_seconds,
          })),
        );
      }
      setIsLoading(false);
    })();
    return () => {
      isMounted = false;
    };
  }, [userId, sinceDate]);

  return { entries, isLoading, isSupported };
}
