import { describe, expect, it } from 'vitest';
import { predictNextSet } from '../../src/lib/workout/suggestNextSet';

describe('predictNextSet', () => {
  it('returns low confidence and no rep suggestion when there is no history', () => {
    const result = predictNextSet({ reference: null, setsCompletedThisSession: 0 });
    expect(result.reason).toBe('no_history');
    expect(result.suggested_reps).toBeNull();
    expect(result.confidence).toBe('low');
  });

  it('suggests one more rep than last time when holding weight steady', () => {
    const result = predictNextSet({
      reference: { weight_kg: 100, reps: 8, rpe: 7 },
      setsCompletedThisSession: 0,
    });
    expect(result.reason).toBe('hold');
    expect(result.suggested_reps).toBe(9);
  });

  it('decays suggested reps as more sets accumulate this session', () => {
    const fresh = predictNextSet({
      reference: { weight_kg: 100, reps: 8, rpe: 7 },
      setsCompletedThisSession: 0,
    });
    const fatigued = predictNextSet({
      reference: { weight_kg: 100, reps: 8, rpe: 7 },
      setsCompletedThisSession: 4,
    });
    expect(fatigued.suggested_reps!).toBeLessThan(fresh.suggested_reps!);
  });

  it('never suggests fewer than 1 rep no matter how much fatigue decay applies', () => {
    const result = predictNextSet({
      reference: { weight_kg: 100, reps: 8, rpe: 7 },
      setsCompletedThisSession: 40,
    });
    expect(result.suggested_reps).toBeGreaterThanOrEqual(1);
  });

  it('applies the calibration multiplier to the suggested weight', () => {
    const boosted = predictNextSet({
      reference: { weight_kg: 100, reps: 8, rpe: 5 },
      setsCompletedThisSession: 0,
      calibrationMultiplier: 1.1,
    });
    const neutral = predictNextSet({
      reference: { weight_kg: 100, reps: 8, rpe: 5 },
      setsCompletedThisSession: 0,
      calibrationMultiplier: 1,
    });
    expect(boosted.suggested_weight_kg).toBeGreaterThan(neutral.suggested_weight_kg);
  });

  it('reports low confidence when the reference set has no RPE recorded', () => {
    const result = predictNextSet({
      reference: { weight_kg: 100, reps: 8, rpe: null },
      setsCompletedThisSession: 0,
    });
    expect(result.confidence).toBe('low');
  });

  it('reports high confidence early in a session with a rated reference set', () => {
    const result = predictNextSet({
      reference: { weight_kg: 100, reps: 8, rpe: 7 },
      setsCompletedThisSession: 1,
    });
    expect(result.confidence).toBe('high');
  });
});
