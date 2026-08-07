// Loads the trainee's real workout content. With no override, priority
// order is:
//   1. The coach's ASSIGNED template (earliest week/day first).
//   2. The trainee's own most recent self-generated PRIVATE template
//      (see useWorkoutGenerator) — day_number ASC so a multi-day generated
//      split starts at Day 1, most-recently-generated split wins ties.
// Passing overrideTemplateId (e.g. from the "My Workouts" list's Start
// Workout button) skips that resolution and loads that specific template
// instead — still subject to the same is_active/RLS-visible constraints.
// Returns null content when nothing loads (offline / empty DB / not found)
// so the logger can fall back to its hardcoded placeholder.

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

async function findTemplate(userId: string, overrideTemplateId?: string | null) {
  if (overrideTemplateId) {
    const { data: chosen } = await supabase
      .from('workout_templates')
      .select('id, name')
      .eq('id', overrideTemplateId)
      .eq('is_active', true)
      .limit(1);
    if (chosen?.[0]) return chosen[0];
    // Not found/visible under RLS — fall through to normal resolution
    // rather than silently showing nothing.
  }

  const { data: assigned } = await supabase
    .from('workout_templates')
    .select('id, name')
    .eq('is_active', true)
    .eq('scope', 'ASSIGNED')
    .eq('assigned_trainee_id', userId)
    .order('week_number', { ascending: true })
    .order('day_number', { ascending: true })
    .limit(1);

  if (assigned?.[0]) return assigned[0];

  const { data: own } = await supabase
    .from('workout_templates')
    .select('id, name')
    .eq('is_active', true)
    .eq('scope', 'PRIVATE')
    .eq('creator_id', userId)
    .order('day_number', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(1);

  return own?.[0] ?? null;
}

export function useAssignedWorkout(
  userId: string,
  overrideTemplateId?: string | null,
): AssignedWorkout {
  const [workout, setWorkout] = useState<AssignedWorkout>({
    templateId: null,
    templateName: null,
    exercises: null,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const template = await findTemplate(userId, overrideTemplateId);
        if (!template || cancelled) return;

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
  }, [userId, overrideTemplateId]);

  return workout;
}
