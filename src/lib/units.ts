// Unit conversions. The UI logs weight in pounds; set_logs.weight_kg is
// NUMERIC(6,2) in kilograms, so convert and round to 2 decimals before storage.

const LBS_TO_KG = 0.453_592_37;

/** Convert pounds to kilograms, rounded to 2 decimal places (DB precision). */
export function lbsToKg(lbs: number): number {
  return Math.round(lbs * LBS_TO_KG * 100) / 100;
}

/** Convert kilograms to pounds, rounded to 1 decimal (display precision). */
export function kgToLbs(kg: number): number {
  return Math.round((kg / LBS_TO_KG) * 10) / 10;
}

export type WeightDisplayUnit = 'lbs' | 'kg';

/** Weight value + unit suffix for display, honoring the user's unit
 * preference (see src/lib/units/preference.ts) instead of assuming lbs. */
export function formatWeightKg(kg: number, unit: WeightDisplayUnit): { value: number; unit: WeightDisplayUnit } {
  return unit === 'kg' ? { value: Math.round(kg * 10) / 10, unit: 'kg' } : { value: kgToLbs(kg), unit: 'lbs' };
}

/** Parses a user-entered weight in the given display unit into kilograms
 * for storage — the inverse of formatWeightKg. */
export function parseWeightToKg(value: number, unit: WeightDisplayUnit): number {
  return unit === 'kg' ? Math.round(value * 100) / 100 : lbsToKg(value);
}
