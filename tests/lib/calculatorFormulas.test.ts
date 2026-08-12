import { describe, expect, it } from 'vitest';
import {
  bodyFatNavy,
  calculateMacros,
  calculatePlates,
  calculateTdee,
  calculateWaterIntakeLiters,
  dotsScore,
  estimateOneRepMax,
  mifflinStJeorBmr,
  wilksScore,
} from '../../src/lib/calculators/formulas';

describe('mifflinStJeorBmr', () => {
  it('matches the published formula for a male', () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 800+1125-150+5 = 1780
    expect(mifflinStJeorBmr('male', 80, 180, 30)).toBe(1780);
  });

  it('matches the published formula for a female', () => {
    // 10*60 + 6.25*165 - 5*25 - 161 = 600+1031.25-125-161 = 1345.25 -> 1345
    expect(mifflinStJeorBmr('female', 60, 165, 25)).toBe(1345);
  });
});

describe('calculateTdee', () => {
  it('applies the activity multiplier and goal adjustment on top of BMR', () => {
    const result = calculateTdee('male', 80, 180, 30, 'sedentary', 'maintain');
    expect(result.bmr).toBe(1780);
    expect(result.tdee).toBe(Math.round(1780 * 1.2));
    expect(result.calorieTarget).toBe(result.tdee);
  });

  it('cuts calories below TDEE for a cut goal', () => {
    const result = calculateTdee('male', 80, 180, 30, 'sedentary', 'cut');
    expect(result.calorieTarget).toBeLessThan(result.tdee);
  });

  it('raises calories above TDEE for a bulk goal', () => {
    const result = calculateTdee('male', 80, 180, 30, 'sedentary', 'bulk');
    expect(result.calorieTarget).toBeGreaterThan(result.tdee);
  });
});

describe('calculateMacros', () => {
  it('splits calories so protein + fat + carbs account for the target', () => {
    const macros = calculateMacros(2500, 80, 'maintain');
    const total = macros.proteinG * 4 + macros.fatG * 9 + macros.carbsG * 4;
    // Independent rounding of each macro can drift the sum by a couple kcal.
    expect(total).toBeLessThanOrEqual(2505);
    expect(total).toBeGreaterThan(2450);
  });

  it('never returns negative carbs when protein+fat exceed the target', () => {
    const macros = calculateMacros(500, 150, 'cut');
    expect(macros.carbsG).toBe(0);
  });
});

describe('estimateOneRepMax', () => {
  it('returns the input weight for a single rep', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
  });

  it('applies the Epley formula for multiple reps', () => {
    // 100 * (1 + 5/30) = 116.666... -> 116.7
    expect(estimateOneRepMax(100, 5)).toBe(116.7);
  });
});

describe('bodyFatNavy', () => {
  it('computes a plausible body-fat percentage for a male', () => {
    const bf = bodyFatNavy('male', 180, 38, 85);
    expect(bf).toBeGreaterThan(5);
    expect(bf).toBeLessThan(35);
  });

  it('computes a plausible body-fat percentage for a female using hip measurement', () => {
    const bf = bodyFatNavy('female', 165, 32, 75, 95);
    expect(bf).toBeGreaterThan(5);
    expect(bf).toBeLessThan(45);
  });
});

describe('calculatePlates', () => {
  it('breaks down a target weight into plates per side with no remainder', () => {
    const result = calculatePlates(100, 20, [25, 20, 15, 10, 5, 2.5, 1.25]);
    // (100-20)/2 = 40 per side -> greedy from largest: 25 + 15 = 40
    expect(result.perSideKg[25]).toBe(1);
    expect(result.perSideKg[15]).toBe(1);
    expect(result.remainderKg).toBe(0);
    expect(result.totalKg).toBe(100);
  });

  it('reports a remainder when the target cannot be hit exactly', () => {
    const result = calculatePlates(21, 20, [25, 20]);
    expect(result.remainderKg).toBeGreaterThan(0);
  });

  it('never goes negative when the target is below the bar weight', () => {
    const result = calculatePlates(10, 20, [25, 20]);
    expect(result.totalKg).toBe(20);
    expect(Object.keys(result.perSideKg)).toHaveLength(0);
  });
});

describe('calculateWaterIntakeLiters', () => {
  it('adds a training-day bump on top of the bodyweight baseline', () => {
    const rest = calculateWaterIntakeLiters(80, false);
    const training = calculateWaterIntakeLiters(80, true);
    expect(training).toBeGreaterThan(rest);
  });
});

describe('wilksScore and dotsScore', () => {
  it('increases as total lifted increases, for the same bodyweight', () => {
    const low = wilksScore('male', 80, 300);
    const high = wilksScore('male', 80, 500);
    expect(high).toBeGreaterThan(low);
  });

  it('returns a positive finite score for typical inputs', () => {
    expect(dotsScore('female', 60, 250)).toBeGreaterThan(0);
    expect(Number.isFinite(dotsScore('female', 60, 250))).toBe(true);
  });
});
