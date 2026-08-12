// Auto-regulated set suggestion: given the last time this exercise was
// logged (weight/reps/RPE), suggest a weight for the next set. Tracked
// shows this as a blue "AI-suggested" hint during logging — this is the
// same idea without any model call, a simple RPE-based lookback rule:
// last set felt easy (RPE <= 6) -> nudge weight up; felt maximal
// (RPE >= 9) -> hold or nudge down; otherwise hold. Pure and
// framework-free.

export interface LastSetForExercise {
  weight_kg: number;
  reps: number;
  rpe: number | null;
}

export interface SetSuggestion {
  suggested_weight_kg: number;
  reason: 'increase' | 'hold' | 'decrease' | 'no_history';
}

const INCREASE_STEP_KG = 2.5;
const DECREASE_STEP_KG = 2.5;
const EASY_RPE_CEILING = 6;
const MAX_RPE_FLOOR = 9;

export function suggestNextSet(last: LastSetForExercise | null): SetSuggestion {
  if (!last) {
    return { suggested_weight_kg: 0, reason: 'no_history' };
  }
  if (last.rpe == null) {
    return { suggested_weight_kg: last.weight_kg, reason: 'hold' };
  }
  if (last.rpe <= EASY_RPE_CEILING) {
    return { suggested_weight_kg: last.weight_kg + INCREASE_STEP_KG, reason: 'increase' };
  }
  if (last.rpe >= MAX_RPE_FLOOR) {
    return { suggested_weight_kg: Math.max(0, last.weight_kg - DECREASE_STEP_KG), reason: 'decrease' };
  }
  return { suggested_weight_kg: last.weight_kg, reason: 'hold' };
}

// --- Richer prediction: cross-session history + intra-session fatigue decay
// + local per-exercise calibration, in the spirit of Tracked's "auto
// regulate" (their version weighs 16 factors server-side-free, on-device;
// this is a smaller, honest subset — reference weight/RPE, sets-completed
// -this-session fatigue, and a user-feedback-driven calibration multiplier
// — not a claim of matching their exact model). Still 100% local: no
// network call, no persisted history beyond what's already in set_logs.

export interface PredictionInput {
  /** Most recent logged set for this exercise — same session if one exists,
   * otherwise the last set from a prior session. Null if never logged. */
  reference: LastSetForExercise | null;
  /** How many sets of this same exercise are already completed this
   * session — drives the fatigue-decay adjustment on reps. */
  setsCompletedThisSession: number;
  /** Local calibration multiplier from thumbs up/down feedback, see
   * src/lib/predict/calibration.ts. 1.0 = no adjustment. */
  calibrationMultiplier?: number;
}

export interface SetPrediction extends SetSuggestion {
  suggested_reps: number | null;
  confidence: 'low' | 'medium' | 'high';
}

const FATIGUE_REP_DECAY_EVERY_N_SETS = 2;
const MIN_SUGGESTED_REPS = 1;

/** Predicts both weight and reps for the next set, adjusted for
 * within-session fatigue and the user's local calibration feedback. */
export function predictNextSet(input: PredictionInput): SetPrediction {
  const base = suggestNextSet(input.reference);
  if (base.reason === 'no_history' || !input.reference) {
    return { ...base, suggested_reps: null, confidence: 'low' };
  }

  const calibration = input.calibrationMultiplier ?? 1;
  const calibratedWeight = Math.round(base.suggested_weight_kg * calibration * 20) / 20;

  const baseReps =
    base.reason === 'hold' ? input.reference.reps + 1 : input.reference.reps;
  const fatigueDecay = Math.floor(input.setsCompletedThisSession / FATIGUE_REP_DECAY_EVERY_N_SETS);
  const suggestedReps = Math.max(MIN_SUGGESTED_REPS, baseReps - fatigueDecay);

  const confidence: SetPrediction['confidence'] =
    input.reference.rpe == null ? 'low' : input.setsCompletedThisSession > 4 ? 'medium' : 'high';

  return {
    suggested_weight_kg: calibratedWeight,
    suggested_reps: suggestedReps,
    reason: base.reason,
    confidence,
  };
}
