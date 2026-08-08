import { Text, View } from 'react-native';
import { useNutritionLogs } from '../hooks/useNutritionLogs';
import { sumTodayMacros } from '../lib/dashboard/today';
import { groupIntoMealSlots } from '../lib/nutrition/mealSlots';
import MacroProgressBar from './nutrition/MacroProgressBar';
import MealSlotCard from './nutrition/MealSlotCard';
import Skeleton from './ui/Skeleton';

const MEAL_SLOT_COUNT = 6;

// No calorie/macro goal feature exists in this app yet (Bodyweight Settings
// is the only settings screen, and it has nothing nutrition-related) -- 0
// means "no goal set", and MacroProgressBar shows 0% rather than NaN for it,
// same as the reference's own display for unset macro goals.
const NO_GOAL = 0;

export default function NutritionLogger({ userId }: { userId: string }) {
  const { entries, isLoading, error } = useNutritionLogs(userId, 50);
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const todaysEntries = entries.filter((e) => e.logged_at.slice(0, 10) === todayKey);
  const macros = sumTodayMacros(entries, today);
  const slots = groupIntoMealSlots(todaysEntries, MEAL_SLOT_COUNT);

  if (isLoading) {
    return (
      <View className="gap-2">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </View>
    );
  }

  return (
    <View className="gap-4">
      {error && (
        <Text className="text-sm text-red-400 px-2">Could not load today's entries: {error}</Text>
      )}
      <View className="gap-3 px-1">
        <MacroProgressBar label="Energy" value={macros.calories} goal={NO_GOAL} unit="kcal" />
        <MacroProgressBar label="Protein" value={macros.protein_g} goal={NO_GOAL} unit="g" />
        <MacroProgressBar label="Carbs" value={macros.carbs_g} goal={NO_GOAL} unit="g" />
        <MacroProgressBar label="Fat" value={macros.fat_g} goal={NO_GOAL} unit="g" />
      </View>

      <View className="gap-2">
        {slots.map((slotEntries, i) => (
          <MealSlotCard key={i} slotNumber={i + 1} entries={slotEntries} />
        ))}
      </View>
    </View>
  );
}
