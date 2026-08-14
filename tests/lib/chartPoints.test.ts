import { describe, expect, it } from 'vitest';
import { buildChartLayout } from '../../src/lib/bodyweight/chartPoints';

const identity = (kg: number) => kg;

describe('buildChartLayout', () => {
  it('returns empty layout for no entries', () => {
    const layout = buildChartLayout([], [], identity, 300, 150);
    expect(layout.raw).toEqual([]);
    expect(layout.average).toEqual([]);
  });

  it('places a single entry at x=0', () => {
    const layout = buildChartLayout([{ recorded_date: '2026-01-01', weight_kg: 80 }], [null], identity, 300, 150);
    expect(layout.raw).toHaveLength(1);
    expect(layout.raw[0].x).toBe(0);
  });

  it('spreads multiple entries evenly across the width', () => {
    const entries = [
      { recorded_date: '2026-01-01', weight_kg: 80 },
      { recorded_date: '2026-01-02', weight_kg: 81 },
      { recorded_date: '2026-01-03', weight_kg: 79 },
    ];
    const layout = buildChartLayout(entries, [null, null, null], identity, 300, 150);
    expect(layout.raw.map((p) => p.x)).toEqual([0, 150, 300]);
  });

  it('maps the max value to y=0 and the min value to y=height', () => {
    const entries = [
      { recorded_date: '2026-01-01', weight_kg: 70 },
      { recorded_date: '2026-01-02', weight_kg: 90 },
    ];
    const layout = buildChartLayout(entries, [null, null], identity, 300, 150);
    const lowPoint = layout.raw.find((p) => p.value === 70)!;
    const highPoint = layout.raw.find((p) => p.value === 90)!;
    expect(highPoint.y).toBe(0);
    expect(lowPoint.y).toBe(150);
  });

  it('drops null moving-average points instead of plotting them at zero', () => {
    const entries = [
      { recorded_date: '2026-01-01', weight_kg: 80 },
      { recorded_date: '2026-01-02', weight_kg: 81 },
    ];
    const layout = buildChartLayout(entries, [null, 80.5], identity, 300, 150);
    expect(layout.average).toHaveLength(1);
    expect(layout.average[0].value).toBe(80.5);
  });

  it('never divides by zero when every value is identical', () => {
    const entries = [
      { recorded_date: '2026-01-01', weight_kg: 80 },
      { recorded_date: '2026-01-02', weight_kg: 80 },
    ];
    const layout = buildChartLayout(entries, [null, null], identity, 300, 150);
    expect(layout.raw.every((p) => Number.isFinite(p.y))).toBe(true);
  });
});
