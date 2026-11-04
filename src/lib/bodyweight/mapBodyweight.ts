// Map a bodyweight entry to stored kilograms. Existing callers default to
// pounds; explicit kilograms avoid a lossy display-unit round trip.

import { parseWeightToKg, type WeightDisplayUnit } from '../units';
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
  weight: number,
  recordedDate: string,
  note?: string | null,
  unit: WeightDisplayUnit = 'lbs',
): BodyweightLogInsert {
  return {
    id,
    user_id: userId,
    recorded_date: recordedDate,
    weight_kg: parseWeightToKg(weight, unit),
    note: note?.trim() || null,
  };
}
