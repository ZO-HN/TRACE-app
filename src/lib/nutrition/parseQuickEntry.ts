// Free-text macro parsing for the quick-logger — "80g Protein" style entry
// per docs/trace_features.md's "Macro Quick-Logger". Pure and
// framework-free so it's testable without rendering anything.

export interface ParsedMacros {
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  calories: number | null;
}

// Require the full word, not single-letter shorthand (p/c/f) — too easy to
// false-positive match inside unrelated text.
const MACRO_PATTERNS: ReadonlyArray<{
  key: 'protein_g' | 'carbs_g' | 'fat_g';
  re: RegExp;
}> = [
  { key: 'protein_g', re: /(\d+(?:\.\d+)?)\s*g?\s*protein/i },
  { key: 'carbs_g', re: /(\d+(?:\.\d+)?)\s*g?\s*carb(?:s|ohydrates?)?\b/i },
  { key: 'fat_g', re: /(\d+(?:\.\d+)?)\s*g?\s*fat/i },
];

const CALORIE_PATTERN = /(\d+(?:\.\d+)?)\s*(?:kcal|calories|cal)\b/i;

export function parseQuickEntry(text: string): ParsedMacros {
  const result: ParsedMacros = {
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    calories: null,
  };

  for (const { key, re } of MACRO_PATTERNS) {
    const match = text.match(re);
    if (match) result[key] = parseFloat(match[1]);
  }

  const calMatch = text.match(CALORIE_PATTERN);
  if (calMatch) result.calories = Math.round(parseFloat(calMatch[1]));

  return result;
}

export function hasAnyMacro(parsed: ParsedMacros): boolean {
  return (
    parsed.protein_g != null ||
    parsed.carbs_g != null ||
    parsed.fat_g != null ||
    parsed.calories != null
  );
}
