// CRUD for the trainee's own periodized programs — see
// docs/migrations-drafts/010_workout_programs.sql. Degrades gracefully
// (isSupported: false) until that migration is applied, same pattern as
// useWorkoutFolders.

import { useCallback, useEffect, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../lib/supabase';
import type { Program, ProgramInput, SplitType } from '../lib/programs/types';

const TABLE_MISSING_CODE = '42P01';
const UNDEFINED_COLUMN = '42703';

interface ProgramRow {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  split_type: SplitType;
  total_weeks: number;
  created_at: string;
  share_token: string | null;
  program_days: {
    id: string;
    week_number: number;
    day_of_week: number;
    workout_template_id: string | null;
    notes: string | null;
    workout_template: { name: string } | null;
  }[];
}

function fromRow(row: ProgramRow): Program {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    splitType: row.split_type,
    totalWeeks: row.total_weeks,
    createdAt: row.created_at,
    shareToken: row.share_token ?? null,
    days: (row.program_days ?? [])
      .map((d) => ({
        id: d.id,
        weekNumber: d.week_number,
        dayOfWeek: d.day_of_week,
        workoutTemplateId: d.workout_template_id,
        workoutTemplateName: d.workout_template?.name ?? null,
        notes: d.notes,
      }))
      .sort((a, b) => a.weekNumber - b.weekNumber || a.dayOfWeek - b.dayOfWeek),
  };
}

export interface UsePrograms {
  programs: Program[];
  isLoading: boolean;
  isSupported: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createProgram: (input: ProgramInput) => Promise<{ ok: boolean; error?: string; programId?: string }>;
  deleteProgram: (id: string) => Promise<{ ok: boolean; error?: string }>;
  generateShareLink: (
    programId: string,
    existingToken: string | null,
  ) => Promise<{ ok: true; token: string } | { ok: false; error: string }>;
}

export function usePrograms(userId: string): UsePrograms {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const DAYS_SELECT =
      'program_days(id, week_number, day_of_week, workout_template_id, notes, workout_template:workout_templates(name))';

    // share_token is a later migration (012) on top of the base program
    // tables (010) — select it optimistically and fall back without it so
    // this screen keeps working with just 010 applied.
    let data: unknown;
    let fetchError: { message: string; code?: string } | null;
    ({ data, error: fetchError } = await supabase
      .from('workout_programs')
      .select(`id, name, description, category, split_type, total_weeks, created_at, share_token, ${DAYS_SELECT}`)
      .eq('owner_id', userId)
      .order('created_at', { ascending: false }));

    if (fetchError?.code === UNDEFINED_COLUMN) {
      ({ data, error: fetchError } = await supabase
        .from('workout_programs')
        .select(`id, name, description, category, split_type, total_weeks, created_at, ${DAYS_SELECT}`)
        .eq('owner_id', userId)
        .order('created_at', { ascending: false }));
    }

    if (fetchError) {
      setIsSupported(fetchError.code !== TABLE_MISSING_CODE);
      setError(fetchError.code === TABLE_MISSING_CODE ? null : fetchError.message);
      setPrograms([]);
    } else {
      setIsSupported(true);
      setError(null);
      setPrograms(((data as unknown as ProgramRow[]) ?? []).map(fromRow));
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createProgram = useCallback(
    async (input: ProgramInput) => {
      const trimmedName = input.name.trim();
      if (!trimmedName) return { ok: false, error: 'Program name is required.' };

      const programId = randomUUID();
      const { error: insertError } = await supabase.from('workout_programs').insert({
        id: programId,
        owner_id: userId,
        name: trimmedName,
        description: input.description.trim() || null,
        category: input.category || null,
        split_type: input.splitType,
        total_weeks: input.totalWeeks,
      });
      if (insertError) return { ok: false, error: insertError.message };

      const dayRows = [];
      for (let week = 1; week <= input.totalWeeks; week++) {
        for (let day = 1; day <= 7; day++) {
          const workoutTemplateId = input.weeklyPattern[day - 1];
          if (!workoutTemplateId) continue; // rest day — no row needed
          dayRows.push({
            id: randomUUID(),
            program_id: programId,
            week_number: week,
            day_of_week: day,
            workout_template_id: workoutTemplateId,
          });
        }
      }
      if (dayRows.length > 0) {
        const { error: daysError } = await supabase.from('program_days').insert(dayRows);
        if (daysError) return { ok: false, error: daysError.message };
      }

      await refresh();
      return { ok: true, programId };
    },
    [userId, refresh],
  );

  const deleteProgram = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase.from('workout_programs').delete().eq('id', id);
      if (deleteError) return { ok: false, error: deleteError.message };
      await refresh();
      return { ok: true };
    },
    [refresh],
  );

  /** Generates (or returns the existing) share token for a program — see
   * docs/migrations-drafts/012_program_sharing.sql. Requires that
   * migration; not just 010. */
  const generateShareLink = useCallback(
    async (programId: string, existingToken: string | null) => {
      if (existingToken) return { ok: true as const, token: existingToken };
      const token = randomUUID();
      const { error: updateError } = await supabase
        .from('workout_programs')
        .update({ share_token: token })
        .eq('id', programId);
      if (updateError) return { ok: false as const, error: updateError.message };
      await refresh();
      return { ok: true as const, token };
    },
    [refresh],
  );

  return { programs, isLoading, isSupported, error, refresh, createProgram, deleteProgram, generateShareLink };
}
