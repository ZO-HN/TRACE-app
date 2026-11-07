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

it('accepts decimal commas without silently treating the fractional digits as whole grams', () => {
  expect(parseQuickEntry('12,5g protein').protein_g).toBe(12.5);
});

it('rejects negative quantities instead of silently recording a positive amount', () => {
  expect(parseQuickEntry('-25g protein, 150 kcal').error).toBeTruthy();
  expect(hasAnyMacro(parseQuickEntry('-25g protein, 150 kcal'))).toBe(false);
  expect(hasAnyMacro({ protein_g: Infinity, carbs_g: null, fat_g: null, calories: 150 })).toBe(false);
});

it('does not round a negative fraction into an acceptable zero', () => {
  expect(hasAnyMacro(parseQuickEntry('-0.1 kcal'))).toBe(false);
});

it('does not extract trailing digits from an exponent or a macro prefix from another word', () => {
  expect(hasAnyMacro(parseQuickEntry('1e309g protein'))).toBe(false);
  expect(hasAnyMacro(parseQuickEntry('5g father'))).toBe(false);
});

it('keeps comma-separated macro entries usable without spaces', () => {
  expect(parseQuickEntry('150 kcal,20g protein').protein_g).toBe(20);
});

it('rejects a signed exponent instead of recording its suffix as calories', () => {
  expect(parseQuickEntry('1e+3 kcal').calories).toBeNull();
  expect(hasAnyMacro(parseQuickEntry('1e+3 kcal'))).toBe(false);
});


it.each([
  '1e+3', '1e-3', '1E+3', '1E-3', '1e3', '-1e+3', '+1e-3',
  '1e +3', '1e - 3', '1..2', '1,,2', '1.,2', '1,.2', '1,2,3',
  '1.2.3', '--25', '1.', '1,', '.5', ',5',
])('rejects the whole malformed quantity %s even alongside valid calories', (quantity) => {
  for (const text of [`${quantity} kcal`, `200 kcal, ${quantity}g protein`, `${quantity} kcal, 20g protein`]) {
    const parsed = parseQuickEntry(text);
    expect(parsed.error).toBeTruthy();
    expect(hasAnyMacro(parsed)).toBe(false);
  }
});

it.each(['-0.1 kcal', '-0,1 kcal', '-0.1g protein, 200 kcal', '-0,1g fat, 200 kcal'])(
  'rejects negative fractions before calorie rounding: %s', (text) => {
    expect(hasAnyMacro(parseQuickEntry(text))).toBe(false);
  },
);

it.each([['12.5',12.5], ['12,5',12.5], ['+12.5',12.5], ['0',0], ['0.01',0]] as const)(
  'accepts a plain decimal quantity %s at intake storage precision', (quantity, expected) => {
    const parsed = parseQuickEntry(`Yogurt,${quantity}g protein,150 kcal`);
    expect(parsed.error).toBeUndefined();
    expect(parsed.protein_g).toBe(expected);
    expect(parsed.calories).toBe(150);
    expect(hasAnyMacro(parsed)).toBe(true);
  },
);

it('still checks a malformed later occurrence of an already recognized macro', () => {
  expect(hasAnyMacro(parseQuickEntry('20g protein, 1e+3g protein'))).toBe(false);
});

it('rejects a later negative duplicate instead of discarding it before validation', () => {
  expect(hasAnyMacro(parseQuickEntry('20g protein, -25g protein'))).toBe(false);
});


const nutritionFields = [
  { suffix: 'g protein', key: 'protein_g' },
  { suffix: 'g carbs', key: 'carbs_g' },
  { suffix: 'g fat', key: 'fat_g' },
  { suffix: ' kcal', key: 'calories' },
] as const;

it.each(nutritionFields)('validates every quantity before duplicate selection for $key', (field) => {
  const invalidQuantities = ['-25', '-0.1', '-0,1', '1e+3', '1e-3', '1..2', '1,,2', '9'.repeat(400)];
  for (const quantity of invalidQuantities) {
    const good = `20${field.suffix}`;
    const bad = `${quantity}${field.suffix}`;
    for (const text of [`${good}, ${bad}`, `${bad}, ${good}`]) {
      const parsed = parseQuickEntry(text);
      expect(hasAnyMacro(parsed), text).toBe(false);
      expect(parsed.error, text).toBeTruthy();
    }
  }
});

it.each(nutritionFields)('rejects negative quantities alongside every other label for $key', (field) => {
  for (const other of nutritionFields) {
    for (const negative of ['-25', '-0.1', '-0,1']) {
      for (const text of [
        `20${other.suffix}, ${negative}${field.suffix}`,
        `${negative}${field.suffix}, 20${other.suffix}`,
      ]) {
        expect(hasAnyMacro(parseQuickEntry(text)), text).toBe(false);
      }
    }
  }
});

it.each(nutritionFields)('preserves first-value behavior for valid duplicates of $key', (field) => {
  for (const first of ['20.4', '20,4', '+20.4', '0']) {
    const parsed = parseQuickEntry(`${first}${field.suffix}, 30.6${field.suffix}`);
    const value = Number(first.replace(',', '.'));
    expect(parsed.error).toBeUndefined();
    expect(hasAnyMacro(parsed)).toBe(true);
    expect(parsed[field.key]).toBe(field.key === 'calories' ? Math.round(value) : value);
  }
});
