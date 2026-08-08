// Pure aggregation for the Sleep card/overview — duration, rolling
// averages, best/worst night, average quality. Framework-free so it's
// testable without rendering anything.

import type { SleepLog } from './types';

export function durationHours(log: SleepLog): number {
  const ms = new Date(log.wakeTime).getTime() - new Date(log.bedtime).getTime();
  return Math.max(0, ms / 1000 / 60 / 60);
}

/** "8h" or "7h 30m" — whole minutes, no seconds. */
export function formatHours(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function withinLastNDays(log: SleepLog, today: Date, days: number): boolean {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - days);
  return new Date(`${log.sleepDate}T00:00:00`) >= cutoff;
}

export function averageHours(logs: SleepLog[], today: Date, days: number): number | null {
  const inWindow = logs.filter((l) => withinLastNDays(l, today, days));
  if (inWindow.length === 0) return null;
  return inWindow.reduce((sum, l) => sum + durationHours(l), 0) / inWindow.length;
}

export function bestNight(logs: SleepLog[]): SleepLog | null {
  if (logs.length === 0) return null;
  return logs.reduce((best, l) => (durationHours(l) > durationHours(best) ? l : best));
}

export function worstNight(logs: SleepLog[]): SleepLog | null {
  if (logs.length === 0) return null;
  return logs.reduce((worst, l) => (durationHours(l) < durationHours(worst) ? l : worst));
}

export function averageQuality(logs: SleepLog[]): number | null {
  if (logs.length === 0) return null;
  return logs.reduce((sum, l) => sum + l.quality, 0) / logs.length;
}

/** Most recent log by sleep_date, or null if there are none. */
export function lastNight(logs: SleepLog[]): SleepLog | null {
  if (logs.length === 0) return null;
  return [...logs].sort((a, b) => (a.sleepDate < b.sleepDate ? 1 : -1))[0];
}
