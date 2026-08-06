// Builds a nutrition_logs insert payload directly from known macros (a
// favorite, custom food, supplement, or meal-template item), as opposed to
// mapQuickEntry.ts which parses macros out of free text.

import type { FoodMacros, NutritionLogInsert, NutritionMethod } from './types';

export function toNutritionLogFromFood(
  id: string,
  userId: string,
  name: string,
  macros: FoodMacros,
  method: NutritionMethod = 'TYPED',
): NutritionLogInsert {
  return {
    id,
    user_id: userId,
    method,
    description: name,
    protein_g: macros.protein_g,
    carbs_g: macros.carbs_g,
    fat_g: macros.fat_g,
    calories: macros.calories,
  };
}
