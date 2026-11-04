import type { Supplement } from '../lib/nutrition/types';
import { useNutritionCatalog } from './useNutritionCatalog';

export function useSupplements() {
  const { rows: supplements, ...state } = useNutritionCatalog<Supplement>('supplements', 'id, name, protein_g, carbs_g, fat_g, calories');
  return { supplements, ...state };
}
