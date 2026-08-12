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
