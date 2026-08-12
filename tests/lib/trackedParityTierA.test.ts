import { describe, expect, it } from 'vitest';
import { groupByRepRange } from '../../src/lib/analytics/repRangePRs';
import { netCarbsG } from '../../src/lib/nutrition/netCarbs';
import { compareWeeks } from '../../src/lib/nutrition/weeklySummary';
import { isValidWaterMl } from '../../src/lib/water/types';
import { computeReadiness } from '../../src/lib/readiness/score';
import { suggestNextSet } from '../../src/lib/workout/suggestNextSet';

describe('groupByRepRange', () => {
  it('buckets sets into 1-5 / 6-10 / 11+ and keeps the heaviest per bucket', () => {
    const result = groupByRepRange([
      { weight_kg: 100, reps: 3, achieved_at: '2026-01-01' },
      { weight_kg: 120, reps: 5, achieved_at: '2026-02-01' },
      { weight_kg: 80, reps: 8, achieved_at: '2026-01-15' },
      { weight_kg: 60, reps: 12, achieved_at: '2026-01-20' },
    ]);
    expect(result).toEqual([
      { range: '1-5', best_weight_kg: 120, best_reps: 5, achieved_at: '2026-02-01' },
      { range: '6-10', best_weight_kg: 80, best_reps: 8, achieved_at: '2026-01-15' },
      { range: '11+', best_weight_kg: 60, best_reps: 12, achieved_at: '2026-01-20' },
    ]);
  });

  it('ignores non-positive reps and returns only buckets with data', () => {
    expect(groupByRepRange([{ weight_kg: 50, reps: 0, achieved_at: '2026-01-01' }])).toEqual([]);
    expect(groupByRepRange([])).toEqual([]);
  });
});

describe('netCarbsG', () => {
  it('subtracts fiber from total carbs', () => {
    expect(netCarbsG(40, 10)).toBe(30);
  });
  it('never goes negative', () => {
    expect(netCarbsG(5, 20)).toBe(0);
  });
  it('falls back to raw carbs when fiber is unknown', () => {
    expect(netCarbsG(40, null)).toBe(40);
  });
  it('returns null when carbs are unknown', () => {
    expect(netCarbsG(null, 10)).toBeNull();
  });
});

describe('compareWeeks', () => {
  it('computes this-week vs last-week averages and a delta percentage', () => {
    // Wednesday of "this week"
    const today = new Date('2026-08-12T12:00:00Z'); // a Wednesday
    const entries = [
      // this week (Sun 2026-08-09 .. Sat 2026-08-15)
      { logged_at: '2026-08-10T12:00:00Z', calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 60 },
      { logged_at: '2026-08-11T12:00:00Z', calories: 2200, protein_g: 160, carbs_g: 210, fat_g: 65 },
      // last week (Sun 2026-08-02 .. Sat 2026-08-08)
      { logged_at: '2026-08-03T12:00:00Z', calories: 1800, protein_g: 140, carbs_g: 190, fat_g: 55 },
    ];
    const cmp = compareWeeks(entries, today);
    expect(cmp.thisWeek.daysLogged).toBe(2);
    expect(cmp.thisWeek.avgCalories).toBe(2100);
    expect(cmp.lastWeek.daysLogged).toBe(1);
    expect(cmp.lastWeek.avgCalories).toBe(1800);
    expect(cmp.caloriesDeltaPct).toBe(Math.round(((2100 - 1800) / 1800) * 100));
  });

  it('returns null delta when there is no prior-week data', () => {
    const today = new Date('2026-08-12T12:00:00Z');
    const cmp = compareWeeks(
      [{ logged_at: '2026-08-10T12:00:00Z', calories: 2000, protein_g: 100, carbs_g: 100, fat_g: 50 }],
      today,
    );
    expect(cmp.caloriesDeltaPct).toBeNull();
  });
});

describe('isValidWaterMl', () => {
  it('accepts realistic amounts', () => {
    expect(isValidWaterMl(500)).toBe(true);
    expect(isValidWaterMl(0)).toBe(true);
  });
  it('rejects negative or absurd amounts', () => {
    expect(isValidWaterMl(-1)).toBe(false);
    expect(isValidWaterMl(50_000)).toBe(false);
  });
});

describe('computeReadiness', () => {
  it('is neutral (50) with no data at all', () => {
    const r = computeReadiness({
      lastSleepHours: null,
      lastSleepQuality: null,
      thisWeekVolumeKg: 0,
      avgWeeklyVolumeKg: 0,
    });
    expect(r.hasData).toBe(false);
    expect(r.score).toBe(50);
  });

  it('scores high with good sleep and volume at/below average', () => {
    const r = computeReadiness({
      lastSleepHours: 8,
      lastSleepQuality: 5,
      thisWeekVolumeKg: 1000,
      avgWeeklyVolumeKg: 1200,
    });
    expect(r.hasData).toBe(true);
    expect(r.score).toBeGreaterThan(80);
  });

  it('scores lower with poor sleep and overreaching volume', () => {
    const r = computeReadiness({
      lastSleepHours: 4,
      lastSleepQuality: 1,
      thisWeekVolumeKg: 2400,
      avgWeeklyVolumeKg: 1200,
    });
    expect(r.hasData).toBe(true);
    expect(r.score).toBeLessThan(30);
  });
});

describe('suggestNextSet', () => {
  it('suggests no history when nothing was logged before', () => {
    expect(suggestNextSet(null).reason).toBe('no_history');
  });
  it('suggests increasing weight after an easy set (low RPE)', () => {
    const s = suggestNextSet({ weight_kg: 100, reps: 8, rpe: 5 });
    expect(s.reason).toBe('increase');
    expect(s.suggested_weight_kg).toBeGreaterThan(100);
  });
  it('suggests decreasing weight after a maximal set (high RPE)', () => {
    const s = suggestNextSet({ weight_kg: 100, reps: 8, rpe: 9 });
    expect(s.reason).toBe('decrease');
    expect(s.suggested_weight_kg).toBeLessThan(100);
  });
  it('holds weight for a moderate RPE', () => {
    const s = suggestNextSet({ weight_kg: 100, reps: 8, rpe: 7 });
    expect(s.reason).toBe('hold');
    expect(s.suggested_weight_kg).toBe(100);
  });
});
