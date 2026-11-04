import { useCallback, useEffect, useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../lib/supabase';
import type { WorkoutFolder } from '../lib/workout/folders';

export function useWorkoutFolders(userId: string) {
  const [state, setState] = useState({ owner: userId, folders: [] as WorkoutFolder[], isLoading: true, error: null as string | null });
  const owner = useRef(userId);
  owner.current = userId;
  const request = useRef(0);

  const refresh = useCallback(async () => {
    const version = ++request.current;
    setState((s) => s.owner === userId ? { ...s, isLoading: true, error: null } : { owner: userId, folders: [], isLoading: true, error: null });
    try {
      const { data, error } = await supabase.from('workout_folders')
        .select('id, name').eq('user_id', userId).order('name', { ascending: true });
      if (error) throw new Error(error.message);
      if (owner.current === userId && request.current === version) {
        setState({ owner: userId, folders: data ?? [], isLoading: false, error: null });
      }
    } catch (cause) {
      if (owner.current === userId && request.current === version) {
        setState((s) => ({ ...s, isLoading: false, error: cause instanceof Error ? cause.message : 'Could not load folders.' }));
      }
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
    return () => { ++request.current; };
  }, [refresh]);

  const save = useCallback(async (operation: 'create' | 'rename' | 'delete', id: string, name = '') => {
    const trimmed = name.trim();
    if (operation !== 'delete' && !trimmed) return { ok: false, error: 'Folder name is required.' };
    if (trimmed.length > 80) return { ok: false, error: 'Folder name must be 80 characters or fewer.' };
    try {
      const table = supabase.from('workout_folders');
      const query = operation === 'create'
        ? table.insert({ id, user_id: userId, name: trimmed })
        : operation === 'rename'
          ? table.update({ name: trimmed }).eq('id', id).eq('user_id', userId)
          : table.delete().eq('id', id).eq('user_id', userId);
      const { data, error } = await query.select('id');
      if (error) throw new Error(error.message);
      if (!data?.length) throw new Error('Folder was not changed. Refresh and try again.');
      if (owner.current === userId) await refresh();
      return { ok: true };
    } catch (cause) {
      return { ok: false, error: cause instanceof Error ? cause.message : 'Could not save folder.' };
    }
  }, [userId, refresh]);

  return {
    folders: state.owner === userId ? state.folders : [],
    isLoading: state.owner !== userId || state.isLoading,
    error: state.owner === userId ? state.error : null,
    refresh,
    createFolder: (name: string) => save('create', randomUUID(), name),
    renameFolder: (id: string, name: string) => save('rename', id, name),
    deleteFolder: (id: string) => save('delete', id),
  };
}
