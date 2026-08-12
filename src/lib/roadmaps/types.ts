// Maps to the (not-yet-applied) training_phases table — see
// docs/migrations-drafts/009_tracked_parity_tier_b.sql.

export interface TrainingPhaseInsert {
  id: string;
  user_id: string;
  name: string;
  start_date: string; // YYYY-MM-DD
  target_date?: string | null;
  target_metric?: string | null;
  target_value?: number | null;
  notes?: string | null;
}

export interface TrainingPhase {
  id: string;
  name: string;
  start_date: string;
  target_date: string | null;
  target_metric: string | null;
  target_value: number | null;
  notes: string | null;
}
