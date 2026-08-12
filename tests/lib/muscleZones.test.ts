import { describe, expect, it } from 'vitest';
import { aggregateByZone, intensityLevel, zoneForMuscleName } from '../../src/lib/analytics/muscleZones';

describe('zoneForMuscleName', () => {
  it('classifies granular sub-muscle names into their parent zone', () => {
    expect(zoneForMuscleName('Biceps Brachii Long Head (Biceps)')).toBe('biceps');
    expect(zoneForMuscleName('Adductor Longus (Adductors (Hip))')).toBe('hips');
    expect(zoneForMuscleName('Anterior Delts (Delts)')).toBe('shoulders');
    expect(zoneForMuscleName('Gastrocnemius (Calves)')).toBe('calves');
  });

  it('returns null for names it cannot classify', () => {
    expect(zoneForMuscleName('Some Unknown Muscle')).toBeNull();
  });
});

describe('aggregateByZone', () => {
  it('sums volume across multiple sub-muscle rows into one zone', () => {
    const result = aggregateByZone([
      { target_muscle_group: 'Biceps Brachii Long Head (Biceps)', total_volume_kg: 100, total_sets: 3 },
      { target_muscle_group: 'Biceps Brachii Short Head (Biceps)', total_volume_kg: 50, total_sets: 2 },
    ]);
    const biceps = result.find((r) => r.zone === 'biceps');
    expect(biceps).toEqual({ zone: 'biceps', totalVolumeKg: 150, totalSets: 5 });
  });

  it('includes every zone even when untrained, at zero', () => {
    const result = aggregateByZone([]);
    expect(result.every((r) => r.totalVolumeKg === 0 && r.totalSets === 0)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('drops rows it cannot classify into any zone', () => {
    const result = aggregateByZone([{ target_muscle_group: 'Mystery Muscle', total_volume_kg: 999, total_sets: 9 }]);
    const total = result.reduce((sum, r) => sum + r.totalVolumeKg, 0);
    expect(total).toBe(0);
  });
});

describe('intensityLevel', () => {
  it('returns 0 for untrained zones', () => {
    expect(intensityLevel(0, 1000)).toBe(0);
  });

  it('scales from 1 to 5 relative to the max', () => {
    expect(intensityLevel(1000, 1000)).toBe(5);
    expect(intensityLevel(200, 1000)).toBe(1);
  });

  it('never divides by zero when nothing has been trained', () => {
    expect(intensityLevel(0, 0)).toBe(0);
  });
});
