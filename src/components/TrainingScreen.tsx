import { useCallback, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { MotiView } from 'moti';
import { usePersonalRecords } from '../hooks/usePersonalRecords';
import { useMuscleAnalytics } from '../hooks/useMuscleAnalytics';
import { useExerciseStats } from '../hooks/useExerciseStats';
import { useRepRangePRs } from '../hooks/useRepRangePRs';
import { useReadinessScore } from '../hooks/useReadinessScore';
import { useWorkoutFolders } from '../hooks/useWorkoutFolders';
import { useWorkoutTemplates } from '../hooks/useWorkoutTemplates';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { groupByFolder } from '../lib/workout/folders';
import { toBarWidths } from '../lib/analytics/muscleBars';
import { kgToLbs } from '../lib/units';
import WorkoutGenerator from './WorkoutGenerator';
import ResumeWorkouts from './ResumeWorkouts';
import CoachSchedule from './CoachSchedule';
import Card from './ui/Card';
import Button from './ui/Button';
import Select from './ui/Select';
import FadeInView from './ui/FadeInView';
import Skeleton from './ui/Skeleton';
import MuscleBodyMap from './analytics/MuscleBodyMap';

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
export function MyWorkouts({ userId }: { userId: string }) {
  const { folders, error: folderError, refresh: refreshFolders, deleteFolder } = useWorkoutFolders(userId);
  const {
    templates,
    isLoading,
    error: templateError,
    refresh: refreshTemplates,
    moveToFolder,
  } = useWorkoutTemplates(userId);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const action = useAsyncAction();

  useFocusEffect(
    useCallback(() => {
      void refreshFolders();
      void refreshTemplates();
    }, [refreshFolders, refreshTemplates]),
  );

  const search = query.trim().toLocaleLowerCase();
  const matching = templates.filter((t) => t.name.toLocaleLowerCase().includes(search));
  const groups = groupByFolder(matching, folders).filter((group) => !search || group.templates.length > 0);
  const changeFolder = (operation: () => Promise<{ ok: boolean; error?: string }>) => action.run(async () => {
    const result = await operation();
    if (!result.ok) throw new Error(result.error ?? 'Could not update folder.');
    setDeleteId(null);
    await refreshTemplates();
  });

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between px-2">
        <SectionHeader icon="barbell-outline" label="My Workouts" />
        <Pressable accessibilityRole="button" accessibilityLabel="New workout folder" className="min-h-11 min-w-11 items-center justify-center" onPress={() => router.push('/workouts/folders/new')}>
          <Ionicons name="folder-open-outline" size={18} color="#9CA3AF" />
        </Pressable>
      </View>

      <TextInput
        accessibilityLabel="Search workouts"
        placeholder="Search workouts"
        placeholderTextColor="#6B7280"
        value={query}
        onChangeText={setQuery}
        className="min-h-11 bg-surface border border-border rounded-xl px-3 text-white"
      />
      {(folderError || templateError) && (
        <View className="gap-2">
          <Text accessibilityRole="alert" className="text-sm text-red-400">{templateError ?? folderError}</Text>
          <Button size="sm" variant="secondary" onPress={() => { void refreshFolders(); void refreshTemplates(); }}>Retry</Button>
        </View>
      )}
      {action.error && <Text accessibilityRole="alert" className="text-sm text-red-400">{action.error}</Text>}

      {isLoading ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : matching.length === 0 && (search || folders.length === 0) && !templateError ? (
        <View className="items-center py-6 gap-2">
          <Ionicons name="barbell-outline" size={26} color="#6B7280" />
          <Text className="text-sm text-gray-500 text-center">
            {search ? 'No matching workouts.' : 'Generate a workout below or wait for your coach to assign one.'}
          </Text>
        </View>
      ) : (
        groups.map((group) => {
          const key = group.folder?.id ?? 'unfoldered';
          const isCollapsed = !search && collapsed[key];
          return (
            <View key={key} className="gap-2">
              <View className="flex-row items-center gap-1">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${group.folder?.name ?? 'Unfoldered'} workouts`}
                accessibilityState={{ expanded: !isCollapsed, disabled: action.pending }}
                disabled={action.pending}
                onPress={() => setCollapsed((c) => ({ ...c, [key]: !c[key] }))}
                className="flex-1 flex-row items-center gap-2 px-1 min-h-11"
              >
                <Ionicons name={isCollapsed ? 'chevron-forward' : 'chevron-down'} size={16} color="#9CA3AF" />
                <Text className="flex-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {group.folder?.name ?? 'Unfoldered'} ({group.templates.length})
                </Text>
              </Pressable>
              {group.folder && <>
                <Pressable accessibilityRole="button" accessibilityLabel={`Rename ${group.folder.name}`} disabled={action.pending}
                  className="min-h-11 min-w-11 items-center justify-center"
                  onPress={() => router.push({ pathname: '/workouts/folders/new', params: { id: group.folder!.id, name: group.folder!.name } })}>
                  <Ionicons name="pencil-outline" size={18} color="#9CA3AF" />
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${group.folder.name}`} disabled={action.pending}
                  className="min-h-11 min-w-11 items-center justify-center" onPress={() => setDeleteId(group.folder!.id)}>
                  <Ionicons name="trash-outline" size={18} color="#F87171" />
                </Pressable>
              </>}
              </View>
              {deleteId === group.folder?.id && <View className="gap-2 px-1">
                <Text className="text-sm text-gray-300">Delete this folder? Workouts will be kept in Unfoldered.</Text>
                <View className="flex-row gap-2">
                  <Button size="sm" variant="secondary" disabled={action.pending} onPress={() => setDeleteId(null)}>Cancel</Button>
                  <Button size="sm" variant="danger" loading={action.pending} onPress={() => void changeFolder(() => deleteFolder(group.folder!.id))}>Delete folder</Button>
                </View>
              </View>}

              {!isCollapsed &&
                group.templates.map((t) => (
                  <Card key={t.id} className="p-4 gap-3">
                    <View className="flex-row items-center justify-between">
                      <Text className="flex-1 mr-2 text-white font-semibold text-base">{t.name}</Text>
                      <View className="bg-primary/15 border border-primary/30 rounded-full px-2 py-0.5">
                        <Text className="text-primary text-xs font-medium">
                          {t.scope === 'ASSIGNED' ? 'Coach' : 'Mine'}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-xs text-gray-500">{t.exerciseCount} exercises</Text>
                    {folders.length > 0 && (
                      <Select
                        disabled={action.pending}
                        value={t.folderId ?? UNFOLDERED}
                        options={[
                          { value: UNFOLDERED, label: 'No folder' },
                          ...folders.map((f) => ({ value: f.id, label: f.name })),
                        ]}
                        onChange={(value) =>
                          void changeFolder(() => moveToFolder(t.id, value === UNFOLDERED ? null : value))
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

// Rep-range PR row — Tracked-parity: PRs grouped by 1-5/6-10/11+ reps
// instead of one single best-e1RM record. See useRepRangePRs.
function RepRangePRs({ userId, exerciseId }: { userId: string; exerciseId: string }) {
  const { ranges, isLoading } = useRepRangePRs(userId, exerciseId);
  if (isLoading || ranges.length === 0) return null;

  return (
    <View className="flex-row gap-2 px-3 pb-2">
      {ranges.map((r) => (
        <View key={r.range} className="flex-1 bg-background rounded-lg px-2 py-1.5">
          <Text className="text-[10px] text-gray-500 uppercase tracking-wide">{r.range} reps</Text>
          <Text className="text-xs font-semibold text-white">{kgToLbs(r.best_weight_kg)} lbs</Text>
        </View>
      ))}
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
      className="pb-3 gap-1.5"
    >
      <RepRangePRs userId={userId} exerciseId={exerciseId} />
      <View className="px-3 gap-1.5">
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
  const [view, setView] = useState<'list' | 'body'>('body');

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
      <View className="flex-row items-center justify-between">
        <SectionHeader icon="pulse-outline" label="Muscle volume — last 30 days" />
        <View className="flex-row bg-background border border-border rounded-full p-0.5">
          {(['body', 'list'] as const).map((v) => (
            <Pressable
              key={v}
              onPress={() => setView(v)}
              className={`px-3 py-1 rounded-full ${view === v ? 'bg-primary' : ''}`}
            >
              <Text className={`text-[10px] font-bold uppercase ${view === v ? 'text-black' : 'text-gray-400'}`}>
                {v}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Card className="p-4 gap-3">
        {view === 'body' ? (
          <MuscleBodyMap rows={rows} />
        ) : (
          bars.map((b, i) => (
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
          ))
        )}
      </Card>
    </View>
  );
}

// Crude readiness score (0-100) — see src/lib/readiness/score.ts for why
// this is a self-reported-sleep + training-load proxy, not an HRV-based
// wearable score. Framed explicitly as an estimate, not clinical-grade.
function ReadinessCard({ userId }: { userId: string }) {
  const { score, hasData, isLoading } = useReadinessScore(userId);

  if (isLoading) {
    return (
      <View className="gap-2">
        <SectionHeader icon="flash-outline" label="Readiness" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </View>
    );
  }

  const tone = score >= 70 ? 'text-primary' : score >= 40 ? 'text-amber-400' : 'text-red-400';

  return (
    <View className="gap-2">
      <SectionHeader icon="flash-outline" label="Readiness" />
      <Card className="p-4 flex-row items-center justify-between">
        <View className="flex-1">
          <Text className={`text-3xl font-bold ${tone}`}>{score}</Text>
          <Text className="text-xs text-gray-500 mt-1">
            {hasData
              ? 'Estimate from recent sleep + training load — not a wearable-grade score.'
              : 'Log sleep and training to get a readiness estimate.'}
          </Text>
        </View>
      </Card>
    </View>
  );
}

export default function TrainingScreen({ userId }: { userId: string }) {
  return (
    <View className="gap-8">
      <ResumeWorkouts userId={userId} />
      <CoachSchedule userId={userId} />
      <MyWorkouts userId={userId} />
      <WorkoutGenerator userId={userId} />
      <ReadinessCard userId={userId} />
      <PersonalRecordsList userId={userId} />
      <MuscleAnalytics userId={userId} />
    </View>
  );
}
