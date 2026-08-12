// Builds the vision request for "AI photo meal logging" (Tracked-parity
// Tier C) and parses the model's reply back into macros. Uses the user's
// own configured AI copilot endpoint (see src/lib/ai/client.ts) — no
// TRACE-hosted inference, no per-request cost to this app.

import type { ChatMessage } from './client';

export interface ScannedMeal {
  description: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
}

const SCAN_PROMPT =
  'Identify the food in this photo and estimate its nutrition. Reply with ONLY a JSON object, ' +
  'no other text, in this exact shape: {"description": string, "calories": number, ' +
  '"protein_g": number, "carbs_g": number, "fat_g": number}. These are estimates — be reasonable, ' +
  "not overly precise.";

export function buildMealPhotoScanMessages(base64Jpeg: string): ChatMessage[] {
  return [
    {
      role: 'user',
      content: [
        { type: 'text', text: SCAN_PROMPT },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Jpeg}` } },
      ],
    },
  ];
}

/** Parses the model's reply, tolerating a code-fenced JSON block. */
export function parseScannedMeal(rawContent: string): ScannedMeal | null {
  const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<ScannedMeal>;
    if (typeof parsed.description !== 'string') return null;
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
    return {
      description: parsed.description,
      calories: num(parsed.calories),
      protein_g: num(parsed.protein_g),
      carbs_g: num(parsed.carbs_g),
      fat_g: num(parsed.fat_g),
    };
  } catch {
    return null;
  }
}

/** Renders a ScannedMeal as the free-text format parseQuickEntry already
 * understands, so a scan flows through the existing logging pipeline
 * unchanged. */
export function scannedMealToQuickEntryText(meal: ScannedMeal): string {
  const parts = [meal.description];
  if (meal.protein_g != null) parts.push(`${meal.protein_g}g protein`);
  if (meal.carbs_g != null) parts.push(`${meal.carbs_g}g carbs`);
  if (meal.fat_g != null) parts.push(`${meal.fat_g}g fat`);
  if (meal.calories != null) parts.push(`${meal.calories} kcal`);
  return parts.join(', ');
}
