// User-created cardio exercise catalog (e.g. "Treadmill", "cycling").
// Direct writes — catalog/setup action, not offline-critical. Degrades to
// an empty list until cardio_exercises exists — see
// docs/migrations-drafts/005_cardio_tracking.sql.

import { useCallback, useEffect, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../lib/supabase';
import type { CardioExercise } from '../lib/cardio/types';

const TABLE_MISSING_CODE = '42P01';

export interface UseCardioExercises {
  exercises: CardioExercise[];
  isLoading: boolean;
  isSupported: boolean;
  createExercise: (name: string) => Promise<{ ok: boolean; error?: string; exercise?: CardioExercise }>;
}

export function useCardioExercises(userId: string): UseCardioExercises {
  const [exercises, setExercises] = useState<CardioExercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupported, setIsSupported] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('cardio_exercises')
      .select('id, name')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) {
      setIsSupported(error.code !== TABLE_MISSING_CODE);
      setExercises([]);
    } else {
      setIsSupported(true);
      setExercises((data as CardioExercise[]) ?? []);
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createExercise = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return { ok: false, error: 'Exercise name is required.' };
      const exercise: CardioExercise = { id: randomUUID(), name: trimmed };
      const { error } = await supabase
        .from('cardio_exercises')
        .insert({ id: exercise.id, user_id: userId, name: trimmed });
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true, exercise };
    },
    [userId, refresh],
  );

  return { exercises, isLoading, isSupported, createExercise };
}
