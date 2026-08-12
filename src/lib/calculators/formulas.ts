// Pure calculation functions for the standalone tools screen (app/tools/).
// No DB/profile dependency by design — these are one-off calculators, not
// tied to a stored profile field (profiles has no height/sex/waist columns).

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'cut' | 'maintain' | 'bulk';

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_ADJUSTMENT: Record<Goal, number> = {
  cut: -0.2,
  maintain: 0,
  bulk: 0.15,
};

/** Mifflin-St Jeor BMR, kcal/day. */
export function mifflinStJeorBmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === 'male' ? base + 5 : base - 161);
}

export interface TdeeResult {
  bmr: number;
  tdee: number;
  calorieTarget: number;
}

/** TDEE and a goal-adjusted calorie target, from Mifflin-St Jeor + activity multiplier. */
export function calculateTdee(
  sex: Sex,
  weightKg: number,
  heightCm: number,
  age: number,
  activity: ActivityLevel,
  goal: Goal = 'maintain',
): TdeeResult {
  const bmr = mifflinStJeorBmr(sex, weightKg, heightCm, age);
  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIER[activity]);
  const calorieTarget = Math.round(tdee * (1 + GOAL_ADJUSTMENT[goal]));
  return { bmr, tdee, calorieTarget };
}

export interface MacroSplit {
  proteinG: number;
  fatG: number;
  carbsG: number;
}

const PROTEIN_G_PER_KG: Record<Goal, number> = {
  cut: 2.2,
  maintain: 1.8,
  bulk: 1.8,
};

/** Daily protein target from bodyweight and goal — cutting runs higher to preserve
 * lean mass in a deficit. */
export function proteinTargetGrams(weightKg: number, goal: Goal): number {
  return Math.round(weightKg * PROTEIN_G_PER_KG[goal]);
}

/** Macro split from a calorie target and goal: protein by bodyweight, fat at 25% of
 * calories, carbs fill the remainder. Standard g/kg presets, not a custom % split. */
export function calculateMacros(calorieTarget: number, weightKg: number, goal: Goal): MacroSplit {
  const proteinG = proteinTargetGrams(weightKg, goal);
  const fatG = Math.round((calorieTarget * 0.25) / 9);
  const proteinCals = proteinG * 4;
  const fatCals = fatG * 9;
  const carbsG = Math.max(0, Math.round((calorieTarget - proteinCals - fatCals) / 4));
  return { proteinG, fatG, carbsG };
}

/** Epley formula estimated 1RM. */
export function estimateOneRepMax(weightKg: number, reps: number): number {
  if (reps <= 1) return Math.round(weightKg * 10) / 10;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

/** US Navy body-fat % method — circumference-based, no calipers needed. */
export function bodyFatNavy(
  sex: Sex,
  heightCm: number,
  neckCm: number,
  waistCm: number,
  hipCm?: number,
): number {
  if (sex === 'male') {
    const value = 495 / (1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm)) - 450;
    return Math.round(value * 10) / 10;
  }
  const hip = hipCm ?? 0;
  const value =
    495 / (1.29579 - 0.35004 * Math.log10(waistCm + hip - neckCm) + 0.221 * Math.log10(heightCm)) - 450;
  return Math.round(value * 10) / 10;
}

export interface PlateBreakdown {
  perSideKg: Record<number, number>;
  totalKg: number;
  remainderKg: number;
}

/** Plates needed per side to hit a target total (bar included), from largest plate down. */
export function calculatePlates(
  targetKg: number,
  barKg: number,
  availablePlatesKg: number[] = [25, 20, 15, 10, 5, 2.5, 1.25],
): PlateBreakdown {
  let perSide = Math.max(0, (targetKg - barKg) / 2);
  const perSideKg: Record<number, number> = {};
  const sorted = [...availablePlatesKg].sort((a, b) => b - a);

  for (const plate of sorted) {
    const count = Math.floor(perSide / plate + 1e-9);
    if (count > 0) {
      perSideKg[plate] = count;
      perSide -= count * plate;
    }
  }

  const totalKg = barKg + (Object.entries(perSideKg).reduce((sum, [kg, n]) => sum + Number(kg) * n, 0)) * 2;
  return { perSideKg, totalKg, remainderKg: Math.round(perSide * 2 * 100) / 100 };
}

/** Daily water intake in liters — 35ml per kg bodyweight, plus a training-day bump. */
export function calculateWaterIntakeLiters(weightKg: number, isTrainingDay: boolean): number {
  const base = weightKg * 0.035;
  const withTraining = isTrainingDay ? base + 0.5 : base;
  return Math.round(withTraining * 10) / 10;
}

/** Wilks 2020 coefficient — relative-strength score, higher is better. */
export function wilksScore(sex: Sex, bodyweightKg: number, totalLiftedKg: number): number {
  const coeffs =
    sex === 'male'
      ? [47.4617885, 8.472061379, 0.07369410346, -0.001395833811, 7.07665973070743e-6, -1.20804336482315e-8]
      : [-125.4255398, 13.71219419, -0.03307250631, -0.001050400051, 9.38773881462799e-6, -2.3334613884954e-8];
  const bw = Math.min(Math.max(bodyweightKg, sex === 'male' ? 40 : 40), sex === 'male' ? 201.9 : 154.53);
  const denom = coeffs.reduce((sum, c, i) => sum + c * bw ** i, 0);
  return Math.round((totalLiftedKg * (500 / denom)) * 100) / 100;
}

/** DOTS coefficient — a newer, widely-adopted alternative to Wilks. */
export function dotsScore(sex: Sex, bodyweightKg: number, totalLiftedKg: number): number {
  const coeffs =
    sex === 'male'
      ? [-307.75076, 24.0900756, -0.1918759221, 0.0007391293, -0.000001093]
      : [-57.96288, 13.6175032, -0.1126655495, 0.0005158568, -0.0000010706];
  const bw = Math.min(Math.max(bodyweightKg, 40), 210);
  const denom = coeffs.reduce((sum, c, i) => sum + c * bw ** i, 0);
  return Math.round((totalLiftedKg * (500 / denom)) * 100) / 100;
}
