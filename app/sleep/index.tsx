import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTraceUserContext } from '../../src/context/TraceUserContext';
import { useSleepLogs } from '../../src/hooks/useSleepLogs';
import {
  averageHours,
  averageQuality,
  bestNight,
  durationHours,
  formatHours,
  lastNight,
  worstNight,
} from '../../src/lib/sleep/summary';
import ScreenHeader from '../../src/components/ui/ScreenHeader';
import Card from '../../src/components/ui/Card';
import LogSleepSheet from '../../src/components/sleep/LogSleepSheet';

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <Card className="flex-1 p-3 items-center gap-1">
      <Text className="text-white text-xl font-extrabold">{value}</Text>
      <Text className="text-[10px] text-gray-500 uppercase font-bold text-center">{label}</Text>
    </Card>
  );
}

function daysAgoKey(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function SleepOverviewScreen() {
  const { profile } = useTraceUserContext();
  const { logs, isLoading, isSupported, logSleep } = useSleepLogs(profile!.id, daysAgoKey(30));
  const [sheetOpen, setSheetOpen] = useState(false);

  const today = new Date();
  const last = lastNight(logs);
  const avg7 = averageHours(logs, today, 7);
  const avg30 = averageHours(logs, today, 30);
  const best = bestNight(logs);
  const worst = worstNight(logs);
  const avgQuality = averageQuality(logs);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader
        title="Sleep"
        right={
          <Pressable onPress={() => setSheetOpen(true)}>
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
          <Ionicons name="moon-outline" size={32} color="#6B7280" />
          <Text className="text-white font-semibold text-center">Sleep tracking isn't live yet</Text>
          <Text className="text-sm text-gray-500 text-center">
            This feature needs a backend update that hasn't been applied yet.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerClassName="p-4 gap-6">
          <View className="items-center gap-1 py-4">
            <View className="w-40 h-40 rounded-full border-4 border-border items-center justify-center gap-1">
              <Ionicons name="moon" size={24} color="#4ADE80" />
              <Text className="text-white text-4xl font-extrabold">
                {last ? formatHours(durationHours(last)) : '--'}
              </Text>
            </View>
            <Text className="text-gray-400 text-sm mt-3">
              {last ? 'Last Night · Manual' : 'No sleep logged yet'}
            </Text>
            {last && <Text className="text-gray-500 text-sm">Quality {last.quality}/5</Text>}
          </View>

          <View className="flex-row gap-3">
            <StatBox value={avg7 !== null ? formatHours(avg7) : '--'} label="7D Avg" />
            <StatBox value={avg30 !== null ? formatHours(avg30) : '--'} label="30D Avg" />
            <StatBox value={best ? formatHours(durationHours(best)) : '--'} label="Best Night" />
          </View>
          <View className="flex-row gap-3 -mt-3">
            <StatBox value={worst ? formatHours(durationHours(worst)) : '--'} label="Worst Night" />
            <StatBox value={avgQuality !== null ? `${avgQuality.toFixed(1)}/5` : '--'} label="Avg Quality" />
            <StatBox value="--" label="Avg Efficiency" />
          </View>

          <View className="gap-2">
            <Text className="text-xs text-gray-500 uppercase font-bold tracking-wider">
              Sleep stages
            </Text>
            <Text className="text-sm text-gray-500">No stage breakdown recorded for this period</Text>
          </View>

          <View className="gap-2">
            <Text className="text-xs text-gray-500 uppercase font-bold tracking-wider">History</Text>
            {logs.length === 0 ? (
              <Text className="text-sm text-gray-500">No entries yet.</Text>
            ) : (
              logs.map((log) => (
                <Card key={log.id} className="flex-row items-center justify-between px-4 py-3">
                  <Text className="text-white font-bold">
                    {new Date(`${log.sleepDate}T00:00:00`).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                  <Text className="text-gray-400 text-sm">Manual</Text>
                  <Text className="text-gray-400 text-sm">Quality {log.quality}/5</Text>
                  <Text className="text-white font-bold">{formatHours(durationHours(log))}</Text>
                </Card>
              ))
            )}
          </View>
        </ScrollView>
      )}

      <LogSleepSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSave={async (bedtime, wakeTime, quality) => {
          await logSleep(wakeTime.toISOString().slice(0, 10), bedtime.toISOString(), wakeTime.toISOString(), quality);
          setSheetOpen(false);
        }}
      />
    </SafeAreaView>
  );
}
