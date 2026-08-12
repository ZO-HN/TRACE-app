import { describe, expect, it } from 'vitest';
import {
  buildMealPhotoScanMessages,
  parseScannedMeal,
  scannedMealToQuickEntryText,
} from '../../src/lib/ai/mealPhotoScan';

describe('buildMealPhotoScanMessages', () => {
  it('embeds the base64 photo as a data URL image part', () => {
    const messages = buildMealPhotoScanMessages('AAAA');
    expect(messages).toHaveLength(1);
    const content = messages[0].content;
    expect(Array.isArray(content)).toBe(true);
    const parts = content as { type: string }[];
    expect(parts[0].type).toBe('text');
    expect(parts[1].type).toBe('image_url');
    expect((parts[1] as any).image_url.url).toBe('data:image/jpeg;base64,AAAA');
  });
});

describe('parseScannedMeal', () => {
  it('parses a clean JSON reply', () => {
    const meal = parseScannedMeal(
      '{"description": "Grilled chicken salad", "calories": 450, "protein_g": 40, "carbs_g": 20, "fat_g": 18}',
    );
    expect(meal).toEqual({
      description: 'Grilled chicken salad',
      calories: 450,
      protein_g: 40,
      carbs_g: 20,
      fat_g: 18,
    });
  });

  it('extracts JSON from a code-fenced or chatty reply', () => {
    const meal = parseScannedMeal(
      'Sure! Here you go:\n```json\n{"description": "Toast", "calories": 200, "protein_g": 5, "carbs_g": 30, "fat_g": 6}\n```',
    );
    expect(meal?.description).toBe('Toast');
    expect(meal?.calories).toBe(200);
  });

  it('returns null for unparseable content', () => {
    expect(parseScannedMeal('sorry, I cannot help with that')).toBeNull();
  });

  it('returns null when description is missing', () => {
    expect(parseScannedMeal('{"calories": 200}')).toBeNull();
  });
});

describe('scannedMealToQuickEntryText', () => {
  it('formats a scanned meal into the free-text quick-add format', () => {
    const text = scannedMealToQuickEntryText({
      description: 'Grilled chicken salad',
      calories: 450,
      protein_g: 40,
      carbs_g: 20,
      fat_g: 18,
    });
    expect(text).toBe('Grilled chicken salad, 40g protein, 20g carbs, 18g fat, 450 kcal');
  });

  it('omits unknown macros', () => {
    const text = scannedMealToQuickEntryText({
      description: 'Mystery smoothie',
      calories: 300,
      protein_g: null,
      carbs_g: null,
      fat_g: null,
    });
    expect(text).toBe('Mystery smoothie, 300 kcal');
  });
});
