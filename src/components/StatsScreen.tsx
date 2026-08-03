import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { usePersonalRecords } from '../hooks/usePersonalRecords';
import { useMuscleAnalytics } from '../hooks/useMuscleAnalytics';
import { useExerciseStats } from '../hooks/useExerciseStats';
import { toBarWidths } from '../lib/analytics/muscleBars';
import { kgToLbs } from '../lib/units';

function ExerciseStatsDetail({ userId, exerciseId }: { userId: string; exerciseId: string }) {
  const { points, isLoading, error } = useExerciseStats(userId, exerciseId);

  if (isLoading) return <Text className="text-xs text-gray-500 px-3 pb-3">Loading…</Text>;
  if (error) return <Text className="text-xs text-red-400 px-3 pb-3">{error}</Text>;
  if (points.length === 0) {
    return (
      <Text className="text-xs text-gray-500 px-3 pb-3">
        No sets logged for this exercise in the last 90 days.
      </Text>
    );
  }

  return (
    <View className="px-3 pb-3 gap-1.5">
      {points
        .slice()
        .reverse()
        .map((p) => (
          <View key={p.session_date} className="flex-row items-center justify-between">
            <Text className="text-xs text-gray-400">{p.session_date}</Text>
            <Text className="text-xs text-gray-300">
              top {kgToLbs(p.top_weight_kg)} lbs · {p.total_sets} sets
            </Text>
          </View>
        ))}
    </View>
  );
}

function PersonalRecordsList({ userId }: { userId: string }) {
  const { records, isLoading, error } = usePersonalRecords(userId);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) return <Text className="text-sm text-gray-500 px-2">Loading…</Text>;
  if (error) {
    return <Text className="text-sm text-red-400 px-2">Could not load records: {error}</Text>;
  }
  if (records.length === 0) {
    return <Text className="text-sm text-gray-500 px-2">No sets logged yet.</Text>;
  }

  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-gray-400 uppercase tracking-wider px-2">
        Personal records
      </Text>
      {records.map((r) => (
        <View key={r.exercise_id} className="bg-surface border border-border rounded-lg">
          <Pressable
            onPress={() => setExpanded((cur) => (cur === r.exercise_id ? null : r.exercise_id))}
            className="flex-row items-center justify-between px-3 py-2.5"
          >
            <View>
              <Text className="text-sm font-medium text-white">{r.exercise_name}</Text>
              <Text className="text-xs text-gray-500">{r.target_muscle_group}</Text>
            </View>
            <View className="items-end">
              <Text className="text-sm font-semibold text-primary">
                {kgToLbs(r.best_weight_kg)} lbs × {r.best_reps}
              </Text>
              {r.best_estimated_1rm != null && (
                <Text className="text-xs text-gray-500">
                  e1RM {kgToLbs(r.best_estimated_1rm)} lbs
                </Text>
              )}
            </View>
          </Pressable>
          {expanded === r.exercise_id && (
            <ExerciseStatsDetail userId={userId} exerciseId={r.exercise_id} />
          )}
        </View>
      ))}
    </View>
  );
}

function MuscleAnalytics({ userId }: { userId: string }) {
  const { rows, isLoading, error } = useMuscleAnalytics(userId);

  if (isLoading) return <Text className="text-sm text-gray-500 px-2">Loading…</Text>;
  if (error) {
    return <Text className="text-sm text-red-400 px-2">Could not load analytics: {error}</Text>;
  }
  if (rows.length === 0) {
    return (
      <Text className="text-sm text-gray-500 px-2">
        No sets logged in the last 30 days.
      </Text>
    );
  }

  const bars = toBarWidths(rows);

  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-gray-400 uppercase tracking-wider px-2">
        Muscle volume — last 30 days
      </Text>
      <View className="bg-surface border border-border rounded-xl p-4 gap-3">
        {bars.map((b) => (
          <View key={b.target_muscle_group} className="gap-1">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-medium text-gray-300">
                {b.target_muscle_group}
              </Text>
              <Text className="text-xs text-gray-500">
                {Math.round(kgToLbs(b.total_volume_kg)).toLocaleString()} lbs
              </Text>
            </View>
            <View className="h-2 bg-background rounded-full overflow-hidden">
              <View
                className="h-2 bg-primary rounded-full"
                style={{ width: `${b.widthPct}%` }}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function StatsScreen({ userId }: { userId: string }) {
  return (
    <View className="gap-8">
      <PersonalRecordsList userId={userId} />
      <MuscleAnalytics userId={userId} />
    </View>
  );
}
