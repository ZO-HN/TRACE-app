// Saved meal templates (Meals tab) — a named bundle of food snapshots the
// trainee can re-log in one tap. Direct writes, degrades to empty until
// meal_templates/meal_template_items exist. See
// docs/migrations-drafts/003_nutrition_extensions.sql.

import { useCallback, useEffect, useState } from 'react';
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
  saveTemplate: (name: string, items: MealTemplateItem[]) => Promise<{ ok: boolean; error?: string }>;
}

export function useMealTemplates(userId: string): UseMealTemplates {
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('meal_templates')
      .select('id, name, meal_template_items(name, protein_g, carbs_g, fat_g, calories)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    setTemplates(
      error
        ? []
        : ((data as TemplateRow[]) ?? []).map((row) => ({
            id: row.id,
            name: row.name,
            items: row.meal_template_items ?? [],
          })),
    );
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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

  return { templates, isLoading, saveTemplate };
}
