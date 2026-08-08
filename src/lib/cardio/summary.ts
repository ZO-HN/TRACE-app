// Pure aggregation for the Cardio overview screen — weekly buckets, this
// week's stats, personal records, and a recent-days breakdown. Framework-free
// so it's testable without rendering anything.

import type { CardioEntry } from './types';

export function formatMinSec(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

/** Monday of the week containing `date`, at local midnight. */
function weekStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
  d.setDate(d.getDate() + diff);
  return d;
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Monday (YYYY-MM-DD) of the week containing `dateKeyStr`. */
export function mondayOf(dateKeyStr: string): string {
  return dateKey(weekStart(new Date(`${dateKeyStr}T00:00:00`)));
}

export interface WeekBucket {
  weekStart: string;
  totalSeconds: number;
}

/** `weekCount` buckets ending with the current week, oldest first. */
export function buildWeeklyBuckets(
  entries: CardioEntry[],
  today: Date,
  weekCount = 12,
): WeekBucket[] {
  const currentWeekStart = weekStart(today);
  const buckets: WeekBucket[] = [];
  for (let i = weekCount - 1; i >= 0; i--) {
    const start = new Date(currentWeekStart);
    start.setDate(start.getDate() - i * 7);
    buckets.push({ weekStart: dateKey(start), totalSeconds: 0 });
  }

  const byWeekStart = new Map(buckets.map((b) => [b.weekStart, b]));
  for (const entry of entries) {
    const entryWeekStart = dateKey(weekStart(new Date(`${entry.entryDate}T00:00:00`)));
    const bucket = byWeekStart.get(entryWeekStart);
    if (bucket) bucket.totalSeconds += entry.durationSeconds;
  }
  return buckets;
}

export interface ThisWeekStats {
  totalSeconds: number;
  activeDays: number;
}

export function thisWeekStats(entries: CardioEntry[], today: Date): ThisWeekStats {
  const start = weekStart(today);
  const startKey = dateKey(start);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const endKey = dateKey(end);

  const thisWeek = entries.filter((e) => e.entryDate >= startKey && e.entryDate <= endKey);
  return {
    totalSeconds: thisWeek.reduce((sum, e) => sum + e.durationSeconds, 0),
    activeDays: new Set(thisWeek.map((e) => e.entryDate)).size,
  };
}

export function longestDuration(entries: CardioEntry[]): number {
  return entries.reduce((max, e) => Math.max(max, e.durationSeconds), 0);
}

export interface DaySummary {
  date: string;
  activityCount: number;
  totalSeconds: number;
}

/** Most-recent-first, one row per distinct entry_date. */
export function groupByDay(entries: CardioEntry[]): DaySummary[] {
  const byDate = new Map<string, DaySummary>();
  for (const entry of entries) {
    const existing = byDate.get(entry.entryDate);
    if (existing) {
      existing.activityCount += 1;
      existing.totalSeconds += entry.durationSeconds;
    } else {
      byDate.set(entry.entryDate, {
        date: entry.entryDate,
        activityCount: 1,
        totalSeconds: entry.durationSeconds,
      });
    }
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}
