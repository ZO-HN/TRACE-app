// Types for nutrition logging. Barcode/photo are recorded methods but not
// yet resolved to macros anywhere in this codebase — see the migration
// comment on nutrition_logs for why.

export type NutritionMethod = 'TYPED' | 'BARCODE' | 'PHOTO';

export interface NutritionLogInsert {
  id: string;
  user_id: string;
  method: NutritionMethod;
  description?: string | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  calories?: number | null;
  photo_s3_key?: string | null;
  /** Added in docs/migrations-drafts/008_tracked_parity_tier_a.sql — not
   * live everywhere yet. Only send these keys when the caller actually set
   * them (see netCarbs.ts), same "no unknown column" caution as set_logs'
   * Tier A fields in mapSetLog.ts. */
  fiber_g?: number | null;
  sugar_g?: number | null;
}

// The following four map to draft tables — see
// docs/migrations-drafts/003_nutrition_extensions.sql. None exist yet;
// their hooks (useCustomFoods, useFavoriteFoods, useSupplements,
// useMealTemplates) degrade to an empty list until applied.

export interface FoodMacros {
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  calories: number | null;
}

export interface CustomFood extends FoodMacros {
  id: string;
  name: string;
}

/** A favorited food — a denormalized name+macro snapshot, not a pointer
 * into custom_foods/nutrition_logs, so favoriting never breaks if the
 * source row is later edited or deleted. */
export interface FavoriteFood extends FoodMacros {
  id: string;
  name: string;
}

/** Reference data (coach/admin-seeded), read-only to clients. */
export interface Supplement extends FoodMacros {
  id: string;
  name: string;
}

export interface MealTemplateItem extends FoodMacros {
  name: string;
}

export interface MealTemplate {
  id: string;
  name: string;
  items: MealTemplateItem[];
}
