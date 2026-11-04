import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { WorkoutTemplateSummary } from '../lib/workout/folders';

export function useWorkoutTemplates(userId: string) {
  const [state, setState] = useState({ owner: userId, templates: [] as WorkoutTemplateSummary[], isLoading: true, error: null as string | null });
  const owner = useRef(userId);
  owner.current = userId;
  const request = useRef(0);

  const refresh = useCallback(async () => {
    const version = ++request.current;
    setState((s) => s.owner === userId ? { ...s, isLoading: true, error: null } : { owner: userId, templates: [], isLoading: true, error: null });
    try {
      const { data, error } = await supabase.from('workout_templates')
        .select('id, name, scope, folder_id, template_items(count)')
        .eq('is_active', true).or(`assigned_trainee_id.eq.${userId},creator_id.eq.${userId}`)
        .order('name', { ascending: true });
      if (error) throw new Error(error.message);
      if (owner.current === userId && request.current === version) {
        setState({ owner: userId, isLoading: false, error: null, templates: (data ?? []).map((row) => ({
          id: row.id, name: row.name, scope: row.scope as WorkoutTemplateSummary['scope'],
          folderId: row.folder_id, exerciseCount: row.template_items?.[0]?.count ?? 0,
        })) });
      }
    } catch (cause) {
      if (owner.current === userId && request.current === version) {
        setState((s) => ({ ...s, isLoading: false, error: cause instanceof Error ? cause.message : 'Could not load workouts.' }));
      }
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
    return () => { ++request.current; };
  }, [refresh]);

  const moveToFolder = useCallback(async (templateId: string, folderId: string | null) => {
    try {
      const { data, error } = await supabase.from('workout_templates')
        .update({ folder_id: folderId }).eq('id', templateId).select('id');
      if (error) throw new Error(error.message);
      if (!data?.length) throw new Error('Workout was not moved. Refresh and try again.');
      if (owner.current === userId) await refresh();
      return { ok: true };
    } catch (cause) {
      return { ok: false, error: cause instanceof Error ? cause.message : 'Could not move workout.' };
    }
  }, [userId, refresh]);

  return {
    templates: state.owner === userId ? state.templates : [],
    isLoading: state.owner !== userId || state.isLoading,
    error: state.owner === userId ? state.error : null,
    refresh, moveToFolder,
  };
}
