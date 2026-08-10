// Trainee's own form_checks — submit a video for coach review, and read
// back past submissions (including status/coach_notes once reviewed).
// Insert-and-read-own only per RLS; review is coach-only (the coach
// dashboard's own useFormChecks.markReviewed, not this one) — see
// docs/client-app-handoff-2026-08-10.md §4 in the coach-dashboard repo.

import { useCallback, useEffect, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../lib/supabase';
import type { FormCheck, FormCheckStatus } from '../lib/formChecks/types';

interface FormCheckRow {
  id: string;
  exercise_id: string | null;
  video_key: string;
  status: FormCheckStatus;
  coach_notes: string | null;
  submitted_at: string;
  exercise: { name: string } | null;
}

function fromRow(row: FormCheckRow): FormCheck {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    exerciseName: row.exercise?.name ?? null,
    videoKey: row.video_key,
    status: row.status,
    coachNotes: row.coach_notes,
    submittedAt: row.submitted_at,
  };
}

export interface UseFormChecks {
  formChecks: FormCheck[];
  isLoading: boolean;
  error: string | null;
  /** Does NOT upload the video — pass an already-uploaded R2 key (see useMediaUpload). */
  submit: (videoKey: string, exerciseId?: string | null) => Promise<{ ok: boolean; error?: string }>;
}

export function useFormChecks(userId: string): UseFormChecks {
  const [formChecks, setFormChecks] = useState<FormCheck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('form_checks')
      .select('id, exercise_id, video_key, status, coach_notes, submitted_at, exercise:exercises(name)')
      .eq('client_id', userId)
      .order('submitted_at', { ascending: false });

    if (fetchError) setError(fetchError.message);
    else {
      setError(null);
      setFormChecks(((data as unknown as FormCheckRow[]) ?? []).map(fromRow));
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const submit = useCallback(
    async (videoKey: string, exerciseId?: string | null) => {
      // coach_id is stamped server-side by a BEFORE INSERT trigger — never
      // set it here (and the insert is rejected if the trainee has no
      // coach assigned yet).
      const { error: insertError } = await supabase.from('form_checks').insert({
        id: randomUUID(),
        client_id: userId,
        exercise_id: exerciseId ?? null,
        video_key: videoKey,
      });
      if (insertError) return { ok: false, error: insertError.message };
      await refresh();
      return { ok: true };
    },
    [userId, refresh],
  );

  return { formChecks, isLoading, error, submit };
}
