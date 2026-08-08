// Maps to the (not-yet-applied) cardio_exercises/cardio_entries tables —
// see docs/migrations-drafts/005_cardio_tracking.sql.

export interface CardioExercise {
  id: string;
  name: string;
}

export interface CardioEntry {
  id: string;
  cardioExerciseId: string;
  entryDate: string; // YYYY-MM-DD
  durationSeconds: number;
}
