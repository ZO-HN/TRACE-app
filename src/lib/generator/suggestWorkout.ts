// Rule-based workout suggestion — NOT an LLM call. No AI provider/API key
// is configured anywhere in this codebase (see trace-brain's own placeholder
// status in the coach dashboard repo), so "AI Workout Generator" is built
// here as a deterministic heuristic over the trainee's own real data
// (get_muscle_analytics + get_personal_records) instead of faking an LLM
// integration that has nothing behind it. Same feature outcome — a
// personalized program — honestly labeled about how it's produced.
//
// Heuristic: rank muscle groups by ascending trained volume (least-trained
// first), round-robin them across the target training days, pick one
// catalog exercise per group per day, and suggest a working weight from the
// exercise's personal record when one exists.

export interface CatalogExercise {
  id: string;
  name: string;
  target_muscle_group: string;
}

export interface MuscleVolumeRow {
  target_muscle_group: string;
  total_volume_kg: number;
}

export interface PersonalRecordRow {
  exercise_id: string;
  best_estimated_1rm: number | null;
}

export interface SuggestedItem {
  exerciseId: string;
  exerciseName: string;
  targetMuscleGroup: string;
  targetSets: number;
  targetReps: number;
  targetRpe: number;
  suggestedWeightKg: number | null;
}

export interface SuggestedDay {
  dayNumber: number;
  items: SuggestedItem[];
}

export interface WorkoutSuggestion {
  days: SuggestedDay[];
}

const DEFAULT_SETS = 3;
const DEFAULT_REPS = 8;
const DEFAULT_RPE = 7;
// Submaximal working weight for a suggested starting point, not a true 8RM.
const WORKING_WEIGHT_PCT_OF_1RM = 0.7;

export function suggestWorkout(
  catalog: CatalogExercise[],
  muscleVolume: MuscleVolumeRow[],
  personalRecords: PersonalRecordRow[],
  targetDays = 3,
): WorkoutSuggestion {
  const volumeByGroup = new Map(
    muscleVolume.map((r) => [r.target_muscle_group, r.total_volume_kg]),
  );
  const prByExercise = new Map(personalRecords.map((r) => [r.exercise_id, r]));

  const groupsInCatalog = [...new Set(catalog.map((e) => e.target_muscle_group))];
  // Untrained groups (no volume row at all) sort first — they're the most
  // under-trained by definition.
  const rankedGroups = groupsInCatalog
    .slice()
    .sort((a, b) => (volumeByGroup.get(a) ?? 0) - (volumeByGroup.get(b) ?? 0));

  const days: SuggestedDay[] = Array.from({ length: targetDays }, (_, i) => ({
    dayNumber: i + 1,
    items: [],
  }));

  rankedGroups.forEach((group, i) => {
    const exercise = pickExerciseForGroup(catalog, group, prByExercise);
    if (!exercise) return;

    const pr = prByExercise.get(exercise.id);
    const suggestedWeightKg =
      pr?.best_estimated_1rm != null
        ? Math.round(pr.best_estimated_1rm * WORKING_WEIGHT_PCT_OF_1RM * 100) / 100
        : null;

    days[i % targetDays].items.push({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      targetMuscleGroup: group,
      targetSets: DEFAULT_SETS,
      targetReps: DEFAULT_REPS,
      targetRpe: DEFAULT_RPE,
      suggestedWeightKg,
    });
  });

  return { days: days.filter((d) => d.items.length > 0) };
}

/** Prefer an exercise the trainee already has a PR for (weight continuity). */
function pickExerciseForGroup(
  catalog: CatalogExercise[],
  group: string,
  prByExercise: Map<string, PersonalRecordRow>,
): CatalogExercise | undefined {
  const candidates = catalog.filter((e) => e.target_muscle_group === group);
  return candidates.find((e) => prByExercise.has(e.id)) ?? candidates[0];
}
