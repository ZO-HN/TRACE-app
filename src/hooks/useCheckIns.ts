// Trainee's own check_ins — submit answers against an assigned template, and
// read back past submissions (including status/coach_notes once reviewed).
// Insert-and-read-own only per RLS; review is coach-only. Mirrors the
// insert/RLS/trigger shape of useFormChecks.ts: coach_id is stamped
// server-side by a BEFORE INSERT trigger (trg_set_check_in_coach_id) — never
// set it here.

import { useCallback, useEffect, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../lib/supabase';
import type { CheckIn, CheckInResponses, CheckInStatus } from '../lib/checkins/types';

interface CheckInRow {
  id: string;
  template_id: string | null;
  status: CheckInStatus;
  responses: CheckInResponses | null;
  coach_notes: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  template: { name: string } | null;
}

function fromRow(row: CheckInRow): CheckIn {
  return {
    id: row.id,
    templateId: row.template_id,
    templateName: row.template?.name ?? null,
    status: row.status,
    responses: row.responses ?? {},
    coachNotes: row.coach_notes,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
  };
}

export interface UseCheckIns {
  checkIns: CheckIn[];
  isLoading: boolean;
  error: string | null;
  submit: (templateId: string, responses: CheckInResponses) => Promise<{ ok: boolean; error?: string }>;
}

export function useCheckIns(userId: string): UseCheckIns {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('check_ins')
      .select(
        'id, template_id, status, responses, coach_notes, submitted_at, reviewed_at, template:check_in_templates(name)',
      )
      .eq('client_id', userId)
      .order('submitted_at', { ascending: false, nullsFirst: false });

    if (fetchError) setError(fetchError.message);
    else {
      setError(null);
      setCheckIns(((data as unknown as CheckInRow[]) ?? []).map(fromRow));
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const submit = useCallback(
    async (templateId: string, responses: CheckInResponses) => {
      const { error: insertError } = await supabase.from('check_ins').insert({
        id: randomUUID(),
        client_id: userId,
        template_id: templateId,
        status: 'submitted',
        responses,
        submitted_at: new Date().toISOString(),
      });
      if (insertError) return { ok: false, error: insertError.message };
      await refresh();
      return { ok: true };
    },
    [userId, refresh],
  );

  return { checkIns, isLoading, error, submit };
}
