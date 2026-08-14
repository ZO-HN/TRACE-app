// Builds a day-by-day series combining calories, whether the trainee
// trained, and bodyweight — Tracked's pitch is showing nutrition and
// training "side by side on the same timeline"; TRACE had them as
// separate dashboard cards with no correlation view at all.

export interface DailyCorrelationPoint {
  date: string; // YYYY-MM-DD
  calories: number;
  trained: boolean;
  bodyweightKg: number | null;
}

function dateKeysBack(days: number, today: Date): string[] {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

export function buildCorrelationSeries(
  nutritionEntries: { logged_at: string; calories: number | null }[],
  trainingDates: string[],
  bodyweightEntries: { recorded_date: string; weight_kg: number }[],
  days: number,
  today: Date = new Date(),
): DailyCorrelationPoint[] {
  const caloriesByDate = new Map<string, number>();
  for (const entry of nutritionEntries) {
    const key = entry.logged_at.slice(0, 10);
    caloriesByDate.set(key, (caloriesByDate.get(key) ?? 0) + (entry.calories ?? 0));
  }

  const trainedDates = new Set(trainingDates.map((d) => d.slice(0, 10)));
  const bodyweightByDate = new Map(bodyweightEntries.map((e) => [e.recorded_date, e.weight_kg]));

  return dateKeysBack(days, today).map((date) => ({
    date,
    calories: caloriesByDate.get(date) ?? 0,
    trained: trainedDates.has(date),
    bodyweightKg: bodyweightByDate.get(date) ?? null,
  }));
}

export interface CorrelationInsight {
  avgCaloriesTrainingDays: number | null;
  avgCaloriesRestDays: number | null;
}

/** Simple, honest comparison — not a statistical claim, just the two
 * averages side by side so a trainee can eyeball whether they eat
 * differently on training days. */
export function compareTrainingVsRestCalories(points: DailyCorrelationPoint[]): CorrelationInsight {
  const training = points.filter((p) => p.trained && p.calories > 0);
  const rest = points.filter((p) => !p.trained && p.calories > 0);

  const avg = (rows: DailyCorrelationPoint[]) =>
    rows.length === 0 ? null : Math.round(rows.reduce((sum, r) => sum + r.calories, 0) / rows.length);

  return { avgCaloriesTrainingDays: avg(training), avgCaloriesRestDays: avg(rest) };
}
