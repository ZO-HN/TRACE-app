// Loads the trainee's real workout content: their coach's assigned template
// and its items. Returns null content when nothing loads (offline / empty
// DB / not yet assigned) so the logger can fall back to a placeholder.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  templateToExercises,
  type LoggerExercise,
  type TemplateItemRow,
} from '../lib/workout/template';

export interface AssignedWorkout {
  templateId: string | null;
  templateName: string | null;
  exercises: LoggerExercise[] | null;
}

export function useAssignedWorkout(userId: string): AssignedWorkout {
  const [workout, setWorkout] = useState<AssignedWorkout>({
    templateId: null,
    templateName: null,
    exercises: null,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: templates, error: templateError } = await supabase
          .from('workout_templates')
          .select('id, name')
          .eq('is_active', true)
          .eq('scope', 'ASSIGNED')
          .eq('assigned_trainee_id', userId)
          .order('week_number', { ascending: true })
          .order('day_number', { ascending: true })
          .limit(1);

        const template = templates?.[0];
        if (templateError || !template || cancelled) return;

        const { data: items, error: itemsError } = await supabase
          .from('template_items')
          .select('position, target_sets, target_reps, target_rpe, exercise:exercises(id, name)')
          .eq('template_id', template.id);

        if (itemsError || !items?.length || cancelled) return;

        setWorkout({
          templateId: template.id,
          templateName: template.name,
          exercises: templateToExercises(items as unknown as TemplateItemRow[]),
        });
      } catch {
        // Offline / unapplied schema — leave nulls; logger uses its fallback.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return workout;
}
