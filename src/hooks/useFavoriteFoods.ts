// Favorited foods (Favorites tab of Add to Meal) — denormalized name+macro
// snapshots, direct writes, degrades to empty until favorite_foods exists.
// See docs/migrations-drafts/003_nutrition_extensions.sql.

import { useCallback, useEffect, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../lib/supabase';
import type { FavoriteFood, FoodMacros } from '../lib/nutrition/types';

export interface UseFavoriteFoods {
  favorites: FavoriteFood[];
  isLoading: boolean;
  addFavorite: (name: string, macros: FoodMacros) => Promise<{ ok: boolean; error?: string }>;
  removeFavorite: (id: string) => Promise<{ ok: boolean; error?: string }>;
}

export function useFavoriteFoods(userId: string): UseFavoriteFoods {
  const [favorites, setFavorites] = useState<FavoriteFood[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('favorite_foods')
      .select('id, name, protein_g, carbs_g, fat_g, calories')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    setFavorites(error ? [] : ((data as FavoriteFood[]) ?? []));
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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

  return { favorites, isLoading, addFavorite, removeFavorite };
}
