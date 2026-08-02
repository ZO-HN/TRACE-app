// Validate + map a quick bodyweight entry (lbs, from the UI) into a
// bodyweight_logs insert payload (kg, matching set_logs.weight_kg's
// convention). Mirrors outbox/mapSetLog.ts's isValid*/to*Insert pairing.

import { lbsToKg } from '../units';
import type { BodyweightLogInsert } from './types';

// Generous human range with headroom either side — matches the DB's
// `weight_kg > 0 AND weight_kg < 700` CHECK constraint (converted to lbs).
const MIN_LBS = 20;
const MAX_LBS = 1500;

export function isValidBodyweightLbs(lbs: number): boolean {
  return Number.isFinite(lbs) && lbs >= MIN_LBS && lbs <= MAX_LBS;
}

export function toBodyweightLogInsert(
  id: string,
  userId: string,
  weightLbs: number,
  recordedDate: string,
  note?: string | null,
): BodyweightLogInsert {
  return {
    id,
    user_id: userId,
    recorded_date: recordedDate,
    weight_kg: lbsToKg(weightLbs),
    note: note?.trim() || null,
  };
}
