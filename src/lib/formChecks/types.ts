// Maps to public.form_checks — see the coach-dashboard repo's
// docs/client-app-handoff-2026-08-10.md §4. Already live (unlike the other
// tables mentioned in that handoff, which are explicitly not applied yet).
//
// Distinct from set_logs.form_video_s3_key (the inline clip captured while
// logging a set in GymLogger) — this is a standalone submission with its
// own review status/coach notes, not tied to a specific completed set.

export type FormCheckStatus = 'unreviewed' | 'reviewed';

export interface FormCheck {
  id: string;
  exerciseId: string | null;
  exerciseName: string | null;
  videoKey: string;
  status: FormCheckStatus;
  coachNotes: string | null;
  submittedAt: string;
}
