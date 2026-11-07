// Thin wrapper around useNutritionLogs: fetches enough history for a
// this-week-vs-last-week comparison and runs it through compareWeeks().

import { useMemo } from 'react';
import { useNutritionLogs } from './useNutritionLogs';
import { localDate } from '../lib/localDate';
import { compareWeeks, type WeeklyComparison } from '../lib/nutrition/weeklySummary';

export function useNutritionWeeklySummary(userId: string): {
  comparison: WeeklyComparison;
  isLoading: boolean;
  error: string | null;
} {
  const today = new Date();
  const start = new Date(today); start.setDate(start.getDate() - start.getDay() - 7);
  const end = new Date(today); end.setDate(end.getDate() + 1);
  const { entries, isLoading, error } = useNutritionLogs(userId, 200, undefined, { from: localDate(start), to: localDate(end) });
  const comparison = useMemo(() => compareWeeks(entries, new Date()), [entries]);
  return { comparison, isLoading, error };
}
