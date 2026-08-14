// Groups today's nutrition_logs entries into fixed "Meal N" slots for the
// Nutrition tab's UI, matching the reference's Meal 1..6 layout.
//
// nutrition_logs.meal_slot (docs/migrations-drafts/013_nutrition_meal_slot.sql)
// is the real slot the trainee tapped "+" on. Entries missing it — rows
// logged before that migration, or from any insert path that doesn't pass
// a slot — fall back to the original chronological-order approximation:
// assigned in the order they were logged today, with overflow past
// slotCount folding into the last slot.

export interface MealSlotEntry {
  id: string;
  logged_at: string;
  description: string | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  calories: number | null;
  meal_slot?: number | null;
}

export function groupIntoMealSlots<T extends MealSlotEntry>(
  todaysEntries: T[],
  slotCount = 6,
): T[][] {
  const slots: T[][] = Array.from({ length: slotCount }, () => []);

  const unslotted: T[] = [];
  for (const entry of todaysEntries) {
    if (entry.meal_slot != null && entry.meal_slot >= 1 && entry.meal_slot <= slotCount) {
      slots[entry.meal_slot - 1].push(entry);
    } else {
      unslotted.push(entry);
    }
  }

  const oldestFirst = [...unslotted].sort(
    (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime(),
  );
  oldestFirst.forEach((entry, i) => {
    const slotIndex = Math.min(i, slotCount - 1);
    slots[slotIndex].push(entry);
  });

  return slots;
}
