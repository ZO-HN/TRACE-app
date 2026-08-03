import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { usePersonalRecords } from '../hooks/usePersonalRecords';
import { useMuscleAnalytics } from '../hooks/useMuscleAnalytics';
import { useExerciseStats } from '../hooks/useExerciseStats';
import { toBarWidths } from '../lib/analytics/muscleBars';
import { kgToLbs } from '../lib/units';
import WorkoutGenerator from './WorkoutGenerator';
import Card from './ui/Card';
import FadeInView from './ui/FadeInView';
import Skeleton from './ui/Skeleton';

function SectionHeader({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5 px-2">
      <Ionicons name={icon} size={14} color="#9CA3AF" />
      <Text className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
        {label}
      </Text>
    </View>
  );
}

function ExerciseStatsDetail({ userId, exerciseId }: { userId: string; exerciseId: string }) {
  const { points, isLoading, error } = useExerciseStats(userId, exerciseId);

  if (isLoading) return <Skeleton className="h-8 mx-3 mb-3 rounded-md" />;
  if (error) return <Text className="text-xs text-red-400 px-3 pb-3">{error}</Text>;
  if (points.length === 0) {
    return (
      <Text className="text-xs text-gray-500 px-3 pb-3">
        No sets logged for this exercise in the last 90 days.
      </Text>
    );
  }

  return (
    <MotiView
      from={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="px-3 pb-3 gap-1.5"
    >
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
    </MotiView>
  );
}

function PersonalRecordsList({ userId }: { userId: string }) {
  const { records, isLoading, error } = usePersonalRecords(userId);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) {
    return (
      <View className="gap-2">
        <SectionHeader icon="trophy-outline" label="Personal records" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </View>
    );
  }
  if (error) {
    return <Text className="text-sm text-red-400 px-2">Could not load records: {error}</Text>;
  }
  if (records.length === 0) {
    return (
      <View className="items-center py-6 gap-2">
        <Ionicons name="trophy-outline" size={26} color="#6B7280" />
        <Text className="text-sm text-gray-500">No sets logged yet.</Text>
      </View>
    );
  }

  return (
    <View className="gap-2">
      <SectionHeader icon="trophy-outline" label="Personal records" />
      {records.map((r, i) => {
        const isOpen = expanded === r.exercise_id;
        return (
          <FadeInView key={r.exercise_id} delay={i * 40}>
            <Card>
              <Pressable
                onPress={() => setExpanded(isOpen ? null : r.exercise_id)}
                className="flex-row items-center justify-between px-3 py-2.5"
              >
                <View className="flex-1">
                  <Text className="text-sm font-medium text-white">{r.exercise_name}</Text>
                  <Text className="text-xs text-gray-500">{r.target_muscle_group}</Text>
                </View>
                <View className="items-end mr-2">
                  <Text className="text-sm font-semibold text-primary">
                    {kgToLbs(r.best_weight_kg)} lbs × {r.best_reps}
                  </Text>
                  {r.best_estimated_1rm != null && (
                    <Text className="text-xs text-gray-500">
                      e1RM {kgToLbs(r.best_estimated_1rm)} lbs
                    </Text>
                  )}
                </View>
                <MotiView animate={{ rotate: isOpen ? '90deg' : '0deg' }} transition={{ type: 'timing', duration: 150 }}>
                  <Ionicons name="chevron-forward" size={16} color="#6B7280" />
                </MotiView>
              </Pressable>
              {isOpen && <ExerciseStatsDetail userId={userId} exerciseId={r.exercise_id} />}
            </Card>
          </FadeInView>
        );
      })}
    </View>
  );
}

function MuscleAnalytics({ userId }: { userId: string }) {
  const { rows, isLoading, error } = useMuscleAnalytics(userId);

  if (isLoading) {
    return (
      <View className="gap-2">
        <SectionHeader icon="pulse-outline" label="Muscle volume — last 30 days" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </View>
    );
  }
  if (error) {
    return <Text className="text-sm text-red-400 px-2">Could not load analytics: {error}</Text>;
  }
  if (rows.length === 0) {
    return (
      <View className="items-center py-6 gap-2">
        <Ionicons name="pulse-outline" size={26} color="#6B7280" />
        <Text className="text-sm text-gray-500">No sets logged in the last 30 days.</Text>
      </View>
    );
  }

  const bars = toBarWidths(rows);

  return (
    <View className="gap-2">
      <SectionHeader icon="pulse-outline" label="Muscle volume — last 30 days" />
      <Card className="p-4 gap-3">
        {bars.map((b, i) => (
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
              <MotiView
                className="h-2 bg-primary rounded-full"
                from={{ width: '0%' }}
                animate={{ width: `${b.widthPct}%` }}
                transition={{ type: 'timing', duration: 500, delay: i * 60 }}
              />
            </View>
          </View>
        ))}
      </Card>
    </View>
  );
}

export default function StatsScreen({ userId }: { userId: string }) {
  return (
    <View className="gap-8">
      <WorkoutGenerator userId={userId} />
      <PersonalRecordsList userId={userId} />
      <MuscleAnalytics userId={userId} />
    </View>
  );
}
