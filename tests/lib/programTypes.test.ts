import { describe, expect, it } from 'vitest';
import { enrollmentProgressPct } from '../../src/lib/programs/types';

const enrollment = (overrides: Partial<Parameters<typeof enrollmentProgressPct>[0]> = {}) => ({
  id: 'e1',
  programId: 'p1',
  startedAt: '2026-01-01',
  completedAt: null,
  currentWeek: 1,
  currentDay: 1,
  ...overrides,
});

describe('enrollmentProgressPct', () => {
  it('returns 0 at the very start of a program', () => {
    expect(enrollmentProgressPct(enrollment(), 4)).toBe(0);
  });

  it('returns 100 once completedAt is set, regardless of current position', () => {
    expect(enrollmentProgressPct(enrollment({ completedAt: '2026-02-01', currentWeek: 1, currentDay: 1 }), 4)).toBe(
      100,
    );
  });

  it('scales linearly through the program by elapsed days', () => {
    // Week 3 day 4 of a 4-week (28-day) program: (2*7 + 3) = 17 of 28 days elapsed
    const result = enrollmentProgressPct(enrollment({ currentWeek: 3, currentDay: 4 }), 4);
    expect(result).toBe(Math.round((17 / 28) * 100));
  });

  it('never divides by zero for a zero-week program', () => {
    expect(enrollmentProgressPct(enrollment(), 0)).toBe(0);
  });
});
