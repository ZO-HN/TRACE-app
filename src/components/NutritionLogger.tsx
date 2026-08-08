import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNutritionLogs } from '../hooks/useNutritionLogs';
import { buildDateStrip, sumTodayMacros } from '../lib/dashboard/today';
import { groupIntoMealSlots } from '../lib/nutrition/mealSlots';
import MacroProgressBar from './nutrition/MacroProgressBar';
import MealSlotCard from './nutrition/MealSlotCard';
import Skeleton from './ui/Skeleton';

const DEFAULT_MEAL_SLOT_COUNT = 6;

// No calorie/macro goal feature exists in this app yet (Bodyweight Settings
// is the only settings screen, and it has nothing nutrition-related) -- 0
// means "no goal set", and MacroProgressBar shows 0% rather than NaN for it,
// same as the reference's own display for unset macro goals.
const NO_GOAL = 0;

export default function NutritionLogger({ userId }: { userId: string }) {
  const { entries, isLoading, error } = useNutritionLogs(userId, 50);
  // Extra meal slots beyond the default 6, added via "Add Meal". Like the
  // slot assignment itself, this is session-local only — there's no
  // meal-count field anywhere to persist it, so it resets on remount
  // (e.g. switching tabs and back).
  const [extraSlots, setExtraSlots] = useState(0);

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const todaysEntries = entries.filter((e) => e.logged_at.slice(0, 10) === todayKey);
  const macros = sumTodayMacros(entries, today);
  const slotCount = DEFAULT_MEAL_SLOT_COUNT + extraSlots;
  const slots = groupIntoMealSlots(todaysEntries, slotCount);
  const dateStrip = buildDateStrip(today);

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
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-bold text-white">
          {today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </Text>
        <View className="bg-surface border border-border rounded-full px-4 py-1.5">
          <Text className="text-white font-semibold text-sm">Today</Text>
        </View>
      </View>

      <View className="flex-row justify-between">
        {dateStrip.map((d) => (
          <View
            key={d.date}
            className={`w-10 h-10 rounded-xl items-center justify-center ${
              d.isToday ? 'bg-surface border border-primary' : ''
            }`}
          >
            <Text className={`font-bold ${d.isToday ? 'text-white' : 'text-gray-500'}`}>{d.day}</Text>
          </View>
        ))}
      </View>

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

        <Pressable
          onPress={() => setExtraSlots((n) => n + 1)}
          className="flex-row items-center justify-center gap-1.5 h-11 bg-surface border border-dashed border-border rounded-2xl"
        >
          <Ionicons name="add-circle-outline" size={16} color="#3B82F6" />
          <Text className="text-primary text-sm font-semibold">Add Meal</Text>
        </Pressable>
      </View>
    </View>
  );
}
