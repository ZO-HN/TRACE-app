// Map raw logger UI input into a validated set_logs insert payload.
// Pure and framework-free so it can be unit-tested without rendering the logger.

import type { SetLogInsert } from './types';
import { lbsToKg } from '../units';

export interface SetInput {
  id: string; // client UUID — outbox idempotency key
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  weightLbs: string | number;
  reps: string | number;
  rpe?: string | number | null;
  /** R2 object key of an uploaded form-check clip (see ADR 0001). */
  formVideoKey?: string | null;
  isWarmup?: boolean;
  isFailure?: boolean;
  setType?: 'reps' | 'duration';
  durationSeconds?: string | number | null;
}

function toNumber(value: string | number): number {
  return typeof value === 'string' ? Number(value) : value;
}

// Number('') and Number('  ') are 0, not NaN — reject blank strings first.
const isBlank = (v: string | number) => typeof v === 'string' && v.trim() === '';

/** True when weight and reps (or duration, for isometric holds) are present
 * and non-negative finite numbers. */
export function isValidSetInput(input: SetInput): boolean {
  if (isBlank(input.weightLbs)) return false;
  const weight = toNumber(input.weightLbs);
  if (!Number.isFinite(weight) || weight < 0) return false;

  if (input.setType === 'duration') {
    if (input.durationSeconds == null || isBlank(input.durationSeconds)) return false;
    const duration = toNumber(input.durationSeconds);
    return Number.isFinite(duration) && duration > 0;
  }

  if (isBlank(input.reps)) return false;
  const reps = toNumber(input.reps);
  return Number.isInteger(reps) && reps >= 0;
}

/** Build the DB payload. Assumes isValidSetInput(input) is true.
 *
 * The Tier A columns (is_warmup/is_failure/set_type/duration_seconds, see
 * docs/migrations-drafts/008_tracked_parity_tier_a.sql) are NOT YET LIVE on
 * most backends. PostgREST rejects an insert containing any unknown column
 * key, so — unlike the other fields here — these are only added to the
 * payload when the caller actually used that feature (isWarmup/isFailure
 * true, or setType 'duration'). A plain set with none of those produces the
 * exact same payload shape as before this migration existed, so ordinary
 * logging keeps working against an unmigrated backend; only the new
 * feature paths require 008 to be applied first. */
export function toSetLogInsert(input: SetInput): SetLogInsert {
  const rpe =
    input.rpe == null || input.rpe === '' ? null : Math.trunc(toNumber(input.rpe));
  const isDuration = input.setType === 'duration';

  const payload: SetLogInsert = {
    id: input.id,
    session_id: input.sessionId,
    exercise_id: input.exerciseId,
    set_number: input.setNumber,
    weight_kg: lbsToKg(toNumber(input.weightLbs)),
    reps: isDuration ? 0 : Math.trunc(toNumber(input.reps)),
    rpe: Number.isFinite(rpe as number) ? rpe : null,
    is_completed: true,
    form_video_s3_key: input.formVideoKey ?? null,
  };

  if (input.isWarmup) payload.is_warmup = true;
  if (input.isFailure) payload.is_failure = true;
  if (isDuration) {
    payload.set_type = 'duration';
    payload.duration_seconds =
      input.durationSeconds != null ? Math.trunc(toNumber(input.durationSeconds)) : null;
  }

  return payload;
}
