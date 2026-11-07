import { useNutritionLogs } from '../../hooks/useNutritionLogs';
import { nutritionDay } from '../../lib/nutrition/record';
import { useCallback, useState } from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { localDate } from '../../lib/localDate';
import { useOutboxStore } from '../../lib/outbox/outboxStore';
import { forUser } from '../../lib/outbox/ownership';
import { useUnitPreference } from '../../hooks/useUnitPreference';
import { formatWeightKg } from '../../lib/units';

type Row = { id: string; [key: string]: string | number | null };
const sections = [
  { title: 'Nutrition', table: 'nutrition_logs', column: 'logged_at', timestamp: true },
  { title: 'Training', table: 'workout_sessions', column: 'completed_at', timestamp: true },
  { title: 'Bodyweight', table: 'bodyweight_logs', column: 'recorded_date' },
  { title: 'Steps', table: 'wearable_biometrics', column: 'recorded_date' },
  { title: 'Water', table: 'water_logs', column: 'logged_date' },
  { title: 'Sleep', table: 'sleep_logs', column: 'sleep_date' },
  { title: 'Cardio', table: 'cardio_entries', column: 'entry_date' },
];
type Result = { rows: Row[]; error?: string };

export default function DayHistory({ userId, date }: { userId: string; date: string }) {
  const nutrition = useNutritionLogs(userId, 50, date);
  const resultKey = `${userId}:${date}`;
  const [loadedKey, setLoadedKey] = useState('');
  const [results, setResults] = useState<Record<string, Result>>({});
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const items = useOutboxStore((state) => state.items);
  const { unit } = useUnitPreference();
  useFocusEffect(useCallback(() => {
    let cancelled = false;
    setLoading(true);
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    void Promise.all(sections.filter(section => section.table !== 'nutrition_logs').map(async (section) => {
      try {
        let query = supabase.from(section.table).select('*').eq('user_id', userId);
        query = section.timestamp
          ? query.gte(section.column, start.toISOString()).lt(section.column, end.toISOString())
          : query.eq(section.column, date);
        const { data, error } = await query.order(section.column, { ascending: true });
        return [section.table, { rows: (data ?? []) as Row[], error: error?.message }] as const;
      } catch (error) {
        return [section.table, { rows: [], error: error instanceof Error ? error.message : 'Could not load entries.' }] as const;
      }
    })).then((entries) => {
      if (!cancelled) { setResults(Object.fromEntries(entries)); setLoadedKey(resultKey); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [userId, date, retry, resultKey]));

  const describe = (table: string, row: Row) => {
    switch (table) {
      case 'nutrition_logs': return `${row.description ?? 'Meal'}: ${row.calories ?? 0} kcal | ${row.protein_g ?? 0}g P / ${row.carbs_g ?? 0}g C / ${row.fat_g ?? 0}g F`;
      case 'workout_sessions': return `${row.session_name ?? 'Workout'}: ${Math.round(Number(row.duration_seconds ?? 0) / 60)} min`;
      case 'bodyweight_logs': return `${formatWeightKg(Number(row.weight_kg), unit).value.toFixed(1)} ${unit}${row.note ? ` - ${row.note}` : ''}`;
      case 'wearable_biometrics': return `${Number(row.step_count).toLocaleString()} steps`;
      case 'water_logs': return `${row.amount_ml} mL`;
      case 'sleep_logs': return `${((new Date(String(row.wake_time)).getTime() - new Date(String(row.bedtime)).getTime()) / 3600000).toFixed(1)} hours | Quality ${row.quality}/5`;
      default: return `${Math.round(Number(row.duration_seconds) / 60)} min`;
    }
  };

  return <ScrollView className="flex-1" contentContainerClassName="px-4 py-4 gap-4">
    {(loading || nutrition.isLoading || loadedKey !== resultKey) && <Text className="text-gray-400">Loading entries...</Text>}
    {sections.map((section) => {
      const result = section.table === 'nutrition_logs' ? { rows: nutrition.entries as unknown as Row[], error: nutrition.error ?? undefined } : loadedKey === resultKey ? results[section.table] : undefined;
      const merged = new Map((result?.rows ?? []).map((row) => [row.id, row]));
      for (const item of forUser(items, userId)) {
        if (item.table !== section.table) continue;
        const payload = item.payload as unknown as Row;
        const timestamp = payload[section.column];
        if (section.table === 'nutrition_logs' ? nutritionDay(payload as unknown as { logged_at: string; recorded_date?: string | null }) !== date : typeof timestamp !== 'string' || localDate(new Date(timestamp)) !== date) continue;
        if (item.status !== 'synced' || !merged.has(item.id)) merged.set(item.id, { ...payload, id: item.id });
      }
      const rows = [...merged.values()].filter((row) => section.table !== 'wearable_biometrics' || row.step_count != null);
      return <View key={section.table} className="border-b border-border pb-4 gap-2">
        <Text className="text-white font-bold">{section.title}</Text>
        {result?.error && <Text className="text-red-400 text-xs">{result.error}</Text>}
        {rows.map((row) => <Text key={row.id} className="text-gray-300">{describe(section.table, row)}</Text>)}
        {!loading && !nutrition.isLoading && loadedKey === resultKey && !result?.error && rows.length === 0 && <Text className="text-gray-500">No entries for this date</Text>}
      </View>;
    })}
    {(nutrition.error || Object.values(loadedKey === resultKey ? results : {}).some((result) => result.error)) && <Pressable onPress={() => { setRetry((value) => value + 1); nutrition.refresh(); }}><Text className="text-primary">Retry loading entries</Text></Pressable>}
  </ScrollView>;
}
