import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTraceUserContext } from '../../src/context/TraceUserContext';
import { useBodyweightLogs } from '../../src/hooks/useBodyweightLogs';
import { useBodyweightSettings } from '../../src/hooks/useBodyweightSettings';
import { groupByMonth } from '../../src/lib/bodyweight/groupByMonth';
import { movingAverageAt, rateAt, tenDayLowAt } from '../../src/lib/bodyweight/movingAverage';
import { formatWeightKg } from '../../src/lib/units';
import { useUnitPreference } from '../../src/hooks/useUnitPreference';
import ScreenHeader from '../../src/components/ui/ScreenHeader';
import BodyweightChart from '../../src/components/bodyweight/BodyweightChart';

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function BodyweightHistoryScreen() {
  const { profile } = useTraceUserContext();
  const { entries, isLoading } = useBodyweightLogs(profile!.id, 365);
  const { settings } = useBodyweightSettings(profile!.id);
  const { unit } = useUnitPreference();
  const [view, setView] = useState<'list' | 'chart'>('list');
  const window = settings.movingAverageWindow;

  const fmt = (n: number | null): string => (n === null ? '-' : formatWeightKg(n, unit).value.toFixed(1));

  const months = groupByMonth(entries);
  // Global index into `entries` (most-recent-first) is needed for the
  // moving-average window to see across month boundaries.
  let cursor = 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader
        title="Bodyweight"
        right={
          <>
            <Pressable onPress={() => setView((v) => (v === 'list' ? 'chart' : 'list'))}>
              <Ionicons
                name={view === 'chart' ? 'list-outline' : 'bar-chart-outline'}
                size={20}
                color="#E5E7EB"
              />
            </Pressable>
            <Pressable onPress={() => router.push('/bodyweight/settings')}>
              <Ionicons name="settings-outline" size={20} color="#E5E7EB" />
            </Pressable>
          </>
        }
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Loading…</Text>
        </View>
      ) : entries.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6 gap-2">
          <Ionicons name="body-outline" size={32} color="#6B7280" />
          <Text className="text-lg font-bold text-white">No weigh-ins yet</Text>
          <Text className="text-sm text-gray-500 text-center">
            Log a weigh-in from the Progress tab to start tracking.
          </Text>
        </View>
      ) : view === 'chart' ? (
        <ScrollView contentContainerClassName="px-4 py-4">
          <BodyweightChart
            entries={entries}
            window={window}
            toDisplay={(kg) => formatWeightKg(kg, unit).value}
            unit={unit}
          />
        </ScrollView>
      ) : (
        <ScrollView contentContainerClassName="px-4 py-4 gap-6">
          {months.map((group) => (
            <View key={group.key} className="gap-2">
              <Text className="text-xl font-bold text-white">{group.label}</Text>
              <View className="flex-row px-2 pb-1">
                <Text className="flex-1 text-xs text-gray-500 font-medium">Date</Text>
                <Text className="w-16 text-xs text-gray-500 font-medium text-center">Rec.</Text>
                <Text className="w-16 text-xs text-gray-500 font-medium text-center">Avg</Text>
                <Text className="w-20 text-xs text-gray-500 font-medium text-center">Rate</Text>
                <Text className="w-20 text-xs text-gray-500 font-medium text-center">10D Lo</Text>
              </View>
              {group.entries.map((e) => {
                const globalIndex = cursor;
                cursor += 1;
                const date = new Date(`${e.recorded_date}T00:00:00`);
                const avg = movingAverageAt(entries, globalIndex, window);
                const rate = rateAt(entries, globalIndex, window);
                const low = tenDayLowAt(entries, globalIndex);
                return (
                  <View
                    key={e.id}
                    className="flex-row items-center py-2 border-b border-border/50"
                  >
                    <View className="flex-1">
                      <Text className="text-white text-lg font-bold">{date.getDate()}</Text>
                      <Text className="text-gray-500 text-xs">{WEEKDAY[date.getDay()]}</Text>
                    </View>
                    <Text className="w-16 text-center text-gray-300">{fmt(e.weight_kg)}</Text>
                    <Text className="w-16 text-center text-gray-300">{fmt(avg)}</Text>
                    <View className="w-20 items-center">
                      <Text className="text-gray-300 bg-background rounded-lg px-2 py-1 overflow-hidden">
                        {rate === null ? '-' : `${rate > 0 ? '+' : ''}${fmt(rate)}`}
                      </Text>
                    </View>
                    <View className="w-20 items-center">
                      <Text className="text-gray-300 bg-background rounded-lg px-2 py-1 overflow-hidden">
                        {fmt(low)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
