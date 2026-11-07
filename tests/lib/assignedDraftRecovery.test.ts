import { describe, expect, it } from 'vitest';
import type { ActiveWorkoutDraft } from '../../src/lib/workout/activeDraft';
import { WorkoutRecoveryError } from '../../src/lib/workout/activeDraft';
import { recoverAssignedDraft, setNumberForOccurrence } from '../../src/lib/workout/assignedDraftRecovery';

const draft: ActiveWorkoutDraft = { version: 1, templateId: 't', session: { id: 's', userId: 'a', sessionName: 'Repeat', startedAtMs: 1 },
  exercises: [1, 2].map((position) => ({ id: 'ex', name: 'Squat', sets: [{ id: `${position}:ex-s1`, weight: '', reps: '8', rpe: '', completed: false }] })),
  logIds: [['0:1:ex-s1', 'log-a'], ['1:2:ex-s1', 'log-b']], videoKeys: {} };

describe('repeated exercise occurrence recovery', () => {
  it('restores each queued set by its stable log UUID and assigns occurrence-safe set numbers', () => {
    const recovered = recoverAssignedDraft(draft, [
      { id: 'log-a', owner_id: 'a', table: 'set_logs', payload: { id: 'log-a', session_id: 's', exercise_id: 'ex', set_number: 1, weight_kg: 50, reps: 8, rpe: 7, is_completed: true }, status: 'pending', attempts: 0, updated_at: '' },
      { id: 'log-b', owner_id: 'a', table: 'set_logs', payload: { id: 'log-b', session_id: 's', exercise_id: 'ex', set_number: 2, weight_kg: 60, reps: 6, rpe: 8, is_completed: true }, status: 'pending', attempts: 0, updated_at: '' },
    ]);
    expect(recovered.exercises.map((exercise) => exercise.sets[0].reps)).toEqual(['8', '6']);
    expect(recovered.exercises.map((exercise) => exercise.sets[0].completed)).toEqual([true, true]);
    expect(recovered.logIds).toEqual(draft.logIds);
    expect(setNumberForOccurrence(draft.exercises, 0, 0)).toBe(1);
    expect(setNumberForOccurrence(draft.exercises, 1, 0)).toBe(2);
  });
  it('leaves unqueued duplicate occurrences at their saved draft state', () => {
    const recovered = recoverAssignedDraft(draft, []);
    expect(recovered.exercises.map((exercise) => exercise.sets[0].completed)).toEqual([false, false]);
  });
  it('fails closed when a completed repeated-exercise row has no stable occurrence binding', () => {
    const unboundDraft = { ...draft, logIds: [draft.logIds[0]] };
    const legacy = { id: 'legacy', owner_id: 'a', table: 'set_logs' as const,
      payload: { id: 'legacy', session_id: 's', exercise_id: 'ex', set_number: 2, weight_kg: 60, reps: 6, is_completed: true },
      status: 'pending' as const, attempts: 0, updated_at: '' };
    expect(() => recoverAssignedDraft(unboundDraft, [legacy])).toThrow(WorkoutRecoveryError);
  });
});
