import { describe, expect, it } from 'vitest';
import { toNutritionLogFromFood } from '../../src/lib/nutrition/mapFoodToLog';

const MACROS = { protein_g: 20, carbs_g: 10, fat_g: 5, calories: 165 };

describe('toNutritionLogFromFood', () => {
  it('maps a food + macros into a nutrition log payload', () => {
    const payload = toNutritionLogFromFood('log-1', 'user-1', 'Chicken breast', MACROS);
    expect(payload).toEqual({
      id: 'log-1',
      user_id: 'user-1',
      method: 'TYPED',
      description: 'Chicken breast',
      protein_g: 20,
      carbs_g: 10,
      fat_g: 5,
      calories: 165,
    });
  });

  it('honors a non-default method', () => {
    expect(toNutritionLogFromFood('log-2', 'user-1', 'Barcode item', MACROS, 'BARCODE').method).toBe('BARCODE');
  });

  it('includes meal_slot when passed', () => {
    const payload = toNutritionLogFromFood('log-3', 'user-1', 'Snack', MACROS, 'TYPED', 4);
    expect(payload.meal_slot).toBe(4);
  });

  it('omits meal_slot entirely when not passed', () => {
    const payload = toNutritionLogFromFood('log-4', 'user-1', 'Snack', MACROS);
    expect('meal_slot' in payload).toBe(false);
  });
});
