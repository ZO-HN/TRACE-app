// Cardio entries for one exercise on one day (the per-exercise entry
// screen). Direct writes, degrades to an empty list until cardio_entries
// exists — see docs/migrations-drafts/005_cardio_tracking.sql.

import { useCallback, useEffect, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../lib/supabase';
import type { CardioEntry } from '../lib/cardio/types';

interface EntryRow {
  id: string;
  cardio_exercise_id: string;
  entry_date: string;
  duration_seconds: number;
}

function fromRow(row: EntryRow): CardioEntry {
  return {
    id: row.id,
    cardioExerciseId: row.cardio_exercise_id,
    entryDate: row.entry_date,
    durationSeconds: row.duration_seconds,
  };
}

export interface UseCardioEntries {
  entries: CardioEntry[];
  isLoading: boolean;
  addEntry: (durationSeconds: number) => Promise<{ ok: boolean; error?: string }>;
  deleteEntry: (id: string) => Promise<{ ok: boolean; error?: string }>;
}

export function useCardioEntries(
  userId: string,
  exerciseId: string,
  date: string,
): UseCardioEntries {
  const [entries, setEntries] = useState<CardioEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('cardio_entries')
      .select('id, cardio_exercise_id, entry_date, duration_seconds')
      .eq('user_id', userId)
      .eq('cardio_exercise_id', exerciseId)
      .eq('entry_date', date)
      .order('created_at', { ascending: true });

    setEntries(error ? [] : ((data as EntryRow[]) ?? []).map(fromRow));
    setIsLoading(false);
  }, [userId, exerciseId, date]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addEntry = useCallback(
    async (durationSeconds: number) => {
      const { error } = await supabase.from('cardio_entries').insert({
        id: randomUUID(),
        user_id: userId,
        cardio_exercise_id: exerciseId,
        entry_date: date,
        duration_seconds: durationSeconds,
      });
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    },
    [userId, exerciseId, date, refresh],
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('cardio_entries').delete().eq('id', id);
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    },
    [refresh],
  );

  return { entries, isLoading, addEntry, deleteEntry };
}
