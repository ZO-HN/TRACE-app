import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';
import { emptyWorkout, loadWorkout, type WorkoutSource, type WorkoutState } from '../lib/workout/load';
import type { TemplateItemRow } from '../lib/workout/template';

const source: WorkoutSource = {
  template: async (userId, selectedId) => {
    if (selectedId) {
      const { data, error } = await supabase.from('workout_templates').select('id, name').eq('id', selectedId).eq('is_active', true).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    }
    const { data, error } = await supabase.from('workout_templates').select('id, name').eq('is_active', true)
      .eq('scope', 'ASSIGNED').eq('assigned_trainee_id', userId).order('week_number').order('day_number').limit(1);
    if (error) throw new Error(error.message);
    if (data?.[0]) return data[0];
    const own = await supabase.from('workout_templates').select('id, name').eq('is_active', true)
      .eq('scope', 'PRIVATE').eq('creator_id', userId).order('created_at', { ascending: false }).order('day_number').limit(1);
    if (own.error) throw new Error(own.error.message);
    return own.data?.[0] ?? null;
  },
  items: async (id) => {
    const { data, error } = await supabase.from('template_items')
      .select('position, target_sets, target_reps, target_rpe, exercise:exercises(id, name)').eq('template_id', id);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as TemplateItemRow[];
  },
};

export function useAssignedWorkout(userId: string, selectedId?: string | null) {
  const [state, setState] = useState<{ key: string; value: WorkoutState }>({ key: '', value: emptyWorkout });
  const [attempt, setAttempt] = useState(0);
  const key = `${userId}:${selectedId ?? 'assigned'}`;
  useEffect(() => {
    let cancelled = false;
    setState({ key, value: emptyWorkout });
    void (async () => {
      try {
        const network = await NetInfo.fetch();
        const offline = network.isConnected === false || network.isInternetReachable === false;
        const value = await loadWorkout(source, AsyncStorage, userId, selectedId ?? null, offline);
        if (!cancelled) setState({ key, value });
      } catch {
        if (!cancelled) setState({ key, value: { ...emptyWorkout, status: 'unavailable', error: 'Could not load workout. Please retry.' } });
      }
    })();
    return () => { cancelled = true; };
  }, [key, userId, selectedId, attempt]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { ...(state.key === key ? state.value : emptyWorkout), retry };
}
