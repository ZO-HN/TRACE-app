// Reads/writes training_phases for the signed-in trainee — Tracked's
// goal-based "Roadmap" planner. Table doesn't exist yet
// (docs/migrations-drafts/009_tracked_parity_tier_b.sql); degrades to an
// empty, non-persisted list until applied, same TABLE_MISSING_CODE pattern
// used elsewhere.

import { useCallback, useEffect, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../lib/supabase';
import type { TrainingPhase, TrainingPhaseInsert } from '../lib/roadmaps/types';

const TABLE_MISSING_CODE = '42P01';

export interface UseRoadmaps {
  phases: TrainingPhase[];
  isLoading: boolean;
  isPersisted: boolean;
  createPhase: (input: Omit<TrainingPhaseInsert, 'id' | 'user_id'>) => Promise<{
    ok: boolean;
    error?: string;
  }>;
  deletePhase: (id: string) => Promise<{ ok: boolean; error?: string }>;
}

export function useRoadmaps(userId: string): UseRoadmaps {
  const [phases, setPhases] = useState<TrainingPhase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPersisted, setIsPersisted] = useState(false);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('training_phases')
      .select('id, name, start_date, target_date, target_metric, target_value, notes')
      .eq('user_id', userId)
      .order('start_date', { ascending: false });

    if (error) {
      setIsPersisted(error.code !== TABLE_MISSING_CODE);
      setIsLoading(false);
      return;
    }

    setIsPersisted(true);
    setPhases((data as TrainingPhase[]) ?? []);
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createPhase = useCallback(
    async (input: Omit<TrainingPhaseInsert, 'id' | 'user_id'>) => {
      const payload: TrainingPhaseInsert = { id: randomUUID(), user_id: userId, ...input };
      const { error } = await supabase.from('training_phases').insert(payload);

      if (error) {
        if (error.code === TABLE_MISSING_CODE) {
          setIsPersisted(false);
          return { ok: false, error: 'Roadmaps need a migration applied first.' };
        }
        return { ok: false, error: error.message };
      }

      setIsPersisted(true);
      await refresh();
      return { ok: true };
    },
    [userId, refresh],
  );

  const deletePhase = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('training_phases').delete().eq('id', id);
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    },
    [refresh],
  );

  return { phases, isLoading, isPersisted, createPhase, deletePhase };
}
