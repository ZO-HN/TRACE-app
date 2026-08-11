// Maps to public.check_in_templates / public.check_ins — see the coach
// dashboard repo's src/hooks/useCheckInTemplates.ts / useCheckIns.ts for the
// authoring side. Templates are coach-authored, JSONB `questions` array;
// trainees submit answers as a single JSONB `responses` column keyed by
// question id (not one row per answer).
//
// The dashboard's CheckInQuestion type has no `options` field for
// single-choice/multiple-choice — this client parses `placeholder` as a
// comma-separated option list for those two types (agreed workaround until
// the dashboard defines a real options schema).

export type CheckInQuestionType =
  | 'text'
  | 'number'
  | 'scale-5'
  | 'scale-10'
  | 'single-choice'
  | 'multiple-choice'
  | 'photo'
  | 'time'
  | 'bodyweight'
  | 'progress-photo'
  | 'measurement';

export interface CheckInQuestion {
  id: string;
  label: string;
  type: CheckInQuestionType;
  required?: boolean;
  placeholder?: string;
}

export type CheckInFrequency =
  | 'Daily'
  | 'Weekly'
  | 'Every two weeks'
  | 'Custom schedule'
  | 'Monthly'
  | 'On-demand only';

export interface CheckInSchedule {
  frequency: CheckInFrequency;
  days: string[];
  notificationTime: string;
  endDate: string;
  active: boolean;
}

export interface CheckInTemplate {
  id: string;
  name: string;
  description: string | null;
  questions: CheckInQuestion[];
  schedule: CheckInSchedule;
  createdAt: string;
}

export type CheckInStatus = 'scheduled' | 'submitted' | 'reviewed';

/** Per-question answer value, keyed by question id in the `responses` JSONB column. */
export type CheckInAnswerValue =
  | string
  | number
  | string[]
  | { key: string }
  | null;

export type CheckInResponses = Record<string, CheckInAnswerValue>;

export interface CheckIn {
  id: string;
  templateId: string | null;
  templateName: string | null;
  status: CheckInStatus;
  responses: CheckInResponses;
  coachNotes: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
}

/** Parses a single/multiple-choice question's `placeholder` as CSV options. */
export function parseChoiceOptions(placeholder: string | undefined): string[] {
  if (!placeholder) return [];
  return placeholder
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export function isQuestionAnswered(question: CheckInQuestion, value: CheckInAnswerValue): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return typeof value.key === 'string' && value.key.length > 0;
  return true;
}
