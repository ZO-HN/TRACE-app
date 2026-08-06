// Shared "log this food" action for the Favorites/Custom/Supplements/Meals
// tabs — enqueues a nutrition_logs insert through the offline outbox, same
// path as useNutritionLogs' quick-add.

import { useCallback } from 'react';
import { randomUUID } from 'expo-crypto';
import { useOutboxStore } from '../lib/outbox/outboxStore';
import { toNutritionLogFromFood } from '../lib/nutrition/mapFoodToLog';
import type { FoodMacros } from '../lib/nutrition/types';

export function useLogFood(userId: string) {
  const enqueueNutritionLog = useOutboxStore((s) => s.enqueueNutritionLog);

  return useCallback(
    async (name: string, macros: FoodMacros) => {
      const payload = toNutritionLogFromFood(randomUUID(), userId, name, macros);
      await enqueueNutritionLog(payload);
    },
    [userId, enqueueNutritionLog],
  );
}
