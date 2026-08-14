import { describe, expect, it } from 'vitest';
import { toNutritionLogInsert } from '../../src/lib/nutrition/mapQuickEntry';

describe('toNutritionLogInsert', () => {
  it('maps quick-entry text to a TYPED nutrition log payload', () => {
    const payload = toNutritionLogInsert('log-1', 'user-1', '80g protein, 40g carbs, 20g fat');
    expect(payload).toEqual({
      id: 'log-1',
      user_id: 'user-1',
      method: 'TYPED',
      description: '80g protein, 40g carbs, 20g fat',
      protein_g: 80,
      carbs_g: 40,
      fat_g: 20,
      calories: null,
    });
  });

  it('stores an empty/whitespace description as null', () => {
    expect(toNutritionLogInsert('log-2', 'user-1', '   ').description).toBeNull();
  });

  it('accepts pre-parsed macros instead of re-parsing the text', () => {
    const payload = toNutritionLogInsert('log-3', 'user-1', 'protein shake', {
      protein_g: 25,
      carbs_g: null,
      fat_g: null,
      calories: null,
    });
    expect(payload.protein_g).toBe(25);
  });

  it('includes meal_slot when passed', () => {
    const payload = toNutritionLogInsert('log-4', 'user-1', 'snack', undefined, 3);
    expect(payload.meal_slot).toBe(3);
  });

  it('omits meal_slot entirely when not passed', () => {
    const payload = toNutritionLogInsert('log-5', 'user-1', 'snack');
    expect('meal_slot' in payload).toBe(false);
  });
});
