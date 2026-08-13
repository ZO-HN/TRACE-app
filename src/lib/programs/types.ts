// Maps to public.workout_programs / program_days / program_enrollments —
// see docs/migrations-drafts/010_workout_programs.sql. Not live yet; hooks
// degrade gracefully (isSupported: false) until that migration is applied.

export type SplitType = 'full_body' | 'ppl' | 'upper_lower' | 'bro_split' | 'custom';

export const SPLIT_TEMPLATES: { value: SplitType; label: string; days: string[] }[] = [
  { value: 'full_body', label: 'Full Body', days: ['Full Body', 'Rest', 'Full Body', 'Rest', 'Full Body', 'Rest', 'Rest'] },
  { value: 'ppl', label: 'Push / Pull / Legs', days: ['Push', 'Pull', 'Legs', 'Rest', 'Push', 'Pull', 'Legs'] },
  { value: 'upper_lower', label: 'Upper / Lower', days: ['Upper', 'Lower', 'Rest', 'Upper', 'Lower', 'Rest', 'Rest'] },
  { value: 'bro_split', label: 'Bro Split', days: ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Rest', 'Rest'] },
  { value: 'custom', label: 'Custom', days: ['Rest', 'Rest', 'Rest', 'Rest', 'Rest', 'Rest', 'Rest'] },
];

export interface ProgramDay {
  id: string;
  weekNumber: number;
  dayOfWeek: number;
  workoutTemplateId: string | null;
  workoutTemplateName: string | null;
  notes: string | null;
}

export interface Program {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  splitType: SplitType;
  totalWeeks: number;
  createdAt: string;
  days: ProgramDay[];
}

export interface ProgramInput {
  name: string;
  description: string;
  category: string;
  splitType: SplitType;
  totalWeeks: number;
  /** One entry per day-of-week (1-7), null = rest day. Repeated across every week. */
  weeklyPattern: (string | null)[];
}

export interface ProgramEnrollment {
  id: string;
  programId: string;
  startedAt: string;
  completedAt: string | null;
  currentWeek: number;
  currentDay: number;
}

export const PROGRAM_CATEGORIES = [
  'Bodybuilding',
  'Powerlifting',
  'Olympic Lifting',
  'Strongman',
  'CrossFit',
  'General Fitness',
  'Endurance',
  'Sport-Specific',
];

/** Progress percentage through an enrollment, 0-100. */
export function enrollmentProgressPct(enrollment: ProgramEnrollment, totalWeeks: number): number {
  if (totalWeeks <= 0) return 0;
  if (enrollment.completedAt) return 100;
  const totalDays = totalWeeks * 7;
  const daysElapsed = (enrollment.currentWeek - 1) * 7 + (enrollment.currentDay - 1);
  return Math.max(0, Math.min(100, Math.round((daysElapsed / totalDays) * 100)));
}
