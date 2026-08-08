import { describe, expect, it } from 'vitest';
import {
  averageHours,
  averageQuality,
  bestNight,
  durationHours,
  formatHours,
  lastNight,
  worstNight,
} from '../../src/lib/sleep/summary';
import type { SleepLog } from '../../src/lib/sleep/types';

const log = (
  id: string,
  sleepDate: string,
  bedtime: string,
  wakeTime: string,
  quality: SleepLog['quality'] = 4,
): SleepLog => ({ id, sleepDate, bedtime, wakeTime, quality });

describe('durationHours', () => {
  it('computes hours between bedtime and wake', () => {
    const l = log('a', '2026-08-09', '2026-08-08T22:57:00Z', '2026-08-09T06:57:00Z');
    expect(durationHours(l)).toBe(8);
  });

  it('clamps negative durations to 0 (bad data)', () => {
    const l = log('a', '2026-08-09', '2026-08-09T06:00:00Z', '2026-08-08T22:00:00Z');
    expect(durationHours(l)).toBe(0);
  });
});

describe('formatHours', () => {
  it('formats whole hours without minutes', () => {
    expect(formatHours(8)).toBe('8h');
  });

  it('formats partial hours with minutes', () => {
    expect(formatHours(7.5)).toBe('7h 30m');
  });
});

describe('averageHours', () => {
  const today = new Date('2026-08-09T12:00:00');

  it('averages only logs within the window', () => {
    const logs = [
      log('a', '2026-08-09', '2026-08-08T22:00:00Z', '2026-08-09T06:00:00Z'), // 8h
      log('b', '2026-08-08', '2026-08-07T22:00:00Z', '2026-08-08T04:00:00Z'), // 6h
      log('c', '2026-06-01', '2026-05-31T22:00:00Z', '2026-06-01T06:00:00Z'), // outside window
    ];
    expect(averageHours(logs, today, 7)).toBe(7);
  });

  it('returns null with no logs in the window', () => {
    expect(averageHours([], today, 7)).toBeNull();
  });
});

describe('bestNight / worstNight', () => {
  it('picks the longest/shortest duration', () => {
    const logs = [
      log('a', '2026-08-09', '2026-08-08T22:00:00Z', '2026-08-09T06:00:00Z'), // 8h
      log('b', '2026-08-08', '2026-08-07T22:00:00Z', '2026-08-08T04:00:00Z'), // 6h
    ];
    expect(bestNight(logs)?.id).toBe('a');
    expect(worstNight(logs)?.id).toBe('b');
  });

  it('returns null for no logs', () => {
    expect(bestNight([])).toBeNull();
    expect(worstNight([])).toBeNull();
  });
});

describe('averageQuality', () => {
  it('averages the quality field', () => {
    const logs = [log('a', '2026-08-09', '', '', 4), log('b', '2026-08-08', '', '', 2)];
    expect(averageQuality(logs)).toBe(3);
  });

  it('returns null for no logs', () => {
    expect(averageQuality([])).toBeNull();
  });
});

describe('lastNight', () => {
  it('returns the most recent log by sleep_date', () => {
    const logs = [log('old', '2026-08-01', '', ''), log('new', '2026-08-09', '', '')];
    expect(lastNight(logs)?.id).toBe('new');
  });

  it('returns null for no logs', () => {
    expect(lastNight([])).toBeNull();
  });
});
