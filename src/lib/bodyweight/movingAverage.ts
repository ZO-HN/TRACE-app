// Pure moving-average / rolling-low calculations for the bodyweight history
// table. All functions take entries sorted most-recent-first (same ordering
// useBodyweightLogs already fetches).

import type { BodyweightPoint } from './trend';

export type MovingAverageWindow = 7 | 14;

/** Average of the `window` most recent entries as of (and including) index i. */
export function movingAverageAt(
  entries: BodyweightPoint[],
  index: number,
  window: MovingAverageWindow,
): number | null {
  const slice = entries.slice(index, index + window);
  if (slice.length === 0) return null;
  const sum = slice.reduce((total, e) => total + e.weight_kg, 0);
  return Math.round((sum / slice.length) * 100) / 100;
}

/** Lowest weight_kg among the 10 most recent entries as of (and including) index i. */
export function tenDayLowAt(entries: BodyweightPoint[], index: number): number | null {
  const slice = entries.slice(index, index + 10);
  if (slice.length === 0) return null;
  return Math.min(...slice.map((e) => e.weight_kg));
}

/** kg/day rate of change between index i and the next-oldest moving-average point. */
export function rateAt(
  entries: BodyweightPoint[],
  index: number,
  window: MovingAverageWindow,
): number | null {
  const currentAvg = movingAverageAt(entries, index, window);
  const priorAvg = movingAverageAt(entries, index + 1, window);
  if (currentAvg === null || priorAvg === null) return null;
  return Math.round((currentAvg - priorAvg) * 100) / 100;
}
