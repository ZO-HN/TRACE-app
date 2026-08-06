// Folder CRUD for "My Workouts". Low-frequency, organizational writes —
// direct Supabase calls, not outbox-eligible (same reasoning as bodyweight
// settings). Degrades gracefully if workout_folders doesn't exist yet (see
// docs/migrations-drafts/002_workout_folders.sql).

import { useCallback, useEffect, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../lib/supabase';
import type { WorkoutFolder } from '../lib/workout/folders';

const TABLE_MISSING_CODE = '42P01';

export interface UseWorkoutFolders {
  folders: WorkoutFolder[];
  isLoading: boolean;
  isSupported: boolean;
  createFolder: (name: string) => Promise<{ ok: boolean; error?: string }>;
  renameFolder: (id: string, name: string) => Promise<{ ok: boolean; error?: string }>;
  deleteFolder: (id: string) => Promise<{ ok: boolean; error?: string }>;
}

export function useWorkoutFolders(userId: string): UseWorkoutFolders {
  const [folders, setFolders] = useState<WorkoutFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupported, setIsSupported] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('workout_folders')
      .select('id, name')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) {
      setIsSupported(error.code !== TABLE_MISSING_CODE);
      setFolders([]);
    } else {
      setIsSupported(true);
      setFolders((data as WorkoutFolder[]) ?? []);
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createFolder = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return { ok: false, error: 'Folder name is required.' };
      const { error } = await supabase
        .from('workout_folders')
        .insert({ id: randomUUID(), user_id: userId, name: trimmed });
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    },
    [userId, refresh],
  );

  const renameFolder = useCallback(
    async (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return { ok: false, error: 'Folder name is required.' };
      const { error } = await supabase.from('workout_folders').update({ name: trimmed }).eq('id', id);
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    },
    [refresh],
  );

  const deleteFolder = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('workout_folders').delete().eq('id', id);
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    },
    [refresh],
  );

  return { folders, isLoading, isSupported, createFolder, renameFolder, deleteFolder };
}
