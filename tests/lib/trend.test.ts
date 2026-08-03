import { describe, expect, it } from 'vitest';
import { latestTrend } from '../../src/lib/bodyweight/trend';

describe('latestTrend', () => {
  it('returns unknown with fewer than 2 entries', () => {
    expect(latestTrend([])).toEqual({ direction: 'unknown', deltaKg: null });
    expect(latestTrend([{ recorded_date: '2026-08-03', weight_kg: 80 }])).toEqual({
      direction: 'unknown',
      deltaKg: null,
    });
  });

  it('detects an increase (entries sorted most-recent-first)', () => {
    const trend = latestTrend([
      { recorded_date: '2026-08-03', weight_kg: 81 },
      { recorded_date: '2026-08-02', weight_kg: 80 },
    ]);
    expect(trend).toEqual({ direction: 'up', deltaKg: 1 });
  });

  it('detects a decrease', () => {
    const trend = latestTrend([
      { recorded_date: '2026-08-03', weight_kg: 79.5 },
      { recorded_date: '2026-08-02', weight_kg: 80 },
    ]);
    expect(trend).toEqual({ direction: 'down', deltaKg: -0.5 });
  });

  it('reports flat when unchanged', () => {
    const trend = latestTrend([
      { recorded_date: '2026-08-03', weight_kg: 80 },
      { recorded_date: '2026-08-02', weight_kg: 80 },
    ]);
    expect(trend).toEqual({ direction: 'flat', deltaKg: 0 });
  });

  it('rounds the delta to 2 decimals to avoid float noise', () => {
    const trend = latestTrend([
      { recorded_date: '2026-08-03', weight_kg: 80.1 },
      { recorded_date: '2026-08-02', weight_kg: 80.0 },
    ]);
    expect(trend.deltaKg).toBe(0.1);
  });
});
