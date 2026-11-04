// Free-text nutrition parsing follows TRACE/docs/features/nutrition.md.
// This module stays framework-free so validation can be tested without rendering.

export interface ParsedMacros {
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  calories: number | null;
  /** A recognized quantity is invalid; reject the entire entry, including other valid fields. */
  error?: string;
}

// Capture the complete numeric-looking token before a full nutrition label.
// Keep signs, exponent markers, separators and intervening whitespace together
// so an invalid token cannot be retried as a smaller, valid numeric suffix.
const ENTRY_PATTERN = /(?:^|[^\w.+\-\u2212])([+\-\u2212\d.,][\d.,eE+\-\u2212\s]*)\s*(g\s*)?(protein|carb(?:s|ohydrates?)?|fat|kcal|calories|cal)\b/gi;
const PLAIN_NUMBER = /^[+-]?\d+(?:[.,]\d+)?$/;
const QUANTITY_ERROR = 'Use plain numbers with one decimal point or comma. Scientific notation and repeated separators are not supported.';

export function parseQuickEntry(text: string): ParsedMacros {
  const result: ParsedMacros = {
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    calories: null,
  };

  for (const match of text.matchAll(ENTRY_PATTERN)) {
    const quantity = match[1].trim();
    const label = match[3].toLowerCase();
    const key = label === 'protein' ? 'protein_g'
      : label.startsWith('carb') ? 'carbs_g'
        : label === 'fat' ? 'fat_g' : 'calories';
    const value = Number(quantity.replace(',', '.'));
    if (!PLAIN_NUMBER.test(quantity) || !Number.isFinite(value) || (key === 'calories' && match[2])) {
      result.error = QUANTITY_ERROR;
      continue;
    }
    // Validate every occurrence before deduplication or rounding. An invalid
    // later duplicate must reject the entry even when its first value is valid.
    if (value < 0) {
      result.error = 'Calories and macros must be non-negative.';
      continue;
    }
    if (result[key] === null) result[key] = key === 'calories' ? Math.round(value) : value;
  }

  return result;
}

export function hasAnyMacro(parsed: ParsedMacros): boolean {
  const values = [parsed.protein_g, parsed.carbs_g, parsed.fat_g, parsed.calories]
    .filter((value): value is number => value !== null);
  return !parsed.error && values.length > 0 && values.every((value) => Number.isFinite(value) && value >= 0);
}
