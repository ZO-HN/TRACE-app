import { expect, it } from 'vitest';
import { weightRange } from '../../src/lib/bodyweight/dateRange';

it('includes the full selected calendar range, excluding older and future entries', () => {
  const entries = ['2026-10-09', '2026-10-02', '2026-10-01', '2026-10-08'].map((recorded_date) => ({ recorded_date, weight_kg: 80 }));
  expect(weightRange(entries, 7, new Date(2026, 9, 8)).map((entry) => entry.recorded_date)).toEqual(['2026-10-08', '2026-10-02']);
});

it('handles year boundaries and empty periods', () => {
  const entries = [{ recorded_date: '2025-12-31', weight_kg: 80 }];
  expect(weightRange(entries, 7, new Date(2026, 0, 2))).toEqual(entries);
  expect(weightRange(entries, 7, new Date(2026, 2, 2))).toEqual([]);
});
