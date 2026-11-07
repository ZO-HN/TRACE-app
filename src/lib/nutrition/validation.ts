import type { NutritionLogInsert } from './types';

// Canonical nutrition_logs uses varchar(280), numeric(6,1), int, and
// a positive smallint meal_slot. Reject before persistence; never truncate.
export function nutritionEntryError(entry: Partial<NutritionLogInsert>): string | null {
  if (entry.description != null && [...entry.description].length > 280) {
    return 'Keep the food description to 280 characters or fewer.';
  }
  for (const key of ['protein_g', 'carbs_g', 'fat_g', 'calories', 'fiber_g', 'sugar_g'] as const) {
    const value = entry[key];
    if (value == null) continue;
    if (!Number.isFinite(value) || value < 0) return 'Calories and macros must be finite and non-negative.';
    if (key === 'calories' && (!Number.isInteger(value) || value > 2147483647)) {
      return 'Calories must be a whole number no greater than 2147483647.';
    }
    if (['protein_g', 'carbs_g', 'fat_g'].includes(key) && value > 99999.9) {
      return 'Each macro must be no greater than 99999.9 grams.';
    }
  }
  if (['protein_g', 'carbs_g', 'fat_g', 'calories'].every((key) => entry[key as keyof NutritionLogInsert] == null)) {
    return 'Enter calories or at least one macro.';
  }
  if (entry.meal_slot != null && (!Number.isInteger(entry.meal_slot) || entry.meal_slot < 1 || entry.meal_slot > 32767)) {
    return 'Choose a meal number between 1 and 32767.';
  }
  return null;
}
