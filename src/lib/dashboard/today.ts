// Pure helpers for the dashboard's date strip and today's nutrition totals.
// Framework-free so they're testable without rendering anything.

export interface DateStripDay {
  date: string; // YYYY-MM-DD
  day: number;
  isToday: boolean;
}

/** `daysBefore`/`daysAfter` around `today` (both inclusive of today). */
export function buildDateStrip(today: Date, daysBefore = 3, daysAfter = 3): DateStripDay[] {
  const todayKey = today.toISOString().slice(0, 10);
  const days: DateStripDay[] = [];
  for (let offset = -daysBefore; offset <= daysAfter; offset++) {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    const key = d.toISOString().slice(0, 10);
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
  const todayKey = today.toISOString().slice(0, 10);
  const todays = entries.filter((e) => e.logged_at.slice(0, 10) === todayKey);

  return {
    calories: todays.reduce((sum, e) => sum + (e.calories ?? 0), 0),
    protein_g: todays.reduce((sum, e) => sum + (e.protein_g ?? 0), 0),
    carbs_g: todays.reduce((sum, e) => sum + (e.carbs_g ?? 0), 0),
    fat_g: todays.reduce((sum, e) => sum + (e.fat_g ?? 0), 0),
    hasAny: todays.length > 0,
  };
}
