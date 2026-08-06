// Full list of the trainee's workout templates (assigned + self-generated),
// for the "My Workouts" screen — distinct from useAssignedWorkout, which
// only resolves the single "today" template for the Log tab.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { WorkoutTemplateSummary } from '../lib/workout/folders';

interface TemplateRow {
  id: string;
  name: string;
  scope: 'ASSIGNED' | 'PRIVATE';
  folder_id: string | null;
  template_items: { count: number }[];
}

export interface UseWorkoutTemplates {
  templates: WorkoutTemplateSummary[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  moveToFolder: (templateId: string, folderId: string | null) => Promise<{ ok: boolean; error?: string }>;
}

export function useWorkoutTemplates(userId: string): UseWorkoutTemplates {
  const [templates, setTemplates] = useState<WorkoutTemplateSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    // folder_id doesn't exist on workout_templates yet (see
    // docs/migrations-drafts/002_workout_folders.sql) — select it optimistically
    // and fall back to a folder_id-less query if the column is missing.
    let { data, error } = await supabase
      .from('workout_templates')
      .select('id, name, scope, folder_id, template_items(count)')
      .eq('is_active', true)
      .or(`assigned_trainee_id.eq.${userId},creator_id.eq.${userId}`);

    if (error) {
      const fallback = await supabase
        .from('workout_templates')
        .select('id, name, scope, template_items(count)')
        .eq('is_active', true)
        .or(`assigned_trainee_id.eq.${userId},creator_id.eq.${userId}`);
      data =
        (fallback.data as TemplateRow[] | null)?.map((row) => ({ ...row, folder_id: null })) ??
        null;
      error = fallback.error;
    }

    if (error) {
      setTemplates([]);
    } else {
      setTemplates(
        ((data as TemplateRow[]) ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          scope: row.scope,
          folderId: row.folder_id,
          exerciseCount: row.template_items?.[0]?.count ?? 0,
        })),
      );
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const moveToFolder = useCallback(
    async (templateId: string, folderId: string | null) => {
      const { error } = await supabase
        .from('workout_templates')
        .update({ folder_id: folderId })
        .eq('id', templateId);
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    },
    [refresh],
  );

  return { templates, isLoading, refresh, moveToFolder };
}
