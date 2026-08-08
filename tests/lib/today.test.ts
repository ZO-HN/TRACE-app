import { describe, expect, it } from 'vitest';
import { buildDateStrip, sumTodayMacros } from '../../src/lib/dashboard/today';

describe('buildDateStrip', () => {
  it('centers on today with the requested range, marking today', () => {
    const today = new Date('2026-08-07T12:00:00Z');
    const days = buildDateStrip(today, 2, 2);
    expect(days).toHaveLength(5);
    expect(days.map((d) => d.day)).toEqual([5, 6, 7, 8, 9]);
    expect(days.filter((d) => d.isToday)).toEqual([{ date: '2026-08-07', day: 7, isToday: true }]);
  });
});

describe('sumTodayMacros', () => {
  const today = new Date('2026-08-07T12:00:00Z');

  it('sums only entries logged today', () => {
    const entries = [
      { logged_at: '2026-08-07T09:00:00Z', calories: 400, protein_g: 30, carbs_g: 40, fat_g: 10 },
      { logged_at: '2026-08-07T18:00:00Z', calories: 600, protein_g: 40, carbs_g: 50, fat_g: 20 },
      { logged_at: '2026-08-06T18:00:00Z', calories: 999, protein_g: 99, carbs_g: 99, fat_g: 99 },
    ];
    expect(sumTodayMacros(entries, today)).toEqual({
      calories: 1000,
      protein_g: 70,
      carbs_g: 90,
      fat_g: 30,
      hasAny: true,
    });
  });

  it('reports hasAny=false and zeros with no entries today', () => {
    expect(sumTodayMacros([], today)).toEqual({
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      hasAny: false,
    });
  });

  it('treats null macro fields as 0', () => {
    const entries = [
      { logged_at: '2026-08-07T09:00:00Z', calories: null, protein_g: null, carbs_g: 20, fat_g: null },
    ];
    expect(sumTodayMacros(entries, today)).toEqual({
      calories: 0,
      protein_g: 0,
      carbs_g: 20,
      fat_g: 0,
      hasAny: true,
    });
  });
});
