// Weekly nutrition summary: this week's average calories/macros vs. the
// prior week, for a comparative view (Tracked's "weekly nutrition
// summaries with comparative analysis"). Pure and framework-free.

export interface NutritionSummaryEntry {
  logged_at: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
}

export interface WeekAverages {
  avgCalories: number;
  avgProtein_g: number;
  avgCarbs_g: number;
  avgFat_g: number;
  daysLogged: number;
}

export interface WeeklyComparison {
  thisWeek: WeekAverages;
  lastWeek: WeekAverages;
  caloriesDeltaPct: number | null; // null when lastWeek had no data to compare against
}

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const day = out.getDay(); // 0 = Sunday
  out.setDate(out.getDate() - day);
  return out;
}

function averageByDay(entries: NutritionSummaryEntry[], from: Date, to: Date): WeekAverages {
  const byDay = new Map<
    string,
    { calories: number; protein_g: number; carbs_g: number; fat_g: number }
  >();

  for (const e of entries) {
    const d = new Date(e.logged_at);
    if (d < from || d >= to) continue;
    const key = d.toISOString().slice(0, 10);
    const cur = byDay.get(key) ?? { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
    cur.calories += e.calories ?? 0;
    cur.protein_g += e.protein_g ?? 0;
    cur.carbs_g += e.carbs_g ?? 0;
    cur.fat_g += e.fat_g ?? 0;
    byDay.set(key, cur);
  }

  const days = Array.from(byDay.values());
  const daysLogged = days.length;
  const sum = (pick: (d: { calories: number; protein_g: number; carbs_g: number; fat_g: number }) => number) =>
    days.reduce((s, d) => s + pick(d), 0);

  if (daysLogged === 0) {
    return { avgCalories: 0, avgProtein_g: 0, avgCarbs_g: 0, avgFat_g: 0, daysLogged: 0 };
  }

  return {
    avgCalories: Math.round(sum((d) => d.calories) / daysLogged),
    avgProtein_g: Math.round(sum((d) => d.protein_g) / daysLogged),
    avgCarbs_g: Math.round(sum((d) => d.carbs_g) / daysLogged),
    avgFat_g: Math.round(sum((d) => d.fat_g) / daysLogged),
    daysLogged,
  };
}

/** Compares the current calendar week (Sun-Sat, up to `today`) against the
 * immediately preceding week. */
export function compareWeeks(entries: NutritionSummaryEntry[], today: Date): WeeklyComparison {
  const thisWeekStart = startOfWeek(today);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const nextWeekStart = new Date(thisWeekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);

  const thisWeek = averageByDay(entries, thisWeekStart, nextWeekStart);
  const lastWeek = averageByDay(entries, lastWeekStart, thisWeekStart);

  const caloriesDeltaPct =
    lastWeek.daysLogged === 0 || lastWeek.avgCalories === 0
      ? null
      : Math.round(((thisWeek.avgCalories - lastWeek.avgCalories) / lastWeek.avgCalories) * 100);

  return { thisWeek, lastWeek, caloriesDeltaPct };
}
