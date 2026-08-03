// Pure display math for the muscle-volume bar chart: each group's width as
// a percentage of the largest group's volume, so the biggest bar always
// fills the row and the rest scale relative to it.

export interface VolumeRow {
  target_muscle_group: string;
  total_volume_kg: number;
}

export interface BarRow extends VolumeRow {
  widthPct: number;
}

export function toBarWidths(rows: VolumeRow[]): BarRow[] {
  const max = Math.max(0, ...rows.map((r) => r.total_volume_kg));
  if (max === 0) return rows.map((r) => ({ ...r, widthPct: 0 }));
  return rows.map((r) => ({
    ...r,
    widthPct: Math.round((r.total_volume_kg / max) * 100),
  }));
}
