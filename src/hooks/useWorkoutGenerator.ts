// Orchestrates the rule-based workout generator: pull the trainee's own
// exercise catalog + muscle analytics + personal records, run the pure
// heuristic, and save the result as a PRIVATE workout_templates row the
// trainee owns (RLS already allows any authenticated user to manage
// templates they created — see "Creators can manage their own templates").

import { useCallback, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../lib/supabase';
import {
  suggestWorkout,
  type WorkoutSuggestion,
} from '../lib/generator/suggestWorkout';

export interface UseWorkoutGenerator {
  suggestion: WorkoutSuggestion | null;
  isGenerating: boolean;
  isSaving: boolean;
  error: string | null;
  generate: (targetDays?: number) => Promise<void>;
  save: () => Promise<{ ok: boolean; error?: string }>;
}

export function useWorkoutGenerator(userId: string): UseWorkoutGenerator {
  const [suggestion, setSuggestion] = useState<WorkoutSuggestion | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (targetDays = 3) => {
      setIsGenerating(true);
      setError(null);
      try {
        const [catalogRes, muscleRes, prRes] = await Promise.all([
          supabase.from('exercises').select('id, name, target_muscle_group'),
          supabase.rpc('get_muscle_analytics', { p_user_id: userId }),
          supabase.rpc('get_personal_records', { p_user_id: userId }),
        ]);

        if (catalogRes.error) throw catalogRes.error;
        if (muscleRes.error) throw muscleRes.error;
        if (prRes.error) throw prRes.error;

        const result = suggestWorkout(
          catalogRes.data ?? [],
          muscleRes.data ?? [],
          prRes.data ?? [],
          targetDays,
        );

        if (result.days.length === 0) {
          setError('No exercises in the catalog yet — nothing to suggest.');
          setSuggestion(null);
        } else {
          setSuggestion(result);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not generate a suggestion.');
        setSuggestion(null);
      } finally {
        setIsGenerating(false);
      }
    },
    [userId],
  );

  const save = useCallback(async () => {
    if (!suggestion) return { ok: false, error: 'Nothing to save yet.' };
    setIsSaving(true);
    try {
      for (const day of suggestion.days) {
        const templateId = randomUUID();
        const { error: templateError } = await supabase.from('workout_templates').insert({
          id: templateId,
          creator_id: userId,
          name: `AI Suggested — Day ${day.dayNumber}`,
          week_number: 1,
          day_number: day.dayNumber,
          scope: 'PRIVATE',
        });
        if (templateError) throw templateError;

        const items = day.items.map((item, i) => ({
          id: randomUUID(),
          template_id: templateId,
          exercise_id: item.exerciseId,
          position: i + 1,
          target_sets: item.targetSets,
          target_reps: item.targetReps,
          target_rpe: item.targetRpe,
        }));
        const { error: itemsError } = await supabase.from('template_items').insert(items);
        if (itemsError) throw itemsError;
      }
      return { ok: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not save the suggestion.';
      setError(message);
      return { ok: false, error: message };
    } finally {
      setIsSaving(false);
    }
  }, [suggestion, userId]);

  return { suggestion, isGenerating, isSaving, error, generate, save };
}
