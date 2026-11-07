export type PlannedFood = { food_id: string; name: string; serving_size: string | null; servings: number; protein_g: number; carbs_g: number; fat_g: number; calories: number };
export type PlannedMeal = { name: string; items: PlannedFood[] };
export type PlannedDay = { label: string; meals: PlannedMeal[]; protein_g: number; carbs_g: number; fat_g: number; calories: number };
export type PublishedPlan = { id: string; name: string; start_date: string; published_at: string; snapshot: { version: 1; target_calories: number; days: PlannedDay[] } };
export function parsePublishedPlan(raw: unknown): PublishedPlan | null {
  if (raw === null) return null;
  const p = raw as PublishedPlan;
  const fail = (): never => { throw new Error('The published meal plan is invalid. Refresh or contact your coach.'); };
  const number = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
  if (!p || typeof p.id !== 'string' || typeof p.name !== 'string' || typeof p.start_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.start_date) || !Number.isFinite(Date.parse(`${p.start_date}T00:00:00Z`)) || typeof p.published_at !== 'string' || p.snapshot?.version !== 1 || !number(p.snapshot.target_calories) || !Array.isArray(p.snapshot.days) || !p.snapshot.days.length || p.snapshot.days.length > 31) return fail();
  let count = 0;
  for (const day of p.snapshot.days) {
    if (!day || typeof day.label !== 'string' || !Array.isArray(day.meals) || !day.meals.length || day.meals.length > 20 || !['protein_g','carbs_g','fat_g','calories'].every(k => number(day[k as keyof PlannedDay]))) return fail();
    for (const meal of day.meals) {
      if (!meal || typeof meal.name !== 'string' || !Array.isArray(meal.items) || !meal.items.length || meal.items.length > 50) return fail();
      for (const food of meal.items) {
        if (++count > 500 || !food || typeof food.food_id !== 'string' || typeof food.name !== 'string' || (food.serving_size !== null && typeof food.serving_size !== 'string') || !number(food.servings) || food.servings <= 0 || food.servings > 100 || !['protein_g','carbs_g','fat_g','calories'].every(k => number(food[k as keyof PlannedFood])) || food.protein_g > 99999.9 || food.carbs_g > 99999.9 || food.fat_g > 99999.9 || food.calories > 2147483647 || !Number.isInteger(food.calories)) return fail();
      }
    }
  }
  return p;
}
export function planDayIndex(start: string, today: string): number {
  // UTC date-only arithmetic avoids daylight-saving days of 23/25 hours.
  return Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000);
}
