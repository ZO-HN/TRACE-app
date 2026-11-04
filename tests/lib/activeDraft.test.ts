import type { OutboxItem } from '../../src/lib/outbox/types';
import { expect, it } from 'vitest';
import { activeWorkoutKey, parseActiveWorkout, recoverQueuedSets, WorkoutRecoveryError, type ActiveWorkoutDraft } from '../../src/lib/workout/activeDraft';
const draft: ActiveWorkoutDraft = {
  version: 1, templateId: 'template', session: { id: 'session', userId: 'a', sessionName: 'Workout', startedAtMs: 1000 },
  exercises: [{ id: 'squat', name: 'Squat', sets: [{ id: '1', weight: '100', reps: '8', rpe: '7', completed: true }] }],
  logIds: [['0:1', 'log']], videoKeys: { '1': 'video' },
};
it('restores inputs, completed sets and stable logging identifiers', () => {
  expect(parseActiveWorkout(JSON.stringify(draft), 'a', 'template')).toEqual(draft);
});
it('isolates accounts and selected workouts', () => {
  expect(parseActiveWorkout(JSON.stringify(draft), 'b', 'template')).toBeNull();
  expect(parseActiveWorkout(JSON.stringify(draft), 'a', 'other')).toBeNull();
  expect(activeWorkoutKey('a', 'template')).not.toBe(activeWorkoutKey('b', 'template'));
});
it('rejects corrupt persisted data without crashing', () => {
  expect(parseActiveWorkout('{', 'a', 'template')).toBeNull();
  expect(parseActiveWorkout(JSON.stringify({ ...draft, exercises: [{ sets: [{}] }] }), 'a', 'template')).toBeNull();
  expect(parseActiveWorkout(JSON.stringify({ ...draft, logIds: [null] }), 'a', 'template')).toBeNull();
});
it('recovers a queued set when the app closed before its draft write completed', () => {
  const unfinished = { ...draft, logIds: [] as [string, string][], exercises: [{ ...draft.exercises[0],
    sets: [{ ...draft.exercises[0].sets[0], completed: false }] }] };
  const recovered = recoverQueuedSets(unfinished, [{ id: 'saved', owner_id: 'a', table: 'set_logs',
    status: 'pending', attempts: 0, updated_at: '', payload: { id: 'saved', session_id: 'session',
      exercise_id: 'squat', set_number: 1, weight_kg: 45.36, reps: 8, rpe: 7, is_completed: true } }]);
  expect(recovered.exercises[0].sets[0].completed).toBe(true);
  expect(recovered.logIds).toEqual([['0:1', 'saved']]);
});
it('never recovers a set belonging to a different account', () => {
  const recovered = recoverQueuedSets(draft, [{ id: 'foreign', owner_id: 'b', table: 'set_logs',
    status: 'pending', attempts: 0, updated_at: '', payload: { id: 'foreign', session_id: 'session',
      exercise_id: 'squat', set_number: 1, weight_kg: 100, reps: 8, is_completed: true } }]);
  expect(recovered.logIds).toEqual(draft.logIds);
});


function repeatedDraft(logIds: [string, string][] = [['0:1', 'first'], ['1:1', 'second']]): ActiveWorkoutDraft {
  return { ...draft, logIds, videoKeys: {}, exercises: [
    { id: 'squat', name: 'Squat', sets: [{ id: '1', weight: '100', reps: '8', rpe: '7', completed: false }] },
    { id: 'squat', name: 'Squat again', sets: [{ id: '1', weight: '200', reps: '12', rpe: '9', completed: false }] },
  ] };
}
function queued(id: string, reps = 8, owner = 'a', sessionId = 'session'): OutboxItem {
  return { id, owner_id: owner, table: 'set_logs', status: 'pending', attempts: 0, updated_at: '',
    payload: { id, session_id: sessionId, exercise_id: 'squat', set_number: 1,
      weight_kg: reps === 8 ? 45.36 : 90.72, reps, rpe: reps === 8 ? 7 : 9, is_completed: true } };
}

it('does not mark an unsaved repeated exercise completed from its neighbor', () => {
  const original = repeatedDraft();
  const recovered = recoverQueuedSets(original, [queued('first')]);
  expect(recovered.exercises[0].sets[0].completed).toBe(true);
  expect(recovered.exercises[1].sets[0]).toEqual(original.exercises[1].sets[0]);
  expect(recovered.logIds).toEqual(original.logIds);
});

it('restores distinct values and identities for both repeated occurrences', () => {
  const recovered = recoverQueuedSets(repeatedDraft(), [queued('first'), queued('second', 12)]);
  expect(recovered.exercises.map((exercise) => exercise.sets[0].reps)).toEqual(['8', '12']);
  expect(recovered.exercises.map((exercise) => exercise.sets[0].rpe)).toEqual(['7', '9']);
  expect(recovered.logIds).toEqual([['0:1', 'first'], ['1:1', 'second']]);
});


