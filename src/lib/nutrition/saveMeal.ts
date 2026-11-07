import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../supabase';
import type { Json } from '../database.types';
import type { MealTemplateItem } from './types';

type Request = { owner: string; operation: string; template: string; name: string; items: (MealTemplateItem & { id: string })[] };
const key = (user: string) => `trace:meal-save:v1:${user}`;
const active = new Set<string>();
const canonicalItems = (items: MealTemplateItem[]): MealTemplateItem[] => items.map(item => ({
  name: item.name,
  protein_g: item.protein_g == null ? null : Math.round(item.protein_g * 100) / 100,
  carbs_g: item.carbs_g == null ? null : Math.round(item.carbs_g * 100) / 100,
  fat_g: item.fat_g == null ? null : Math.round(item.fat_g * 100) / 100,
  calories: item.calories ?? null,
}));
export function mealTemplateError(name: string, items: MealTemplateItem[]): string | null {
  if (!name.trim() || Array.from(name.trim()).length > 100) return 'Meal name must contain 1 to 100 characters.';
  if (!items.length || items.length > 100) return 'Choose 1 to 100 foods.';
  for (const item of items) {
    if (!item.name.trim() || Array.from(item.name).length > 280) return 'Each food needs a name of at most 280 characters.';
    if (['protein_g','carbs_g','fat_g','calories'].every(field => item[field as keyof MealTemplateItem] == null)) return 'Each food needs calories or macros.';
    for (const field of ['protein_g','carbs_g','fat_g','calories'] as const) {
      const value = item[field];
      if (value != null && (!Number.isFinite(value) || value < 0 || (field === 'calories' ? !Number.isInteger(value) || value > 2147483647 : value > 9999.99 || Math.abs(value * 100 - Math.round(value * 100)) > 1e-7))) return 'Saved-meal macros support 0–9999.99 grams with two decimal places; calories must be a non-negative integer.';
    }
  }
  return null;
}
export async function pendingMealSave(user: string): Promise<Request | null> {
  const raw = await AsyncStorage.getItem(key(user));
  if (!raw) return null;
  const request = JSON.parse(raw) as Request;
  if (request.owner !== user || typeof request.operation !== 'string' || typeof request.template !== 'string' || typeof request.name !== 'string' || !Array.isArray(request.items) || request.items.some(item => typeof item.id !== 'string') || mealTemplateError(request.name, request.items)) throw new Error('Saved meal request is invalid. Keep this device data and contact support.');
  return request;
}
export async function savePersonalMeal(user: string, name?: string, items?: MealTemplateItem[]): Promise<string> {
  if (!user || active.has(user)) throw new Error('A meal save is already running.');
  active.add(user);
  try {
    let request = await pendingMealSave(user);
    if (name !== undefined && items) {
      const error = mealTemplateError(name, items); if (error) throw new Error(error);
      const normalized = canonicalItems(items);
      if (request && (request.name !== name.trim() || JSON.stringify(canonicalItems(request.items)) !== JSON.stringify(normalized))) throw new Error('Finish the previous meal save before saving different foods.');
      if (!request) {
        request = { owner: user, operation: randomUUID(), template: randomUUID(), name: name.trim(), items: normalized.map(item => ({ ...item, id: randomUUID() })) };
        await AsyncStorage.setItem(key(user), JSON.stringify(request));
      }
    }
    if (!request) throw new Error('No previous meal save to retry.');
    // Never initiate an old account's write using the newly active account.
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || sessionData.session?.user.id !== user) throw new Error('Sign in to the original account to finish saving this meal.');
    const { data, error } = await supabase.rpc('save_personal_meal', { p_operation_id: request.operation, p_template_id: request.template, p_user_id: user, p_name: request.name, p_items: request.items as unknown as Json });
    if (error) throw new Error(error.message);
    if (data !== request.template) throw new Error('Meal confirmation was incomplete. Retry the previous save.');
    // An uncertain cleanup cannot turn a confirmed server save into a failed save.
    await AsyncStorage.removeItem(key(user)).catch(() => undefined);
    return data;
  } finally { active.delete(user); }
}
