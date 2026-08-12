// Maps to the (not-yet-applied) water_logs table — see
// docs/migrations-drafts/008_tracked_parity_tier_a.sql. Until that
// migration lands, useWaterLogs degrades to session-local state (same
// TABLE_MISSING_CODE pattern as useBodyweightSettings).

export interface WaterLogInsert {
  id: string;
  user_id: string;
  logged_date: string; // YYYY-MM-DD
  amount_ml: number;
}

export function isValidWaterMl(amountMl: number): boolean {
  return Number.isFinite(amountMl) && amountMl >= 0 && amountMl <= 10_000;
}
