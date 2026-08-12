// Groups a exercise's set history into rep-range buckets (1-5 / 6-10 /
// 11+), each keeping its best weight — Tracked shows PRs this way instead
// of one single best-e1RM record per exercise. Pure and framework-free.

export interface RepRangeSetRow {
  weight_kg: number;
  reps: number;
  achieved_at: string;
}

export type RepRangeLabel = '1-5' | '6-10' | '11+';

export interface RepRangePR {
  range: RepRangeLabel;
  best_weight_kg: number;
  best_reps: number;
  achieved_at: string;
}

function bucketFor(reps: number): RepRangeLabel {
  if (reps <= 5) return '1-5';
  if (reps <= 10) return '6-10';
  return '11+';
}

const RANGE_ORDER: RepRangeLabel[] = ['1-5', '6-10', '11+'];

/** One row per rep-range that has at least one set, ordered 1-5 → 11+. */
export function groupByRepRange(rows: RepRangeSetRow[]): RepRangePR[] {
  const best = new Map<RepRangeLabel, RepRangePR>();

  for (const row of rows) {
    if (row.reps <= 0) continue;
    const range = bucketFor(row.reps);
    const current = best.get(range);
    if (!current || row.weight_kg > current.best_weight_kg) {
      best.set(range, {
        range,
        best_weight_kg: row.weight_kg,
        best_reps: row.reps,
        achieved_at: row.achieved_at,
      });
    }
  }

  return RANGE_ORDER.map((r) => best.get(r)).filter((r): r is RepRangePR => r != null);
}
