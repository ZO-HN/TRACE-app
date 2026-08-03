import { describe, expect, it } from 'vitest';
import { toBarWidths } from '../../src/lib/analytics/muscleBars';

describe('toBarWidths', () => {
  it('scales the largest group to 100% and others relative to it', () => {
    const result = toBarWidths([
      { target_muscle_group: 'Chest', total_volume_kg: 1000 },
      { target_muscle_group: 'Back', total_volume_kg: 500 },
      { target_muscle_group: 'Legs', total_volume_kg: 2000 },
    ]);
    expect(result).toEqual([
      { target_muscle_group: 'Chest', total_volume_kg: 1000, widthPct: 50 },
      { target_muscle_group: 'Back', total_volume_kg: 500, widthPct: 25 },
      { target_muscle_group: 'Legs', total_volume_kg: 2000, widthPct: 100 },
    ]);
  });

  it('returns 0% widths for an empty list without dividing by zero', () => {
    expect(toBarWidths([])).toEqual([]);
  });

  it('returns 0% widths when every volume is zero', () => {
    expect(
      toBarWidths([{ target_muscle_group: 'Chest', total_volume_kg: 0 }]),
    ).toEqual([{ target_muscle_group: 'Chest', total_volume_kg: 0, widthPct: 0 }]);
  });
});
