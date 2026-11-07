// Nutrition catalog operations require a connection; food logging uses the durable outbox.

import { useCallback } from 'react';
import { savePersonalMeal } from '../lib/nutrition/saveMeal';
import { useNutritionCatalog } from './useNutritionCatalog';
import type { MealTemplate, MealTemplateItem } from '../lib/nutrition/types';

interface TemplateRow {
  id: string;
  name: string;
  meal_template_items: (MealTemplateItem & { order: number })[];
}

export interface UseMealTemplates {
  templates: MealTemplate[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  saveTemplate: (name: string, items: MealTemplateItem[]) => Promise<{ ok: boolean; error?: string }>;
}

export function useMealTemplates(userId: string): UseMealTemplates {
  const { rows, isLoading, error, refresh } = useNutritionCatalog<TemplateRow>('meal_templates', 'id, name, meal_template_items(name, protein_g, carbs_g, fat_g, calories, order)', userId);
  const templates = rows.map((row) => ({ id: row.id, name: row.name, items: [...(row.meal_template_items ?? [])].sort((a,b)=>a.order-b.order).map(({order:_order,...item})=>item) }));

  const saveTemplate = useCallback(
    async (name: string, items: MealTemplateItem[]) => {
      try {
        await savePersonalMeal(userId, name, items);
      } catch (error) { return { ok: false, error: error instanceof Error ? error.message : 'Could not save meal.' }; }

      await refresh();
      return { ok: true };
    },
    [userId, refresh],
  );

  return { templates, isLoading, error, refresh, saveTemplate };
}
