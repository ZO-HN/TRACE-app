import { useCallback, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { MotiView } from 'moti';
import { usePersonalRecords } from '../hooks/usePersonalRecords';
import { useMuscleAnalytics } from '../hooks/useMuscleAnalytics';
import { useExerciseStats } from '../hooks/useExerciseStats';
import { useWorkoutFolders } from '../hooks/useWorkoutFolders';
import { useWorkoutTemplates } from '../hooks/useWorkoutTemplates';
import { groupByFolder } from '../lib/workout/folders';
import { toBarWidths } from '../lib/analytics/muscleBars';
import { kgToLbs } from '../lib/units';
import WorkoutGenerator from './WorkoutGenerator';
import Card from './ui/Card';
import Button from './ui/Button';
import Select from './ui/Select';
import FadeInView from './ui/FadeInView';
import Skeleton from './ui/Skeleton';

const UNFOLDERED = 'none';

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

// Folder-grouped "My Workouts" list — same data/actions as the old
// standalone /workouts route (now retired in favor of living here).
function MyWorkouts({ userId }: { userId: string }) {
  const { folders, refresh: refreshFolders, deleteFolder } = useWorkoutFolders(userId);
  const {
    templates,
    isLoading,
    refresh: refreshTemplates,
    moveToFolder,
  } = useWorkoutTemplates(userId);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useFocusEffect(
    useCallback(() => {
      void refreshFolders();
      void refreshTemplates();
    }, [refreshFolders, refreshTemplates]),
  );

  const groups = groupByFolder(templates, folders);

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between px-2">
        <SectionHeader icon="barbell-outline" label="My Workouts" />
        <Pressable onPress={() => router.push('/workouts/folders/new')}>
          <Ionicons name="folder-open-outline" size={18} color="#9CA3AF" />
        </Pressable>
      </View>

      {isLoading ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : templates.length === 0 ? (
        <View className="items-center py-6 gap-2">
          <Ionicons name="barbell-outline" size={26} color="#6B7280" />
          <Text className="text-sm text-gray-500 text-center">
            Generate a workout below or wait for your coach to assign one.
          </Text>
        </View>
      ) : (
        groups.map((group) => {
          const key = group.folder?.id ?? 'unfoldered';
          const isCollapsed = collapsed[key];
          return (
            <View key={key} className="gap-2">
              <Pressable
                onPress={() => setCollapsed((c) => ({ ...c, [key]: !c[key] }))}
                onLongPress={() => {
                  if (!group.folder) return;
                  Alert.alert(
                    `Delete "${group.folder.name}"?`,
                    'Workouts inside will move to "My Workouts", not be deleted.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => void deleteFolder(group.folder!.id),
                      },
                    ],
                  );
                }}
                className="flex-row items-center gap-2 px-1"
              >
                <Ionicons name={isCollapsed ? 'chevron-forward' : 'chevron-down'} size={16} color="#9CA3AF" />
                <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {group.folder?.name ?? 'Unfoldered'} ({group.templates.length})
                </Text>
              </Pressable>

              {!isCollapsed &&
                group.templates.map((t) => (
                  <Card key={t.id} className="p-4 gap-3">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-white font-semibold text-base">{t.name}</Text>
                      <View className="bg-primary/15 border border-primary/30 rounded-full px-2 py-0.5">
                        <Text className="text-primary text-xs font-medium">
                          {t.scope === 'ASSIGNED' ? 'Coach' : 'Mine'}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-xs text-gray-500">{t.exerciseCount} exercises</Text>
                    {folders.length > 0 && (
                      <Select
                        value={t.folderId ?? UNFOLDERED}
                        options={[
                          { value: UNFOLDERED, label: 'No folder' },
                          ...folders.map((f) => ({ value: f.id, label: f.name })),
                        ]}
                        onChange={(value) =>
                          void moveToFolder(t.id, value === UNFOLDERED ? null : value)
                        }
                      />
                    )}
                    <Button
                      size="sm"
                      onPress={() =>
                        router.push({ pathname: '/(tabs)/session', params: { templateId: t.id } })
                      }
                    >
                      Start Workout
                    </Button>
                  </Card>
                ))}
            </View>
          );
        })
      )}
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

export default function TrainingScreen({ userId }: { userId: string }) {
  return (
    <View className="gap-8">
      <MyWorkouts userId={userId} />
      <WorkoutGenerator userId={userId} />
      <PersonalRecordsList userId={userId} />
      <MuscleAnalytics userId={userId} />
    </View>
  );
}
