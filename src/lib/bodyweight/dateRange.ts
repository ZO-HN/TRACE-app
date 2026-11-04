import { localDate } from '../localDate';
import type { WeightPoint } from './chartPoints';

export function weightRange<T extends WeightPoint>(entries: T[], days: number, now = new Date()): T[] {
  const start = new Date(now);
  start.setDate(start.getDate() - days + 1);
  const first = localDate(start);
  const last = localDate(now);
  return entries.filter((entry) => entry.recorded_date >= first && entry.recorded_date <= last)
    .sort((a, b) => b.recorded_date.localeCompare(a.recorded_date));
}
