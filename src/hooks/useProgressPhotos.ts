// Reads/writes progress_photos for the signed-in trainee. Table doesn't
// exist yet (docs/migrations-drafts/009_tracked_parity_tier_b.sql) —
// degrades to an empty, non-persisted list until applied, same
// TABLE_MISSING_CODE pattern as useBodyweightSettings/useWaterLogs.
//
// The R2 object key itself is uploaded via useMediaUpload's 'progress-photo'
// kind before calling add() here — see AGENTS.md's media policy note and
// the cross-repo caveat on that MediaKind value.

import { useCallback, useEffect, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../lib/supabase';
import type { ProgressPhoto, ProgressPhotoInsert } from '../lib/progressPhotos/types';

const TABLE_MISSING_CODE = '42P01';

export interface UseProgressPhotos {
  photos: ProgressPhoto[];
  isLoading: boolean;
  isPersisted: boolean;
  add: (
    photoS3Key: string,
    takenDate: string,
    note?: string,
  ) => Promise<{ ok: boolean; error?: string }>;
}

export function useProgressPhotos(userId: string): UseProgressPhotos {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPersisted, setIsPersisted] = useState(false);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('progress_photos')
      .select('id, taken_date, photo_s3_key, note, created_at')
      .eq('user_id', userId)
      .order('taken_date', { ascending: false });

    if (error) {
      setIsPersisted(error.code !== TABLE_MISSING_CODE);
      setIsLoading(false);
      return;
    }

    setIsPersisted(true);
    setPhotos((data as ProgressPhoto[]) ?? []);
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const add = useCallback(
    async (photoS3Key: string, takenDate: string, note?: string) => {
      const payload: ProgressPhotoInsert = {
        id: randomUUID(),
        user_id: userId,
        taken_date: takenDate,
        photo_s3_key: photoS3Key,
        note: note ?? null,
      };
      const { error } = await supabase.from('progress_photos').insert(payload);

      if (error) {
        if (error.code === TABLE_MISSING_CODE) {
          setIsPersisted(false);
          return { ok: false, error: 'Progress photos need a migration applied first.' };
        }
        return { ok: false, error: error.message };
      }

      setIsPersisted(true);
      await refresh();
      return { ok: true };
    },
    [userId, refresh],
  );

  return { photos, isLoading, isPersisted, add };
}
