// Pure trend calc for the bodyweight list — the delta between the two most
// recent entries, in kg.

export interface BodyweightPoint {
  recorded_date: string;
  weight_kg: number;
}

export type TrendDirection = 'up' | 'down' | 'flat' | 'unknown';

export interface Trend {
  direction: TrendDirection;
  deltaKg: number | null;
}

/** `entries` must be sorted most-recent-first. */
export function latestTrend(entries: BodyweightPoint[]): Trend {
  if (entries.length < 2) return { direction: 'unknown', deltaKg: null };

  const delta = Math.round((entries[0].weight_kg - entries[1].weight_kg) * 100) / 100;
  if (delta === 0) return { direction: 'flat', deltaKg: 0 };
  return { direction: delta > 0 ? 'up' : 'down', deltaKg: delta };
}
