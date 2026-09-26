// Pure helpers for the dashboard's date strip and today's nutrition totals.
// Framework-free so they're testable without rendering anything.

import { localDate } from '../localDate';

export interface DateStripDay {
  date: string; // YYYY-MM-DD
  day: number;
  isToday: boolean;
}

/** `daysBefore`/`daysAfter` around `today` (both inclusive of today). */
export function buildDateStrip(today: Date, daysBefore = 3, daysAfter = 3): DateStripDay[] {
  const todayKey = localDate(today);
  const days: DateStripDay[] = [];
  for (let offset = -daysBefore; offset <= daysAfter; offset++) {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    const key = localDate(d);
    days.push({ date: key, day: d.getDate(), isToday: key === todayKey });
  }
  return days;
}

export interface TodayMacros {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  hasAny: boolean;
}

/** Sums calories/macros for entries whose logged_at falls on `today`. */
export function sumTodayMacros<
  T extends {
    logged_at: string;
    calories: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
  },
>(entries: T[], today: Date): TodayMacros {
  const todayKey = localDate(today);
  const todays = entries.filter((e) => localDate(new Date(e.logged_at)) === todayKey);

  return {
    calories: todays.reduce((sum, e) => sum + (e.calories ?? 0), 0),
    protein_g: todays.reduce((sum, e) => sum + (e.protein_g ?? 0), 0),
    carbs_g: todays.reduce((sum, e) => sum + (e.carbs_g ?? 0), 0),
    fat_g: todays.reduce((sum, e) => sum + (e.fat_g ?? 0), 0),
    hasAny: todays.length > 0,
  };
}
