import type { SessionDraft } from './session';
import type { OutboxItem, SetLogInsert } from '../outbox/types';
import { forUser } from '../outbox/ownership';
import { kgToLbs } from '../units';

export type WorkoutSetDraft = {
  id: string; weight: string; reps: string; rpe: string; completed: boolean;
  isWarmup?: boolean; isFailure?: boolean;
};
export type WorkoutExerciseDraft = {
  id: string; name: string; sets: WorkoutSetDraft[]; isIsometric?: boolean;
};
export type ActiveWorkoutDraft = {
  version: 1; templateId: string; session: SessionDraft;
  exercises: WorkoutExerciseDraft[]; logIds: [string, string][];
  videoKeys: Record<string, string>;
};

export function activeWorkoutKey(userId: string, templateId: string): string {
  return `trace:active-workout:v1:${userId}:${templateId}`;
}

export function parseActiveWorkout(raw: string | null, userId: string, templateId: string): ActiveWorkoutDraft | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (value?.version !== 1 || value.templateId !== templateId || value.session?.userId !== userId
      || typeof value.session.id !== 'string' || typeof value.session.sessionName !== 'string'
      || !Number.isFinite(value.session.startedAtMs) || value.session.startedAtMs < 0
      || !Array.isArray(value.exercises) || !Array.isArray(value.logIds)
      || !value.videoKeys || typeof value.videoKeys !== 'object' || Array.isArray(value.videoKeys)) return null;
    if (!value.exercises.every((exercise: WorkoutExerciseDraft) => exercise && typeof exercise.id === 'string'
      && typeof exercise.name === 'string' && Array.isArray(exercise.sets)
      && (exercise.isIsometric === undefined || typeof exercise.isIsometric === 'boolean')
      && exercise.sets.every((set) => set && typeof set.id === 'string' && typeof set.weight === 'string'
        && typeof set.reps === 'string' && typeof set.rpe === 'string' && typeof set.completed === 'boolean'
        && (set.isWarmup === undefined || typeof set.isWarmup === 'boolean')
        && (set.isFailure === undefined || typeof set.isFailure === 'boolean')))) return null;
    if (!value.logIds.every((pair: unknown) => Array.isArray(pair) && pair.length === 2
      && pair.every((item) => typeof item === 'string'))
      || !Object.values(value.videoKeys).every((key) => typeof key === 'string')) return null;
    return value as ActiveWorkoutDraft;
  } catch { return null; }
}

export class WorkoutRecoveryError extends Error {
  constructor() {
    super("Some saved sets couldn't be matched to this workout. Your saved logs are retained. Contact your coach before logging more sets.");
    this.name = 'WorkoutRecoveryError';
  }
}

export function recoverQueuedSets(draft: ActiveWorkoutDraft, items: OutboxItem[]): ActiveWorkoutDraft {
  const saved = forUser(items, draft.session.userId).filter((item) =>
    (item.table === 'set_logs' || !item.table) && (item.payload as SetLogInsert).session_id === draft.session.id
    && item.id === item.payload.id && (item.payload as SetLogInsert).is_completed === true);
  const logIds = new Map(draft.logIds);
  const reservedIds = new Set(logIds.values());
  const usedIds = new Set<string>();
  const bindingCounts = new Map<string, number>();
  const occurrenceCounts = new Map<string, number>();
  const occurrenceKey = (exerciseId: string, setNumber: number) => `${exerciseId}:${setNumber}`;
  for (const [eIndex, exercise] of draft.exercises.entries()) {
    for (const [sIndex, set] of exercise.sets.entries()) {
      const matchKey = occurrenceKey(exercise.id, sIndex + 1);
      occurrenceCounts.set(matchKey, (occurrenceCounts.get(matchKey) ?? 0) + 1);
      const boundId = logIds.get(`${eIndex}:${set.id}`);
      if (boundId !== undefined) {
        const count = (bindingCounts.get(boundId) ?? 0) + 1;
        if (count > 1) throw new WorkoutRecoveryError();
        bindingCounts.set(boundId, count);
      }
    }
  }
  const videoKeys = { ...draft.videoKeys };
  const exercises = draft.exercises.map((exercise, eIndex) => ({ ...exercise,
    sets: exercise.sets.map((set, sIndex) => {
      const logKey = `${eIndex}:${set.id}`;
      const boundId = logIds.get(logKey);
      const candidates = saved.filter((entry) => {
        const payload = entry.payload as SetLogInsert;
        return payload.exercise_id === exercise.id && payload.set_number === sIndex + 1;
      });
      // Modern drafts persist this occurrence's retry ID before enqueueing.
      // A missing bound item may mean enqueue never committed: keep that ID
      // and the original input, rather than adopting a neighboring record.
      let item: OutboxItem | undefined;
      if (boundId !== undefined) {
        const exact = saved.filter((entry) => entry.id === boundId);
        if (exact.length > 1 || (exact.length === 1 && !candidates.includes(exact[0]))) throw new WorkoutRecoveryError();
        item = exact[0];
      } else {
        const legacy = candidates.filter((entry) => !reservedIds.has(entry.id) && !usedIds.has(entry.id));
        if (!legacy.length) return set;
        // A legacy match needs exactly one possible draft occurrence AND one
        // unclaimed queue row. Array order is never an occurrence identity.
        if (legacy.length !== 1 || occurrenceCounts.get(occurrenceKey(exercise.id, sIndex + 1)) !== 1) throw new WorkoutRecoveryError();
        item = legacy[0];
      }
      if (!item) return set;
      if (usedIds.has(item.id)) throw new WorkoutRecoveryError();
      usedIds.add(item.id);
      const payload = item.payload as SetLogInsert;
      logIds.set(logKey, payload.id);
      if (payload.form_video_s3_key) videoKeys[set.id] = payload.form_video_s3_key;
      return { ...set, weight: String(kgToLbs(Number(payload.weight_kg))),
        reps: String(payload.duration_seconds ?? payload.reps), rpe: payload.rpe == null ? '' : String(payload.rpe),
        isWarmup: payload.is_warmup ?? false, isFailure: payload.is_failure ?? false, completed: true };
    }),
  }));
  return { ...draft, exercises, videoKeys, logIds: [...logIds] };
}
