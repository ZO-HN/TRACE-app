// Nutrition catalog operations require a connection; food logging uses the durable outbox.

import { useCallback } from 'react';
import { useNutritionCatalog } from './useNutritionCatalog';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../lib/supabase';
import type { FavoriteFood, FoodMacros } from '../lib/nutrition/types';

export interface UseFavoriteFoods {
  favorites: FavoriteFood[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addFavorite: (name: string, macros: FoodMacros) => Promise<{ ok: boolean; error?: string }>;
  removeFavorite: (id: string) => Promise<{ ok: boolean; error?: string }>;
}

export function useFavoriteFoods(userId: string): UseFavoriteFoods {
  const { rows, isLoading, error, refresh } = useNutritionCatalog<FavoriteFood>('favorite_foods', 'id, name, protein_g, carbs_g, fat_g, calories', userId);
  const favorites = rows;

  const addFavorite = useCallback(
    async (name: string, macros: FoodMacros) => {
      const trimmed = name.trim();
      if (!trimmed) return { ok: false, error: 'Food name is required.' };
      const { error } = await supabase
        .from('favorite_foods')
        .insert({ id: randomUUID(), user_id: userId, name: trimmed, ...macros });
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    },
    [userId, refresh],
  );

  const removeFavorite = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('favorite_foods').delete().eq('id', id);
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    },
    [refresh],
  );

  return { favorites, isLoading, error, refresh, addFavorite, removeFavorite };
}
