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
}
