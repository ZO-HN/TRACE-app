// Exercise catalog helpers: map DB exercise rows to a name -> id lookup so the
// logger can resolve real foreign keys for set_logs.

export type MuscleRole = 'primary' | 'secondary';

export interface ExerciseMuscle {
  id: string;
  name: string;
  role: MuscleRole;
}

export interface ExerciseRow {
  id: string;
  name: string;
  target_muscle_group?: string;
  /** Per-muscle rows from exercise_muscles/muscle_groups — supersedes the
   * flat target_muscle_group column, which only ever held one primary
   * muscle. Empty for exercises not yet tagged on the dashboard. */
  muscles?: ExerciseMuscle[];
}

/** Case-insensitive name -> id index. Later duplicates do not overwrite earlier ones. */
export function indexByName(rows: ExerciseRow[]): Record<string, string> {
  const index: Record<string, string> = {};
  for (const row of rows) {
    const key = row.name.trim().toLowerCase();
    if (key && !(key in index)) index[key] = row.id;
  }
  return index;
}

export function lookupExerciseId(
  index: Record<string, string>,
  name: string,
): string | undefined {
  return index[name.trim().toLowerCase()];
}
