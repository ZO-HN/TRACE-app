import { describe, expect, it } from 'vitest';
import { groupByMonth } from '../../src/lib/bodyweight/groupByMonth';

describe('groupByMonth', () => {
  it('groups most-recent-first entries by calendar month, preserving order', () => {
    const entries = [
      { recorded_date: '2026-08-07', weight_kg: 81 },
      { recorded_date: '2026-08-01', weight_kg: 80 },
      { recorded_date: '2026-07-31', weight_kg: 82 },
      { recorded_date: '2026-07-01', weight_kg: 79 },
    ];

    const groups = groupByMonth(entries);
    expect(groups.map((g) => g.key)).toEqual(['2026-08', '2026-07']);
    expect(groups[0].label).toBe('August 2026');
    expect(groups[0].entries).toHaveLength(2);
    expect(groups[1].entries).toHaveLength(2);
  });

  it('returns an empty array for no entries', () => {
    expect(groupByMonth([])).toEqual([]);
  });
});
