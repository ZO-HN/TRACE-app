// Groups today's nutrition_logs entries into fixed "Meal N" slots for the
// Nutrition tab's UI, matching the reference's Meal 1..6 layout.
//
// nutrition_logs has no meal-slot column — adding one would be a schema
// change to a table that's already live (unlike the draft-only tables in
// docs/migrations-drafts/003_nutrition_extensions.sql), so this is a
// client-side-only approximation: entries are assigned to slots in the
// order they were logged today (1st entry -> Meal 1, 2nd -> Meal 2, ...),
// with any overflow past slotCount folding into the last slot. Tapping a
// specific meal's "+" always opens the same logger — the entry lands
// wherever chronological order puts it, not necessarily that exact slot.

export interface MealSlotEntry {
  id: string;
  logged_at: string;
  description: string | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  calories: number | null;
}

export function groupIntoMealSlots<T extends MealSlotEntry>(
  todaysEntries: T[],
  slotCount = 6,
): T[][] {
  const oldestFirst = [...todaysEntries].sort(
    (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime(),
  );

  const slots: T[][] = Array.from({ length: slotCount }, () => []);
  oldestFirst.forEach((entry, i) => {
    const slotIndex = Math.min(i, slotCount - 1);
    slots[slotIndex].push(entry);
  });
  return slots;
}
