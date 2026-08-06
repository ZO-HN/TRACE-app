// User-created custom foods (Custom tab of Add to Meal). Catalog/setup
// writes — not on the offline-critical logging path, so direct writes are
// fine (same reasoning as bodyweight settings / workout folders). Degrades
// to an empty list until custom_foods exists — see
// docs/migrations-drafts/003_nutrition_extensions.sql.

import { useCallback, useEffect, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../lib/supabase';
import type { CustomFood, FoodMacros } from '../lib/nutrition/types';

export interface UseCustomFoods {
  foods: CustomFood[];
  isLoading: boolean;
  createFood: (name: string, macros: FoodMacros) => Promise<{ ok: boolean; error?: string }>;
}

export function useCustomFoods(userId: string): UseCustomFoods {
  const [foods, setFoods] = useState<CustomFood[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('custom_foods')
      .select('id, name, protein_g, carbs_g, fat_g, calories')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    setFoods(error ? [] : ((data as CustomFood[]) ?? []));
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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

  return { foods, isLoading, createFood };
}
