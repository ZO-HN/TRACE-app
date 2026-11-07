import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';

export interface ScheduledWorkout { id: string; template_id: string; workout_name: string; scheduled_date: string; revision: number }
function parseRows(value: unknown): ScheduledWorkout[] {
  if (!Array.isArray(value)) throw new Error('Invalid saved calendar. Reload while online.');
  return value.map(row => {
    if (!row || typeof row.id !== 'string' || typeof row.template_id !== 'string' || typeof row.workout_name !== 'string'
      || !/^\d{4}-\d{2}-\d{2}$/.test(row.scheduled_date) || !Number.isInteger(row.revision) || row.revision < 1)
      throw new Error('Invalid saved calendar. Reload while online.');
    return { id: row.id, template_id: row.template_id, workout_name: row.workout_name, scheduled_date: row.scheduled_date, revision: row.revision };
  });
}

export function useCoachSchedule(userId: string, coachId: string | null, from: string, to: string) {
  const key = JSON.stringify([userId, coachId, from, to]);
  const owner = useRef(key); owner.current = key;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ key, rows: [] as ScheduledWorkout[], loading: true, cached: false, error: null as string | null });
  useFocusEffect(useCallback(() => {
    let alive = true;
    const current = () => alive && owner.current === key;
    const cacheKey = `trace:coach-calendar:v1:${key}`;
    setState({ key, rows: [], loading: true, cached: false, error: null });
    void (async () => {
      try {
        if (!coachId) { if (current()) setState({ key, rows: [], loading: false, cached: false, error: null }); return; }
        const connection = await NetInfo.fetch();
        if (connection.isConnected === false || connection.isInternetReachable === false) {
          const raw = await AsyncStorage.getItem(cacheKey);
          if (!raw) throw new Error('Connect to download this week’s schedule. Previously downloaded workouts remain in your library.');
          const entry = JSON.parse(raw);
          if (entry.key !== key) throw new Error('Calendar cache belongs to another selection.');
          const rows = parseRows(entry.rows);
          if (current()) setState({ key, rows, loading: false, cached: true, error: null });
          return;
        }
        const rows: ScheduledWorkout[] = [];
        for (let offset = 0; ; offset += 200) {
          if (!current()) return;
          const result = await supabase.from('coach_calendar_assignments').select('id,template_id,workout_name,scheduled_date,revision')
            .eq('trainee_id', userId).eq('coach_id', coachId).eq('cancelled', false)
            .gte('scheduled_date', from).lte('scheduled_date', to).order('scheduled_date').order('id').range(offset, offset + 199);
          if (result.error) throw new Error(result.error.message);
          rows.push(...parseRows(result.data ?? []));
          if (!result.data || result.data.length < 200) break;
        }
        if (!current()) return;
        // Cache only this account/current coach/range; it is never an online-error fallback.
        await AsyncStorage.setItem(cacheKey, JSON.stringify({ key, rows })).catch(() => undefined);
        if (current()) setState({ key, rows, loading: false, cached: false, error: null });
      } catch (cause) {
        if (current()) setState({ key, rows: [], loading: false, cached: false, error: cause instanceof Error ? cause.message : 'Could not load schedule.' });
      }
    })();
    return () => { alive = false; };
  }, [key, userId, coachId, from, to, attempt]));
  return { ...(state.key === key ? state : { key, rows: [], loading: true, cached: false, error: null }), refresh: () => setAttempt(n => n + 1) };
}
