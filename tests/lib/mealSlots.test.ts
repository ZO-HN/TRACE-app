import { describe, expect, it } from 'vitest';
import { groupIntoMealSlots, type MealSlotEntry } from '../../src/lib/nutrition/mealSlots';

const entry = (id: string, loggedAt: string): MealSlotEntry => ({
  id,
  logged_at: loggedAt,
  description: id,
  protein_g: null,
  carbs_g: null,
  fat_g: null,
  calories: null,
});

describe('groupIntoMealSlots', () => {
  it('assigns entries to slots in chronological (oldest-first) order', () => {
    const entries = [
      entry('c', '2026-08-09T18:00:00Z'),
      entry('a', '2026-08-09T08:00:00Z'),
      entry('b', '2026-08-09T12:00:00Z'),
    ];
    const slots = groupIntoMealSlots(entries, 6);
    expect(slots[0].map((e) => e.id)).toEqual(['a']);
    expect(slots[1].map((e) => e.id)).toEqual(['b']);
    expect(slots[2].map((e) => e.id)).toEqual(['c']);
    expect(slots[3]).toEqual([]);
  });

  it('folds overflow entries past slotCount into the last slot', () => {
    const entries = Array.from({ length: 8 }, (_, i) =>
      entry(String(i), `2026-08-09T0${i}:00:00Z`),
    );
    const slots = groupIntoMealSlots(entries, 6);
    expect(slots).toHaveLength(6);
    expect(slots[5].map((e) => e.id)).toEqual(['5', '6', '7']);
  });

  it('returns slotCount empty arrays for no entries', () => {
    expect(groupIntoMealSlots([], 6)).toEqual([[], [], [], [], [], []]);
  });
});
