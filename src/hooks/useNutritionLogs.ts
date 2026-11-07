// Recent nutrition_logs for the signed-in trainee, plus a logEntry() action
// for the quick-entry logger. Owner FOR ALL under RLS.
//
// Writes go through the offline outbox (same as set_logs) rather than a
// direct insert — logging food is a real gym/kitchen-floor action that
// should survive a dead connection, unlike the catalog/settings writes
// elsewhere in this feature set.

import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../lib/supabase';
import { useOutboxStore } from '../lib/outbox/outboxStore';
import { toNutritionLogInsert } from '../lib/nutrition/mapQuickEntry';
import { hasAnyMacro, parseQuickEntry } from '../lib/nutrition/parseQuickEntry';
import { forUser } from '../lib/outbox/ownership';
import { localDate } from '../lib/localDate';
import { nutritionDay } from '../lib/nutrition/record';
import type { OutboxStatus } from '../lib/outbox/types';

export interface NutritionEntry {
  id: string;
  logged_at: string;
  recorded_date?: string | null;
  method: 'TYPED' | 'BARCODE' | 'PHOTO';
  description: string | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  calories: number | null;
  /** Draft columns (008_tracked_parity_tier_a.sql) — undefined until that
   * migration is applied; see the select-retry in refresh() below. */
  fiber_g?: number | null;
  sugar_g?: number | null;
  /** 013_nutrition_meal_slot.sql — same select-retry treatment. */
  meal_slot?: number | null;
  syncStatus?: OutboxStatus;
}

export interface UseNutritionLogs {
  entries: NutritionEntry[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  logEntry: (text: string, mealSlot?: number | null) => Promise<{ ok: boolean; error?: string }>;
}

export function useNutritionLogs(userId: string, limit = 20, day?: string, period?: { from: string; to: string }): UseNutritionLogs {
  const periodFrom = period?.from; const periodTo = period?.to;
  const [refreshKey, setRefreshKey] = useState(0);
  const [remote, setRemote] = useState<{ userId: string; entries: NutritionEntry[] }>({ userId, entries: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scopeKey = `${userId}:${day ?? ''}:${periodFrom ?? ''}:${periodTo ?? ''}`;
  const [errorScope, setErrorScope] = useState(scopeKey);
  const enqueueNutritionLog = useOutboxStore((s) => s.enqueueNutritionLog);
  const items = useOutboxStore((s) => s.items);
  const entries = useMemo(() => {
    const merged = new Map((remote.userId === userId ? remote.entries : []).map((entry) => [entry.id, entry]));
    for (const item of forUser(items, userId)) {
      if (item.table !== 'nutrition_logs' || !('method' in item.payload)) continue;
      if (item.status === 'synced' && merged.has(item.id)) continue;
      const payload = item.payload;
      merged.set(item.id, {
        recorded_date: payload.recorded_date,
        id: item.id, logged_at: payload.logged_at ?? item.updated_at, method: payload.method,
        description: payload.description ?? null, protein_g: payload.protein_g ?? null,
        carbs_g: payload.carbs_g ?? null, fat_g: payload.fat_g ?? null, calories: payload.calories ?? null,
        fiber_g: payload.fiber_g ?? null, sugar_g: payload.sugar_g ?? null, meal_slot: payload.meal_slot ?? null,
        syncStatus: item.status,
      });
    }
    const sorted = [...merged.values()].filter((entry) => { const key = nutritionDay(entry); return day ? key === day : periodFrom && periodTo ? key >= periodFrom && key < periodTo : true; })
      .sort((a, b) => b.logged_at.localeCompare(a.logged_at));
    return day || periodFrom ? sorted : sorted.slice(0, limit);
  }, [remote, items, userId, limit, day, periodFrom, periodTo]);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    setErrorScope(scopeKey);
    setIsLoading(true);
    setError(null);
    void (async () => {
      try {
        const UNDEFINED_COLUMN = '42703';
        const read = async (columns: string) => {
          const all: NutritionEntry[] = [];
          const start = day || periodFrom ? new Date(`${day ?? periodFrom}T00:00:00`) : null;
          const end = periodTo ? new Date(`${periodTo}T00:00:00`) : start ? new Date(start) : null;
          if (!periodTo) end?.setDate(end.getDate() + 1);
          for (let offset = 0; ; offset += 500) {
            let query = supabase.from('nutrition_logs').select(columns).eq('user_id', userId)
              .order('logged_at', { ascending: false }).order('id', { ascending: false });
            if (start && end) {
              if (columns.includes('recorded_date')) {
                const first = day ?? periodFrom!; const last = periodTo ?? localDate(end);
                query = query.or(`and(recorded_date.gte.${first},recorded_date.lt.${last}),and(recorded_date.is.null,logged_at.gte.${start.toISOString()},logged_at.lt.${end.toISOString()})`);
              } else query = query.gte('logged_at', start.toISOString()).lt('logged_at', end.toISOString());
            }
            const result = await (day || periodFrom ? query.range(offset, offset + 499) : query.limit(limit));
            if (result.error) return { data: null, error: result.error };
            const page = (result.data ?? []) as unknown as NutritionEntry[];
            all.push(...page);
            if (cancelled || (!day && !periodFrom) || page.length < 500) return { data: all, error: null };
          }
        };
        let { data, error: fetchError } = await read('id, logged_at, recorded_date, method, description, protein_g, carbs_g, fat_g, calories, fiber_g, sugar_g, meal_slot');
        if (fetchError?.code === UNDEFINED_COLUMN) {
          ({ data, error: fetchError } = await read('id, logged_at, method, description, protein_g, carbs_g, fat_g, calories'));
        }

        if (cancelled) return;
        if (fetchError) setError(fetchError.message);
        else {
          setError(null);
          setRemote({ userId, entries: (data as NutritionEntry[]) ?? [] });
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load nutrition entries.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, limit, day, periodFrom, periodTo, refreshKey, scopeKey]));

  const logEntry = useCallback(
    async (text: string, mealSlot?: number | null) => {
      const parsed = parseQuickEntry(text);
      if (!hasAnyMacro(parsed)) {
        return { ok: false, error: parsed.error ?? 'Enter finite, non-negative calories or macros, such as 150 kcal or 20g protein.' };
      }
      const payload = toNutritionLogInsert(randomUUID(), userId, text, parsed, mealSlot);
      try {
        await enqueueNutritionLog(payload);
        return { ok: true };
      } catch (cause) {
        return { ok: false, error: cause instanceof Error ? cause.message : 'Could not save food on this device.' };
      }
    },
    [userId, enqueueNutritionLog],
  );

  return { entries, isLoading: errorScope !== scopeKey || isLoading, error: errorScope === scopeKey ? error : null, logEntry, refresh: () => setRefreshKey((key) => key + 1) };
}
