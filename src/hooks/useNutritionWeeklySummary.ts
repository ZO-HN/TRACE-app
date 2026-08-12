// Thin wrapper around useNutritionLogs: fetches enough history for a
// this-week-vs-last-week comparison and runs it through compareWeeks().

import { useMemo } from 'react';
import { useNutritionLogs } from './useNutritionLogs';
import { compareWeeks, type WeeklyComparison } from '../lib/nutrition/weeklySummary';

export function useNutritionWeeklySummary(userId: string): {
  comparison: WeeklyComparison;
  isLoading: boolean;
  error: string | null;
} {
  const { entries, isLoading, error } = useNutritionLogs(userId, 200);
  const comparison = useMemo(() => compareWeeks(entries, new Date()), [entries]);
  return { comparison, isLoading, error };
}
