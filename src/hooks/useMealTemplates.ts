// Nutrition catalog operations require a connection; food logging uses the durable outbox.

import { useCallback } from 'react';
import { useNutritionCatalog } from './useNutritionCatalog';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../lib/supabase';
import type { MealTemplate, MealTemplateItem } from '../lib/nutrition/types';

interface TemplateRow {
  id: string;
  name: string;
  meal_template_items: MealTemplateItem[];
}

export interface UseMealTemplates {
  templates: MealTemplate[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  saveTemplate: (name: string, items: MealTemplateItem[]) => Promise<{ ok: boolean; error?: string }>;
}

export function useMealTemplates(userId: string): UseMealTemplates {
  const { rows, isLoading, error, refresh } = useNutritionCatalog<TemplateRow>('meal_templates', 'id, name, meal_template_items(name, protein_g, carbs_g, fat_g, calories)', userId);
  const templates = rows.map((row) => ({ id: row.id, name: row.name, items: row.meal_template_items ?? [] }));

  const saveTemplate = useCallback(
    async (name: string, items: MealTemplateItem[]) => {
      const trimmed = name.trim();
      if (!trimmed) return { ok: false, error: 'Meal name is required.' };
      if (items.length === 0) return { ok: false, error: 'Add at least one food first.' };

      const templateId = randomUUID();
      const { error: templateError } = await supabase
        .from('meal_templates')
        .insert({ id: templateId, user_id: userId, name: trimmed });
      if (templateError) return { ok: false, error: templateError.message };

      const { error: itemsError } = await supabase.from('meal_template_items').insert(
        items.map((item, order) => ({
          id: randomUUID(),
          meal_template_id: templateId,
          order,
          ...item,
        })),
      );
      if (itemsError) return { ok: false, error: itemsError.message };

      await refresh();
      return { ok: true };
    },
    [userId, refresh],
  );

  return { templates, isLoading, error, refresh, saveTemplate };
}
