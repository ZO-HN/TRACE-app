import { localDate } from '../localDate';
import type { NutritionLogInsert } from './types';
import { nutritionEntryError } from './validation';

export function nutritionDay(entry: { recorded_date?: string | null; logged_at: string }): string {
  return entry.recorded_date ?? localDate(new Date(entry.logged_at));
}
export function captureNutritionRecord(payload: NutritionLogInsert, now = new Date()): NutritionLogInsert {
  const error = nutritionEntryError(payload);
  if (error) throw new Error(error);
  const loggedAt = payload.logged_at ?? now.toISOString();
  const date = payload.recorded_date ?? localDate(new Date(loggedAt));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0,10) !== date || !Number.isFinite(Date.parse(loggedAt))) throw new Error('Choose a valid nutrition date.');
  return { ...payload, logged_at: loggedAt, recorded_date: date,
    protein_g: payload.protein_g == null ? payload.protein_g : Math.round((payload.protein_g + Number.EPSILON) * 10) / 10,
    carbs_g: payload.carbs_g == null ? payload.carbs_g : Math.round((payload.carbs_g + Number.EPSILON) * 10) / 10,
    fat_g: payload.fat_g == null ? payload.fat_g : Math.round((payload.fat_g + Number.EPSILON) * 10) / 10,
  };
}
