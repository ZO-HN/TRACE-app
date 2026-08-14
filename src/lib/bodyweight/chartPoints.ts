// Pure layout math for BodyweightChart — maps chronological entries onto an
// SVG viewBox, separate from the component so it's unit-testable without
// rendering.

export interface WeightPoint {
  recorded_date: string;
  weight_kg: number;
}

export interface ChartPoint {
  x: number;
  y: number;
  value: number;
}

export interface ChartLayout {
  raw: ChartPoint[];
  average: ChartPoint[];
  minValue: number;
  maxValue: number;
}

/** entries must be chronological (oldest first). movingAverage[i] pairs
 * with entries[i] (null where there's not enough history yet). */
export function buildChartLayout(
  entries: WeightPoint[],
  movingAverage: (number | null)[],
  toDisplay: (kg: number) => number,
  width: number,
  height: number,
): ChartLayout {
  if (entries.length === 0) {
    return { raw: [], average: [], minValue: 0, maxValue: 0 };
  }

  const rawValues = entries.map((e) => toDisplay(e.weight_kg));
  const avgValues = movingAverage.map((v) => (v === null ? null : toDisplay(v)));
  const allValues = [...rawValues, ...avgValues.filter((v): v is number => v !== null)];
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const range = maxValue - minValue || 1;

  const xStep = entries.length > 1 ? width / (entries.length - 1) : 0;
  const yFor = (value: number) => height - ((value - minValue) / range) * height;

  const raw: ChartPoint[] = rawValues.map((value, i) => ({ x: i * xStep, y: yFor(value), value }));
  const average: ChartPoint[] = avgValues
    .map((value, i) => (value === null ? null : { x: i * xStep, y: yFor(value), value }))
    .filter((p): p is ChartPoint => p !== null);

  return { raw, average, minValue, maxValue };
}
