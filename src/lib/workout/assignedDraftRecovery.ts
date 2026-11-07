import type { OutboxItem, SetLogInsert } from '../outbox/types';
import { forUser } from '../outbox/ownership';
import { recoverQueuedSets, WorkoutRecoveryError, type ActiveWorkoutDraft } from './activeDraft';

/** Reconciles repeated exercise occurrences by their persisted log IDs. */
export function recoverAssignedDraft(draft: ActiveWorkoutDraft, items: OutboxItem[]): ActiveWorkoutDraft {
  const occurrences = new Map<string, number[]>();
  draft.exercises.forEach((exercise, index) => occurrences.set(exercise.id, [...(occurrences.get(exercise.id) ?? []), index]));
  const duplicateIndexes = new Set([...occurrences.values()].filter((indexes) => indexes.length > 1).flat());
  if (!duplicateIndexes.size) return recoverQueuedSets(draft, items);

  const duplicateExerciseIds = new Set([...duplicateIndexes].map((index) => draft.exercises[index].id));
  const bound = new Map<string, { exerciseIndex: number; setIndex: number; exerciseId: string }>();
  const logIds = new Map(draft.logIds);
  for (const [exerciseIndex, exercise] of draft.exercises.entries()) {
    if (!duplicateIndexes.has(exerciseIndex)) continue;
    for (const [setIndex, set] of exercise.sets.entries()) {
      const id = logIds.get(`${exerciseIndex}:${set.id}`);
      if (!id) continue;
      if (bound.has(id)) throw new WorkoutRecoveryError();
      bound.set(id, { exerciseIndex, setIndex, exerciseId: exercise.id });
    }
  }

  const userRows = forUser(items, draft.session.userId).filter((item) =>
    (item.table === 'set_logs' || !item.table) && (item.payload as SetLogInsert).session_id === draft.session.id);
  const completedDuplicateRows = userRows.filter((item) => {
    const payload = item.payload as SetLogInsert;
    return duplicateExerciseIds.has(payload.exercise_id) && payload.is_completed === true;
  });
  for (const item of completedDuplicateRows) {
    const payload = item.payload as SetLogInsert;
    const binding = bound.get(item.id);
    if (!binding || item.id !== payload.id || binding.exerciseId !== payload.exercise_id
      || payload.set_number !== setNumberForOccurrence(draft.exercises, binding.exerciseIndex, binding.setIndex)) {
      // Legacy rows without occurrence-bound IDs are ambiguous for repeats.
      throw new WorkoutRecoveryError();
    }
  }

  const occurrenceIds = new Map([...duplicateIndexes].map((index) =>
    [index, `__assigned_occurrence_${index}__${draft.exercises[index].id}`] as const));
  const normalizedDraft: ActiveWorkoutDraft = { ...draft, exercises: draft.exercises.map((exercise, index) => ({
    ...exercise, id: occurrenceIds.get(index) ?? exercise.id,
  })) };
  const normalizedItems = items.map((item) => {
    if (!userRows.includes(item) || !completedDuplicateRows.includes(item)) return item;
    const binding = bound.get(item.id)!;
    const payload = item.payload as SetLogInsert;
    return { ...item, payload: {
      ...payload,
      exercise_id: occurrenceIds.get(binding.exerciseIndex)!,
      set_number: binding.setIndex + 1,
    } };
  });
  const recovered = recoverQueuedSets(normalizedDraft, normalizedItems);
  return { ...recovered, exercises: recovered.exercises.map((exercise, index) => ({
    ...exercise, id: draft.exercises[index].id,
  })) };
}

export function setNumberForOccurrence(exercises: { id: string; sets: unknown[] }[], exerciseIndex: number, setIndex: number) {
  const exercise = exercises[exerciseIndex];
  return exercises.slice(0, exerciseIndex).reduce((count, item) => count + (item.id === exercise.id ? item.sets.length : 0), 0)
    + setIndex + 1;
}
