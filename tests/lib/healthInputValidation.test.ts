import { describe, expect, it } from 'vitest';
import { isValidCardioDuration, isValidSteps } from '../../src/lib/health/inputValidation';

describe('health input validation', () => {
  it('accepts realistic whole-number steps', () => {
    expect(isValidSteps(0)).toBe(true);
    expect(isValidSteps(200_000)).toBe(true);
    expect(isValidSteps(12.5)).toBe(false);
    expect(isValidSteps(-1)).toBe(false);
    expect(isValidSteps(200_001)).toBe(false);
  });

  it('accepts cardio durations within one day', () => {
    expect(isValidCardioDuration(1)).toBe(true);
    expect(isValidCardioDuration(86_400)).toBe(true);
    expect(isValidCardioDuration(0)).toBe(false);
    expect(isValidCardioDuration(90.5)).toBe(false);
    expect(isValidCardioDuration(86_401)).toBe(false);
  });
});
