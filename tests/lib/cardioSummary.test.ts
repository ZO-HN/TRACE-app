import { describe, expect, it } from 'vitest';
import {
  buildWeeklyBuckets,
  formatMinSec,
  groupByDay,
  longestDuration,
  thisWeekStats,
} from '../../src/lib/cardio/summary';
import type { CardioEntry } from '../../src/lib/cardio/types';

const entry = (id: string, entryDate: string, durationSeconds: number): CardioEntry => ({
  id,
  cardioExerciseId: 'ex1',
  entryDate,
  durationSeconds,
});

describe('formatMinSec', () => {
  it('formats seconds as M:SS', () => {
    expect(formatMinSec(600)).toBe('10:00');
    expect(formatMinSec(65)).toBe('1:05');
    expect(formatMinSec(0)).toBe('0:00');
  });
});

describe('buildWeeklyBuckets', () => {
  it('produces weekCount buckets ending with the current week', () => {
    // 2026-08-09 is a Sunday
    const today = new Date('2026-08-09T12:00:00');
    const entries = [entry('a', '2026-08-09', 600), entry('b', '2026-08-08', 60)];
    const buckets = buildWeeklyBuckets(entries, today, 12);
    expect(buckets).toHaveLength(12);
    // Both entries fall in the week of Mon 2026-08-03 (contains Aug 8-9)
    expect(buckets[11].weekStart).toBe('2026-08-03');
    expect(buckets[11].totalSeconds).toBe(660);
    expect(buckets[0].totalSeconds).toBe(0);
  });
});

describe('thisWeekStats', () => {
  it('sums totalSeconds and counts distinct active days in the current week', () => {
    const today = new Date('2026-08-09T12:00:00'); // Sunday, week is Aug 3-9
    const entries = [
      entry('a', '2026-08-09', 600),
      entry('b', '2026-08-09', 60),
      entry('c', '2026-08-08', 120),
      entry('d', '2026-07-20', 999), // outside the window
    ];
    expect(thisWeekStats(entries, today)).toEqual({ totalSeconds: 780, activeDays: 2 });
  });
});

describe('longestDuration', () => {
  it('returns the max duration across entries', () => {
    expect(longestDuration([entry('a', '2026-08-01', 100), entry('b', '2026-08-02', 300)])).toBe(
      300,
    );
  });

  it('returns 0 for no entries', () => {
    expect(longestDuration([])).toBe(0);
  });
});

describe('groupByDay', () => {
  it('aggregates by entry_date, most-recent-first', () => {
    const entries = [
      entry('a', '2026-08-08', 100),
      entry('b', '2026-08-09', 200),
      entry('c', '2026-08-08', 50),
    ];
    expect(groupByDay(entries)).toEqual([
      { date: '2026-08-09', activityCount: 1, totalSeconds: 200 },
      { date: '2026-08-08', activityCount: 2, totalSeconds: 150 },
    ]);
  });
});
