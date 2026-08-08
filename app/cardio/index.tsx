import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTraceUserContext } from '../../src/context/TraceUserContext';
import { useCardioHistory } from '../../src/hooks/useCardioHistory';
import {
  buildWeeklyBuckets,
  formatMinSec,
  groupByDay,
  longestDuration,
  mondayOf,
  thisWeekStats,
} from '../../src/lib/cardio/summary';
import ScreenHeader from '../../src/components/ui/ScreenHeader';
import Card from '../../src/components/ui/Card';

const WEEK_COUNT = 12;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function CardioOverviewScreen() {
  const { profile } = useTraceUserContext();
  const today = new Date();
  const twelveWeeksAgo = mondayOf(
    new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7 * (WEEK_COUNT - 1))
      .toISOString()
      .slice(0, 10),
  );
  const { entries, isLoading, isSupported } = useCardioHistory(profile!.id, twelveWeeksAgo);

  const totalSeconds = entries.reduce((sum, e) => sum + e.durationSeconds, 0);
  const buckets = buildWeeklyBuckets(entries, today, WEEK_COUNT);
  const maxBucket = Math.max(1, ...buckets.map((b) => b.totalSeconds));
  const week = thisWeekStats(entries, today);
  const avgSecondsPerWeek = totalSeconds / WEEK_COUNT;
  const pr = longestDuration(entries);
  const recentDays = groupByDay(entries).slice(0, 10);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader
        title="Cardio"
        right={
          <Pressable onPress={() => router.push({ pathname: '/cardio/select', params: { date: todayKey() } })}>
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </Pressable>
        }
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Loading…</Text>
        </View>
      ) : !isSupported ? (
        <View className="flex-1 items-center justify-center px-6 gap-2">
          <Ionicons name="pulse-outline" size={32} color="#6B7280" />
          <Text className="text-white font-semibold text-center">Cardio tracking isn't live yet</Text>
          <Text className="text-sm text-gray-500 text-center">
            This feature needs a backend update that hasn't been applied yet.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerClassName="p-4 gap-6">
          <View className="items-center gap-1 py-2">
            <View className="w-12 h-12 rounded-full bg-primary/15 items-center justify-center mb-1">
              <Ionicons name="pulse" size={22} color="#4ADE80" />
            </View>
            <Text className="text-white text-5xl font-extrabold">{formatMinSec(totalSeconds)}</Text>
            <Text className="text-sm text-gray-500">total · last {WEEK_COUNT} weeks</Text>
          </View>

          <View className="gap-2">
            <Text className="text-xs text-gray-500 uppercase font-bold tracking-wider">
              Minutes per week
            </Text>
            <View className="flex-row items-end gap-1.5 h-28">
              {buckets.map((b, i) => {
                const isCurrent = i === buckets.length - 1;
                const heightPct = Math.max(6, Math.round((b.totalSeconds / maxBucket) * 100));
                return (
                  <View key={b.weekStart} className="flex-1 items-center">
                    <View
                      className={`w-full rounded-md ${isCurrent ? 'bg-primary' : 'bg-primary/25'}`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </View>
                );
              })}
            </View>
          </View>

          <View className="flex-row gap-3">
            <Card className="flex-1 p-3 items-center gap-1">
              <Text className="text-white text-xl font-extrabold">
                {Math.round(week.totalSeconds / 60)} min
              </Text>
              <Text className="text-[10px] text-gray-500 uppercase font-bold">This week</Text>
            </Card>
            <Card className="flex-1 p-3 items-center gap-1">
              <Text className="text-white text-xl font-extrabold">{week.activeDays}</Text>
              <Text className="text-[10px] text-gray-500 uppercase font-bold">Active days</Text>
            </Card>
            <Card className="flex-1 p-3 items-center gap-1">
              <Text className="text-white text-xl font-extrabold">
                {Math.round(avgSecondsPerWeek / 60)} min
              </Text>
              <Text className="text-[10px] text-gray-500 uppercase font-bold">Avg / wk</Text>
            </Card>
          </View>

          <View className="gap-2">
            <Text className="text-xs text-gray-500 uppercase font-bold tracking-wider">
              Personal records
            </Text>
            <Card className="p-4 flex-row items-center justify-between">
              <Text className="text-white font-semibold">Longest duration</Text>
              <Text className="text-white font-bold">{formatMinSec(pr)}</Text>
            </Card>
          </View>

          <View className="gap-2">
            <Text className="text-xs text-gray-500 uppercase font-bold tracking-wider">
              Recent days
            </Text>
            {recentDays.length === 0 ? (
              <Text className="text-sm text-gray-500 px-1">No cardio logged yet.</Text>
            ) : (
              recentDays.map((d) => (
                <View key={d.date} className="flex-row items-center justify-between py-2 border-b border-border/50">
                  <Text className="text-white font-bold">
                    {new Date(`${d.date}T00:00:00`).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                  <Text className="text-gray-400 text-sm">{d.activityCount} activities</Text>
                  <Text className="text-white font-medium">{formatMinSec(d.totalSeconds)}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
