import { describe, expect, it } from 'vitest';
import { movingAverageAt, rateAt, tenDayLowAt } from '../../src/lib/bodyweight/movingAverage';

const ENTRIES = [
  { recorded_date: '2026-08-07', weight_kg: 81 },
  { recorded_date: '2026-08-06', weight_kg: 80 },
  { recorded_date: '2026-08-05', weight_kg: 82 },
  { recorded_date: '2026-08-04', weight_kg: 79 },
];

describe('movingAverageAt', () => {
  it('averages the window starting at index', () => {
    expect(movingAverageAt(ENTRIES, 0, 7)).toBe(80.5);
  });

  it('returns null past the end of entries', () => {
    expect(movingAverageAt(ENTRIES, 10, 7)).toBeNull();
  });

  it('shrinks the window near the end of the list', () => {
    expect(movingAverageAt(ENTRIES, 3, 7)).toBe(79);
  });
});

describe('tenDayLowAt', () => {
  it('finds the minimum among the next 10 entries', () => {
    expect(tenDayLowAt(ENTRIES, 0)).toBe(79);
  });

  it('returns null past the end of entries', () => {
    expect(tenDayLowAt(ENTRIES, 10)).toBeNull();
  });
});

describe('rateAt', () => {
  it('is null at the oldest point (no prior window to compare)', () => {
    expect(rateAt(ENTRIES, 3, 7)).toBeNull();
  });

  it('computes the delta between successive moving averages', () => {
    const simple = [
      { recorded_date: '2026-08-07', weight_kg: 100 },
      { recorded_date: '2026-08-06', weight_kg: 90 },
    ];
    // avg at 0 (both entries) = 95, avg at 1 (just the older one) = 90 -> rate = +5
    expect(rateAt(simple, 0, 7)).toBe(5);
  });
});
