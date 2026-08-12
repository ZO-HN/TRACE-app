// Combines existing sleep + muscle-volume data into the crude readiness
// score in src/lib/readiness/score.ts. No new queries beyond what
// useSleepLogs/useMuscleAnalytics already fetch elsewhere in the app.

import { useMemo } from 'react';
import { useSleepLogs } from './useSleepLogs';
import { useMuscleAnalytics } from './useMuscleAnalytics';
import { durationHours, lastNight } from '../lib/sleep/summary';
import { computeReadiness, type ReadinessResult } from '../lib/readiness/score';

function todayKeyMinus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function useReadinessScore(userId: string): ReadinessResult & { isLoading: boolean } {
  const { logs: sleepLogs, isLoading: sleepLoading } = useSleepLogs(userId, todayKeyMinus(1));
  const { rows: thisWeekRows, isLoading: thisWeekLoading } = useMuscleAnalytics(userId, 7);
  const { rows: trailingRows, isLoading: trailingLoading } = useMuscleAnalytics(userId, 28);

  const last = lastNight(sleepLogs);
  const thisWeekVolumeKg = thisWeekRows.reduce((s, r) => s + r.total_volume_kg, 0);
  const trailingVolumeKg = trailingRows.reduce((s, r) => s + r.total_volume_kg, 0);
  // trailingRows already includes this week's 28-day window; back it out to
  // get a trailing average that doesn't double-count the current week.
  const avgWeeklyVolumeKg = Math.max(0, (trailingVolumeKg - thisWeekVolumeKg) / 3);

  const result = useMemo(
    () =>
      computeReadiness({
        lastSleepHours: last ? durationHours(last) : null,
        lastSleepQuality: last?.quality ?? null,
        thisWeekVolumeKg,
        avgWeeklyVolumeKg,
      }),
    [last, thisWeekVolumeKg, avgWeeklyVolumeKg],
  );

  return { ...result, isLoading: sleepLoading || thisWeekLoading || trailingLoading };
}
