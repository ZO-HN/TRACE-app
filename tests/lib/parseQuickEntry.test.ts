import { describe, expect, it } from 'vitest';
import { hasAnyMacro, parseQuickEntry } from '../../src/lib/nutrition/parseQuickEntry';

describe('parseQuickEntry', () => {
  it('parses a single macro with the doc example format', () => {
    expect(parseQuickEntry('80g Protein')).toEqual({
      protein_g: 80,
      carbs_g: null,
      fat_g: null,
      calories: null,
    });
  });

  it('parses multiple macros regardless of order', () => {
    expect(parseQuickEntry('40g fat and 30g protein and 50g carbs')).toEqual({
      protein_g: 30,
      carbs_g: 50,
      fat_g: 40,
      calories: null,
    });
  });

  it('parses calories with kcal/cal/calories spellings', () => {
    expect(parseQuickEntry('2400 kcal').calories).toBe(2400);
    expect(parseQuickEntry('650 cal').calories).toBe(650);
    expect(parseQuickEntry('650 calories').calories).toBe(650);
  });

  it('accepts decimals and a missing "g" suffix', () => {
    expect(parseQuickEntry('32.5 protein').protein_g).toBe(32.5);
  });

  it('matches "carb" and "carbohydrates" as well as "carbs"', () => {
    expect(parseQuickEntry('40g carb').carbs_g).toBe(40);
    expect(parseQuickEntry('40g carbohydrates').carbs_g).toBe(40);
  });

  it('returns all nulls for text with no recognizable macros', () => {
    expect(parseQuickEntry('chicken and rice, felt great')).toEqual({
      protein_g: null,
      carbs_g: null,
      fat_g: null,
      calories: null,
    });
  });

  it('does not false-positive on single letters inside other words', () => {
    // "fat" inside "father" would be a real bug if the regex were too loose
    expect(parseQuickEntry('called my father').fat_g).toBeNull();
  });
});

describe('hasAnyMacro', () => {
  it('is true when at least one field is set', () => {
    expect(hasAnyMacro({ protein_g: 10, carbs_g: null, fat_g: null, calories: null })).toBe(true);
  });

  it('is false when every field is null', () => {
    expect(hasAnyMacro({ protein_g: null, carbs_g: null, fat_g: null, calories: null })).toBe(
      false,
    );
  });
});
