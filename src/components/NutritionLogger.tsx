import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNutritionLogs } from '../hooks/useNutritionLogs';
import { useNutritionWeeklySummary } from '../hooks/useNutritionWeeklySummary';
import { useSessionSummaries } from '../hooks/useSessionSummaries';
import { useBodyweightLogs } from '../hooks/useBodyweightLogs';
import { buildDateStrip, sumTodayMacros } from '../lib/dashboard/today';
import { groupIntoMealSlots } from '../lib/nutrition/mealSlots';
import { netCarbsG } from '../lib/nutrition/netCarbs';
import MacroProgressBar from './nutrition/MacroProgressBar';
import MealSlotCard from './nutrition/MealSlotCard';
import TrainingCorrelation from './nutrition/TrainingCorrelation';
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
  const [showNetCarbs, setShowNetCarbs] = useState(false);
  const { comparison: weekly } = useNutritionWeeklySummary(userId);
  const { sessions } = useSessionSummaries(userId, 30);
  const { entries: bwEntries } = useBodyweightLogs(userId, 30);

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const todaysEntries = entries.filter((e) => e.logged_at.slice(0, 10) === todayKey);
  const macros = sumTodayMacros(entries, today);
  const netCarbsTotal = todaysEntries.reduce(
    (sum, e) => sum + (netCarbsG(e.carbs_g, e.fiber_g ?? null) ?? 0),
    0,
  );
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
        <View className="gap-1">
          <MacroProgressBar
            label={showNetCarbs ? 'Net Carbs' : 'Carbs'}
            value={showNetCarbs ? netCarbsTotal : macros.carbs_g}
            goal={NO_GOAL}
            unit="g"
          />
          <Pressable onPress={() => setShowNetCarbs((v) => !v)} className="self-end">
            <Text className="text-[11px] text-gray-500">
              Show {showNetCarbs ? 'total' : 'net'} carbs
            </Text>
          </Pressable>
        </View>
        <MacroProgressBar label="Fat" value={macros.fat_g} goal={NO_GOAL} unit="g" />
      </View>

      {weekly.thisWeek.daysLogged > 0 && (
        <View className="bg-surface border border-border rounded-2xl px-4 py-3 gap-1">
          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            This week vs. last week
          </Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-white text-lg font-bold">
              {weekly.thisWeek.avgCalories} <Text className="text-xs text-gray-500 font-normal">kcal/day avg</Text>
            </Text>
            {weekly.caloriesDeltaPct != null && (
              <Text
                className={`text-xs font-semibold ${
                  weekly.caloriesDeltaPct > 0 ? 'text-amber-400' : 'text-primary'
                }`}
              >
                {weekly.caloriesDeltaPct > 0 ? '+' : ''}
                {weekly.caloriesDeltaPct}% vs last week
              </Text>
            )}
          </View>
        </View>
      )}

      <TrainingCorrelation
        nutritionEntries={entries}
        trainingDates={sessions.map((s) => s.completed_at)}
        bodyweightEntries={bwEntries}
      />

      <View className="gap-2">
        {slots.map((slotEntries, i) => (
          <MealSlotCard key={i} slotNumber={i + 1} entries={slotEntries} />
        ))}

        <Pressable
          onPress={() => setExtraSlots((n) => n + 1)}
          className="flex-row items-center justify-center gap-1.5 h-11 bg-surface border border-dashed border-border rounded-2xl"
        >
          <Ionicons name="add-circle-outline" size={16} color="#4ADE80" />
          <Text className="text-primary text-sm font-semibold">Add Meal</Text>
        </Pressable>
      </View>
    </View>
  );
}