it.each([false, true])('uses persisted occurrence bindings independently of queue order (reverse=%s)', (reverse) => {
  const items = [queued('first'), queued('second', 12)];
  const recovered = recoverQueuedSets(repeatedDraft(), reverse ? items.reverse() : items);
  expect(recovered.exercises.map((exercise) => exercise.sets[0].reps)).toEqual(['8', '12']);
  expect(recovered.logIds).toEqual([['0:1', 'first'], ['1:1', 'second']]);
});

it('does not take a later occurrence binding as a legacy match for an earlier set', () => {
  const original = repeatedDraft([['1:1', 'second']]);
  const recovered = recoverQueuedSets(original, [queued('second', 12)]);
  expect(recovered.exercises[0].sets[0]).toEqual(original.exercises[0].sets[0]);
  expect(recovered.exercises[1].sets[0].completed).toBe(true);
  expect(recovered.logIds).toEqual(original.logIds);
});

it('keeps a pre-enqueue retry ID and input when that item is absent', () => {
  const original = { ...draft, exercises: [{ ...draft.exercises[0], sets: [{ ...draft.exercises[0].sets[0], completed: false }] }] };
  const recovered = recoverQueuedSets(original, [queued('another-record')]);
  expect(recovered).toEqual(original);
});

it.each([1, 2])('blocks ambiguous legacy repeated occurrences with %s queue rows without mutating them', (count) => {
  const original = repeatedDraft([]);
  const items = [queued('first'), queued('second', 12)].slice(0, count);
  const snapshot = JSON.stringify({ original, items });
  expect(() => recoverQueuedSets(original, items)).toThrow(WorkoutRecoveryError);
  expect(JSON.stringify({ original, items })).toBe(snapshot);
});

it('blocks multiple legacy rows matching a single unbound set', () => {
  expect(() => recoverQueuedSets({ ...draft, logIds: [] }, [queued('first'), queued('second', 12)])).toThrow(WorkoutRecoveryError);
});

it('blocks reused persisted retry identities rather than assigning one item twice', () => {
  expect(() => recoverQueuedSets(repeatedDraft([['0:1', 'first'], ['1:1', 'first']]), [queued('first')])).toThrow(WorkoutRecoveryError);
});

it('blocks an exact retry ID whose exercise or set number does not match the occurrence', () => {
  const wrong = queued('log');
  const original = draft;
  wrong.payload = { ...wrong.payload, exercise_id: 'press', set_number: 2 };
  expect(() => recoverQueuedSets(original, [wrong])).toThrow(WorkoutRecoveryError);
});

it.each(['pending', 'syncing', 'failed', 'synced'] as const)('restores a durably completed %s item without changing queue state', (status) => {
  const item = { ...queued('log'), status };
  const before = JSON.stringify(item);
  expect(recoverQueuedSets(draft, [item]).exercises[0].sets[0].completed).toBe(true);
  expect(JSON.stringify(item)).toBe(before);
});

it.each(['foreign-owner', 'foreign-session', 'incomplete', 'mismatched-id'])(
  'does not restore a bound item with %s metadata', (kind) => {
    const original = { ...draft, exercises: [{ ...draft.exercises[0], sets: [{ ...draft.exercises[0].sets[0], completed: false }] }] };
    const item = queued('log', 8, kind === 'foreign-owner' ? 'b' : 'a', kind === 'foreign-session' ? 'other-session' : 'session');
    if (kind === 'incomplete') item.payload = { ...item.payload, is_completed: false };
    if (kind === 'mismatched-id') item.payload.id = 'different';
    expect(recoverQueuedSets(original, [item])).toEqual(original);
  },
);

it('retains safe legacy recovery using the owning parent session and historical missing table marker', () => {
  const item = queued('legacy');
  delete item.owner_id;
  delete item.table;
  const parent: OutboxItem = { id: 'session', table: 'workout_sessions', owner_id: 'a', status: 'pending', attempts: 0,
    updated_at: '', payload: { id: 'session', user_id: 'a', template_id: 'template' } };
  expect(recoverQueuedSets({ ...draft, logIds: [] }, [item, parent]).logIds).toEqual([['0:1', 'legacy']]);
});

it('preserves completed-set flags, duration, and a uniquely keyed video snapshot', () => {
  const item = queued('log');
  item.payload = { ...item.payload, duration_seconds: 30, is_warmup: true, is_failure: true, form_video_s3_key: 'saved-video' };
  const recovered = recoverQueuedSets(draft, [item]);
  expect(recovered.exercises[0].sets[0]).toMatchObject({ reps: '30', isWarmup: true, isFailure: true, completed: true });
  expect(recovered.videoKeys).toEqual({ '1': 'saved-video' });
});
