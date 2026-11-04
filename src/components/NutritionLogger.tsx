import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useNutritionWeeklySummary } from '../hooks/useNutritionWeeklySummary';
import { useSessionSummaries } from '../hooks/useSessionSummaries';
import { useBodyweightLogs } from '../hooks/useBodyweightLogs';
import TrainingCorrelation from './nutrition/TrainingCorrelation';
import { useNutritionLogs } from '../hooks/useNutritionLogs';
import { sumTodayMacros } from '../lib/dashboard/today';
import { groupIntoMealSlots } from '../lib/nutrition/mealSlots';
import { localDate } from '../lib/localDate';
import MealSlotCard from './nutrition/MealSlotCard';
import Button from './ui/Button';
import Skeleton from './ui/Skeleton';

export default function NutritionLogger({ userId }: { userId: string }) {
  const today = new Date();
  const { entries, isLoading, error, refresh } = useNutritionLogs(userId, 50, localDate(today));
  const { entries: recentEntries } = useNutritionLogs(userId, 50);
  const { comparison: weekly } = useNutritionWeeklySummary(userId);
  const { sessions } = useSessionSummaries(userId, 30);
  const { entries: bwEntries } = useBodyweightLogs(userId, 30);
  const [extraSlots, setExtraSlots] = useState(0);
  const macros = sumTodayMacros(entries, today);
  // Restore persisted meal slots, including meals added on a previous visit.
  const slotCount = Math.max(3 + extraSlots, ...entries.map((e) => Number.isInteger(e.meal_slot) && (e.meal_slot ?? 0) > 0 ? e.meal_slot! : 0));
  const slots = groupIntoMealSlots(entries, slotCount);
  const pending = entries.filter((e) => e.syncStatus && e.syncStatus !== 'synced').length;
  const failed = entries.some((e) => e.syncStatus === 'failed');

  return (
    <View className="gap-5">
      <View className="gap-1">
        <Text accessibilityRole="header" className="text-2xl font-bold text-white">Nutrition</Text>
        <Text className="text-sm text-gray-400">Today · {today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
      </View>

      {error && (
        <View accessibilityLiveRegion="polite" className="bg-surface border border-border rounded-2xl p-4 gap-2">
          <Text className="text-sm text-amber-300">Couldn't load all of today's food. Showing available entries; totals may be incomplete.</Text>
          <Button variant="secondary" loading={isLoading} onPress={refresh}>Retry loading</Button>
        </View>
      )}

      {isLoading && entries.length === 0 ? (
        <View accessible accessibilityLabel="Loading today's nutrition" className="gap-2">
          <Skeleton className="h-32 w-full rounded-xl" />
        </View>
      ) : (
        <View className="bg-surface border border-border rounded-2xl p-4 gap-4">
          <View>
            <Text className="text-sm text-gray-400">{error ? 'Available energy' : 'Energy logged'}</Text>
            <Text className="text-4xl font-bold text-white">{Math.round(macros.calories)} <Text className="text-base font-normal text-gray-400">kcal</Text></Text>
          </View>
          <View className="flex-row flex-wrap gap-4 border-t border-border pt-3">
            {[
              { label: 'Protein', value: macros.protein_g, color: 'text-primary' },
              { label: 'Carbs', value: macros.carbs_g, color: 'text-blue-300' },
              { label: 'Fat', value: macros.fat_g, color: 'text-amber-300' },
            ].map((macro) => (
              <View key={macro.label} style={{ flexGrow: 1, minWidth: 64 }}>
                <Text className={`text-lg font-bold ${macro.color}`}>{Number(macro.value.toFixed(1))} g</Text>
                <Text className="text-sm text-gray-400">{macro.label}</Text>
              </View>
            ))}
          </View>
          <Text className="text-xs text-gray-400">Logged totals · no daily targets configured</Text>
        </View>
      )}

      {isLoading && entries.length > 0 && <Text accessibilityLiveRegion="polite" className="text-sm text-gray-400">Updating today's food…</Text>}
      <Button onPress={() => router.push({ pathname: '/nutrition/add-meal', params: { slot: '1' } })} fullWidth>Add food</Button>
      {pending > 0 && (
        <Text accessibilityLiveRegion="polite" className="text-sm text-amber-300">
          {pending} {pending === 1 ? 'entry saved' : 'entries saved'} on this device · {failed ? 'Sync needs attention. Use the sync banner to retry.' : 'Waiting to sync'}
        </Text>
      )}
      <View className="gap-3">
        <View className="flex-row flex-wrap justify-between gap-2">
          <Text accessibilityRole="header" className="text-lg font-bold text-white">Today's meals</Text>
          <Text className="text-sm text-gray-400">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</Text>
        </View>
        {!isLoading && !error && entries.length === 0 && (
          <Text className="text-sm text-gray-400">No food logged today. Add your first food or enter calories and macros.</Text>
        )}
        {slots.map((slotEntries, i) => <MealSlotCard key={i} slotNumber={i + 1} entries={slotEntries} />)}
        <Pressable accessibilityRole="button" onPress={() => setExtraSlots(slotCount - 3 + 1)} className="min-h-12 items-center justify-center rounded-xl border border-dashed border-border px-4 py-3">
          <Text className="text-primary text-sm font-semibold">Add another meal section</Text>
        </Pressable>
      </View>
      {weekly.thisWeek.daysLogged > 0 && (
        <View className="bg-surface border border-border rounded-2xl p-4 gap-2">
          <Text className="text-sm font-semibold text-gray-400">This week vs. last week</Text>
          <Text className="text-xl font-bold text-white">{weekly.thisWeek.avgCalories} <Text className="text-sm font-normal text-gray-400">kcal/day average</Text></Text>
          {weekly.caloriesDeltaPct != null && <Text className="text-sm text-gray-400">{weekly.caloriesDeltaPct > 0 ? '+' : ''}{weekly.caloriesDeltaPct}% vs. last week</Text>}
        </View>
      )}
      <TrainingCorrelation nutritionEntries={recentEntries} trainingDates={sessions.map((s) => s.completed_at)} bodyweightEntries={bwEntries} />
    </View>
  );
}
