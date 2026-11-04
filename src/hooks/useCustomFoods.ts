// Nutrition catalog operations require a connection; food logging uses the durable outbox.

import { useCallback } from 'react';
import { useNutritionCatalog } from './useNutritionCatalog';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../lib/supabase';
import type { CustomFood, FoodMacros } from '../lib/nutrition/types';

export interface UseCustomFoods {
  foods: CustomFood[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createFood: (name: string, macros: FoodMacros) => Promise<{ ok: boolean; error?: string }>;
}

export function useCustomFoods(userId: string): UseCustomFoods {
  const { rows, isLoading, error, refresh } = useNutritionCatalog<CustomFood>('custom_foods', 'id, name, protein_g, carbs_g, fat_g, calories', userId);
  const foods = rows;

  const createFood = useCallback(
    async (name: string, macros: FoodMacros) => {
      const trimmed = name.trim();
      if (!trimmed) return { ok: false, error: 'Food name is required.' };
      const { error } = await supabase
        .from('custom_foods')
        .insert({ id: randomUUID(), user_id: userId, name: trimmed, ...macros });
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    },
    [userId, refresh],
  );

  return { foods, isLoading, error, refresh, createFood };
}
