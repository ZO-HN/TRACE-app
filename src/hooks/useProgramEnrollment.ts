// Enroll in / track progress through a program. One row per attempt (see
// docs/migrations-drafts/010_workout_programs.sql) — re-running a program
// creates a new enrollment rather than resetting the old one, preserving
// history of every pass.

import { useCallback, useEffect, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../lib/supabase';
import type { ProgramEnrollment } from '../lib/programs/types';

const TABLE_MISSING_CODE = '42P01';

interface EnrollmentRow {
  id: string;
  program_id: string;
  started_at: string;
  completed_at: string | null;
  current_week: number;
  current_day: number;
}

function fromRow(row: EnrollmentRow): ProgramEnrollment {
  return {
    id: row.id,
    programId: row.program_id,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    currentWeek: row.current_week,
    currentDay: row.current_day,
  };
}

export interface UseProgramEnrollment {
  enrollments: ProgramEnrollment[];
  isLoading: boolean;
  isSupported: boolean;
  enroll: (programId: string) => Promise<{ ok: boolean; error?: string }>;
  advance: (enrollmentId: string, totalWeeks: number) => Promise<{ ok: boolean; error?: string }>;
}

export function useProgramEnrollment(userId: string): UseProgramEnrollment {
  const [enrollments, setEnrollments] = useState<ProgramEnrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupported, setIsSupported] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('program_enrollments')
      .select('id, program_id, started_at, completed_at, current_week, current_day')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    if (error) {
      setIsSupported(error.code !== TABLE_MISSING_CODE);
      setEnrollments([]);
    } else {
      setIsSupported(true);
      setEnrollments(((data as EnrollmentRow[]) ?? []).map(fromRow));
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enroll = useCallback(
    async (programId: string) => {
      const { error } = await supabase.from('program_enrollments').insert({
        id: randomUUID(),
        program_id: programId,
        user_id: userId,
      });
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    },
    [userId, refresh],
  );

  /** Moves an enrollment forward one day, rolling into the next week and
   * marking complete once the program's last day is passed. */
  const advance = useCallback(
    async (enrollmentId: string, totalWeeks: number) => {
      const current = enrollments.find((e) => e.id === enrollmentId);
      if (!current) return { ok: false, error: 'Enrollment not found.' };

      const isLastDay = current.currentDay >= 7;
      const nextDay = isLastDay ? 1 : current.currentDay + 1;
      const nextWeek = isLastDay ? current.currentWeek + 1 : current.currentWeek;
      const isDone = nextWeek > totalWeeks;

      const { error } = await supabase
        .from('program_enrollments')
        .update({
          current_day: isDone ? current.currentDay : nextDay,
          current_week: isDone ? current.currentWeek : nextWeek,
          completed_at: isDone ? new Date().toISOString() : null,
        })
        .eq('id', enrollmentId);
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    },
    [enrollments, refresh],
  );

  return { enrollments, isLoading, isSupported, enroll, advance };
}
