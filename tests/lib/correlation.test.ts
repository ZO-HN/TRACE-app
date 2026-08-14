import { describe, expect, it } from 'vitest';
import { buildCorrelationSeries, compareTrainingVsRestCalories } from '../../src/lib/nutrition/correlation';

const TODAY = new Date('2026-08-15T12:00:00Z');

describe('buildCorrelationSeries', () => {
  it('returns exactly `days` points ending today, oldest first', () => {
    const series = buildCorrelationSeries([], [], [], 3, TODAY);
    expect(series.map((p) => p.date)).toEqual(['2026-08-13', '2026-08-14', '2026-08-15']);
  });

  it('sums same-day calories across multiple nutrition entries', () => {
    const series = buildCorrelationSeries(
      [
        { logged_at: '2026-08-15T08:00:00Z', calories: 400 },
        { logged_at: '2026-08-15T18:00:00Z', calories: 600 },
      ],
      [],
      [],
      1,
      TODAY,
    );
    expect(series[0].calories).toBe(1000);
  });

  it('treats a missing day as zero calories, not a gap', () => {
    const series = buildCorrelationSeries([], [], [], 1, TODAY);
    expect(series[0].calories).toBe(0);
  });

  it('marks a day trained when a session completed_at falls on it', () => {
    const series = buildCorrelationSeries([], ['2026-08-15T09:00:00Z'], [], 1, TODAY);
    expect(series[0].trained).toBe(true);
  });

  it('leaves bodyweight null on days with no logged entry', () => {
    const series = buildCorrelationSeries([], [], [{ recorded_date: '2026-08-14', weight_kg: 80 }], 2, TODAY);
    expect(series[0].bodyweightKg).toBe(80);
    expect(series[1].bodyweightKg).toBeNull();
  });
});

describe('compareTrainingVsRestCalories', () => {
  it('averages calories separately for training vs. rest days', () => {
    const points = [
      { date: '2026-08-13', calories: 3000, trained: true, bodyweightKg: null },
      { date: '2026-08-14', calories: 2600, trained: true, bodyweightKg: null },
      { date: '2026-08-15', calories: 2000, trained: false, bodyweightKg: null },
    ];
    const result = compareTrainingVsRestCalories(points);
    expect(result.avgCaloriesTrainingDays).toBe(2800);
    expect(result.avgCaloriesRestDays).toBe(2000);
  });

  it('returns null for a side with no logged days, instead of dividing by zero', () => {
    const points = [{ date: '2026-08-15', calories: 2000, trained: false, bodyweightKg: null }];
    const result = compareTrainingVsRestCalories(points);
    expect(result.avgCaloriesTrainingDays).toBeNull();
    expect(result.avgCaloriesRestDays).toBe(2000);
  });

  it('ignores unlogged (zero-calorie) days on both sides', () => {
    const points = [
      { date: '2026-08-14', calories: 0, trained: true, bodyweightKg: null },
      { date: '2026-08-15', calories: 2000, trained: false, bodyweightKg: null },
    ];
    const result = compareTrainingVsRestCalories(points);
    expect(result.avgCaloriesTrainingDays).toBeNull();
  });
});
