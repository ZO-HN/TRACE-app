import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useAssignedWorkout } from '../hooks/useAssignedWorkout';
import { useBodyweightLogs } from '../hooks/useBodyweightLogs';
import { useStepsLogs } from '../hooks/useStepsLogs';
import { useNutritionLogs } from '../hooks/useNutritionLogs';
import { useSleepLogs } from '../hooks/useSleepLogs';
import { useWaterLogs } from '../hooks/useWaterLogs';
import { sumTodayMacros } from '../lib/dashboard/today';
import { latestTrend } from '../lib/bodyweight/trend';
import { isValidBodyweightLbs } from '../lib/bodyweight/mapBodyweight';
import { parseBodyweightNumber } from '../lib/bodyweight/entryInput';
import type { WeightDisplayUnit } from '../lib/units';
import { durationHours, formatHours, lastNight } from '../lib/sleep/summary';
import { formatWeightKg, kgToLbs } from '../lib/units';
import { localDate } from '../lib/localDate';
import { useUnitPreference } from '../hooks/useUnitPreference';
import Card from './ui/Card';
import Button from './ui/Button';
import LogSleepSheet from './sleep/LogSleepSheet';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { isValidSteps } from '../lib/health/inputValidation';
import DateNavigator from './dashboard/DateNavigator';
import DayHistory from './dashboard/DayHistory';
import { useDashboardLayout } from '../hooks/useDashboardLayout';
import { dashboardGroups, defaultDashboardLayout } from '../lib/dashboard/layout';
import Switch from './ui/Switch';

function daysAgoKey(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return localDate(d);
}

function Badge({ children }: { children: string }) {
  return (
    <View className="bg-background border border-border rounded-full px-2 py-0.5">
      <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">{children}</Text>
    </View>
  );
}

function DashCard({
  title,
  badge,
  className = '',
  onOpen,
  children,
}: {
  title: string;
  badge?: string;
  className?: string;
  onOpen?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className={`p-4 gap-3 grow min-h-[148px] ${className}`}>
      <View className="flex-row flex-wrap items-center justify-between gap-1">
        {onOpen ? <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Open ${title} history`}
          className="flex-row items-center gap-1 min-h-[44px] shrink">
          <Text className="text-white font-bold shrink">{title}</Text>
          <Ionicons name="chevron-forward" size={12} color="#9CA3AF" />
        </Pressable> : <Text className="text-white font-bold shrink">{title}</Text>}
        {badge && <Badge>{badge}</Badge>}
      </View>
      <View className="flex-1 justify-end gap-3">{children}</View>
    </Card>
  );
}

function QuickLogWeight({
  logToday,
  unit,
  onDone,
}: {
  logToday: (weight: number, note?: string, unit?: WeightDisplayUnit) => Promise<{ ok: boolean; error?: string }>;
  unit: 'lbs' | 'kg';
  onDone: () => void;
}) {
  const [value, setValue] = useState('');
  const action = useAsyncAction();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => action.run(async () => {
    setError(null);
    const entered = parseBodyweightNumber(value);
    const lbs = unit === 'kg' ? kgToLbs(entered) : entered;
    if (!isValidBodyweightLbs(lbs)) {
      setError('Enter a realistic bodyweight.');
      return;
    }
    setError(null);
    const result = await logToday(entered, undefined, unit);
    if (result.ok) {
      onDone();
    } else {
      setError(result.error ?? 'Could not log that entry.');
    }
  });

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder={unit}
          placeholderTextColor="#6B7280"
          keyboardType="decimal-pad"
          autoFocus
          className="flex-1 h-9 bg-background border border-border rounded-lg px-2 text-center text-white text-sm"
        />
        <Text className="text-xs text-gray-500">{unit}</Text>
      </View>
      {(error || action.error) && <Text className="text-[11px] text-red-400">{error ?? action.error}</Text>}
      <View className="flex-row gap-2">
        <Pressable onPress={onDone} className="flex-1 h-11 items-center justify-center">
          <Text className="text-gray-500 text-xs font-medium">Cancel</Text>
        </Pressable>
        <View className="flex-1 min-w-0"><Button size="sm" fullWidth onPress={() => void handleSubmit()} loading={action.pending} disabled={!value.trim()}>
          Save
        </Button></View>
      </View>
    </View>
  );
}

// Backed by steps_logs (docs/migrations-drafts/011_steps_tracking.sql) via
// useStepsLogs — falls back to session-only if that migration isn't applied
// yet (isSupported: false), same degrade-gracefully pattern as programs.
function QuickLogSteps({
  onSave,
  onDone,
}: {
  onSave: (steps: number) => Promise<{ ok: boolean; error?: string }>;
  onDone: () => void;
}) {
  const [value, setValue] = useState('');
  const action = useAsyncAction();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => action.run(async () => {
    const steps = Number(value);
    if (!value.trim() || !isValidSteps(steps)) {
      setError('Enter a realistic step count.');
      return;
    }
    setError(null);
    const result = await onSave(steps);
    if (result.ok) onDone();
    else setError(result.error ?? 'Could not log that entry.');
  });

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder="steps"
          placeholderTextColor="#6B7280"
          keyboardType="number-pad"
          autoFocus
          className="flex-1 h-9 bg-background border border-border rounded-lg px-2 text-center text-white text-sm"
        />
        <Text className="text-xs text-gray-500">steps</Text>
      </View>
      {(error || action.error) && <Text className="text-[11px] text-red-400">{error ?? action.error}</Text>}
      <View className="flex-row gap-2">
        <Pressable onPress={onDone} className="flex-1 h-11 items-center justify-center">
          <Text className="text-gray-500 text-xs font-medium">Cancel</Text>
        </Pressable>
        <View className="flex-1 min-w-0"><Button size="sm" fullWidth onPress={() => void handleSubmit()} loading={action.pending} disabled={!value.trim()}>
          Save
        </Button></View>
      </View>
    </View>
  );
}

const WATER_SERVING_ML = 250; // one "cup" — Tracked's countable serving unit

function QuickLogWater({
  todayMl,
  onAdd,
  onDone,
}: {
  todayMl: number | null;
  onAdd: (amountMl: number) => Promise<{ ok: boolean; error?: string }>;
  onDone: () => void;
}) {
  const action = useAsyncAction();
  const addServing = () => action.run(async () => {
    const result = await onAdd((todayMl ?? 0) + WATER_SERVING_ML);
    if (!result.ok) throw new Error(result.error ?? 'Could not save water.');
  });

  return (
    <View className="gap-2">
      <Pressable
        onPress={() => void addServing()}
        disabled={action.pending}
        className="h-9 rounded-lg bg-background border border-border items-center justify-center flex-row gap-1.5"
      >
        <Ionicons name="water-outline" size={14} color="#4ADE80" />
        <Text className="text-white text-xs font-medium">+{WATER_SERVING_ML} mL cup</Text>
      </Pressable>
      {action.error && <Text className="text-xs text-red-400">{action.error}</Text>}
      <Pressable onPress={onDone} className="h-8 items-center justify-center">
        <Text className="text-gray-500 text-xs font-medium">Done</Text>
      </Pressable>
    </View>
  );
}

export default function Dashboard({ userId }: { userId: string }) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const date = localDate(selectedDate);
  return <View className="flex-1">
    <DateNavigator date={selectedDate} onChange={setSelectedDate} />
    {date === localDate() ? <TodayDashboard userId={userId} /> : <DayHistory key={`${userId}:${date}`} userId={userId} date={date} />}
  </View>;
}

function TodayDashboard({ userId }: { userId: string }) {
  const { layout, loaded: layoutLoaded, error: layoutError, update: updateLayout } = useDashboardLayout(userId);
  const [customizing, setCustomizing] = useState(false);
  const layoutAction = useAsyncAction();
  const today = new Date();
  const workout = useAssignedWorkout(userId);
  const { templateName, templateId, status, error: workoutError, retry: retryWorkout } = workout;
  useFocusEffect(useCallback(() => { retryWorkout(); }, [retryWorkout]));
  const { entries: bwEntries, logToday } = useBodyweightLogs(userId, 14);
  const { unit: weightUnit } = useUnitPreference();
  const { entries: nutritionEntries } = useNutritionLogs(userId, 50, daysAgoKey(0));
  const { logs: sleepLogs, logSleep } = useSleepLogs(userId, daysAgoKey(7));
  const { todayMl: waterMl, logToday: logWater, error: waterError, isLoading: waterLoading } = useWaterLogs(userId);
  const { entries: stepsEntries, logToday: logSteps } = useStepsLogs(userId, 7);
  const [loggingWeight, setLoggingWeight] = useState(false);
  const [loggingSteps, setLoggingSteps] = useState(false);
  const [loggingWater, setLoggingWater] = useState(false);
  const [sleepSheetOpen, setSleepSheetOpen] = useState(false);
  const lastSleep = lastNight(sleepLogs);

  const trend = latestTrend(bwEntries);
  const macros = sumTodayMacros(nutritionEntries, today);
  const todayStepsEntry = stepsEntries.find((e) => e.recorded_date === daysAgoKey(0));
  const dateLabel = today.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <ScrollView className="flex-1" contentContainerClassName="px-4 py-4 gap-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-bold text-white">{dateLabel}</Text>
      </View>


      {layout.training && <DashCard title="Training" badge={status === 'unassigned' ? 'Waiting for your coach' : status === 'cached' ? 'Saved on device' : undefined}>
        {status === 'loading' ? <Text className="text-gray-400">Checking your workout…</Text> : status === 'unavailable' ? <>
          <Text className="text-gray-400">{workoutError ?? 'Workout unavailable.'}</Text>
          <Button fullWidth variant="secondary" onPress={retryWorkout}>Retry workout</Button>
        </> : status === 'unassigned' ? <>
          <Text className="text-gray-400 mb-3">Your account is linked. Your coach has not assigned a workout yet. Check again after they assign it.</Text>
          <Button fullWidth variant="secondary" onPress={retryWorkout}>Check for assignment</Button>
        </> : <Button fullWidth onPress={() => router.push({ pathname: '/(tabs)/session', params: { templateId: templateId! } })}>
          {templateName ?? 'Open workout'}
        </Button>}
      </DashCard>}

      {layout.nutrition && <View className="flex-row items-stretch gap-3">
        <Pressable className="flex-1 min-w-0" onPress={() => router.push('/(tabs)/nutrition')}>
          <DashCard title="Calories" badge={macros.hasAny ? undefined : 'No intake yet'}>
            <Text className="text-white text-2xl font-bold">
              {macros.calories} <Text className="text-sm text-gray-500 font-normal">kcal</Text>
            </Text>
          </DashCard>
        </Pressable>
        <Pressable className="flex-1 min-w-0" onPress={() => router.push('/(tabs)/nutrition')}>
          <DashCard title="Macros">
            {macros.hasAny ? (
              <Text className="text-xs text-gray-400">
                {macros.protein_g}g P · {macros.carbs_g}g C · {macros.fat_g}g F
              </Text>
            ) : (
              <View className="items-center gap-1.5 py-2">
                <Ionicons name="restaurant-outline" size={20} color="#6B7280" />
                <Text className="text-xs text-gray-500 text-center">Log food to see your macros</Text>
              </View>
            )}
          </DashCard>
        </Pressable>
      </View>}

      {layout.weightSteps && <View className="flex-row items-stretch gap-3">
        <View
          className="flex-1 min-w-0"
        >
          <DashCard title="Bodyweight" badge={bwEntries.length > 0 ? undefined : 'No log'} onOpen={() => router.push('/bodyweight/history')}>
            {bwEntries.length > 0 && !loggingWeight ? (
              <Text className="text-white text-lg font-bold">
                {formatWeightKg(bwEntries[0].weight_kg, weightUnit).value.toFixed(1)}{' '}
                <Text className="text-xs text-gray-500 font-normal">{weightUnit}</Text>
              </Text>
            ) : null}
            {loggingWeight ? (
              <QuickLogWeight logToday={logToday} unit={weightUnit} onDone={() => setLoggingWeight(false)} />
            ) : (
              <Button size="sm" variant="secondary" fullWidth onPress={() => setLoggingWeight(true)}>
                Log Weight
              </Button>
            )}
          </DashCard>
        </View>
        <DashCard title="Steps" badge={todayStepsEntry === undefined ? 'No log' : 'Today'} className="flex-1 min-w-0">
          {todayStepsEntry !== undefined && !loggingSteps ? (
            <Text className="text-white text-lg font-bold">
              {todayStepsEntry.steps.toLocaleString()} <Text className="text-xs text-gray-500 font-normal">steps</Text>
            </Text>
          ) : null}
          {loggingSteps ? (
            <QuickLogSteps onSave={logSteps} onDone={() => setLoggingSteps(false)} />
          ) : (
            <Button size="sm" variant="secondary" fullWidth onPress={() => setLoggingSteps(true)}>
              Log Steps
            </Button>
          )}
        </DashCard>
      </View>}

      {layout.cardioSleep && <View className="flex-row items-stretch gap-3">
        <Pressable className="flex-1 min-w-0" onPress={() => router.push('/cardio')}>
          <DashCard title="Cardio">
            <Text className="text-xs text-gray-500">Pick a cardio exercise to start tracking.</Text>
          </DashCard>
        </Pressable>
        <View className="flex-1 min-w-0">
          <DashCard title="Sleep" badge={lastSleep ? undefined : 'No log'} onOpen={() => router.push('/sleep')}>
            {lastSleep ? (
              <>
                <Text className="text-white text-lg font-bold">
                  {formatHours(durationHours(lastSleep))}
                </Text>
                <Text className="text-xs text-gray-500">Quality {lastSleep.quality}/5</Text>
              </>
            ) : (
              <Text className="text-xs text-gray-500">No data</Text>
            )}
            <Button size="sm" variant="secondary" fullWidth onPress={() => setSleepSheetOpen(true)}>
              Log Sleep
            </Button>
          </DashCard>
        </View>
      </View>}

      {layout.water && <View className="flex-row gap-3">
        <DashCard title="Water" badge={waterMl == null ? 'No log' : 'Today'} className="flex-1">
          {waterError && <Text className="text-xs text-red-400">{waterError}</Text>}
          {waterMl != null && !loggingWater ? (
            <Text className="text-white text-lg font-bold">
              {(waterMl / 1000).toFixed(2)} <Text className="text-xs text-gray-500 font-normal">L</Text>
            </Text>
          ) : null}
          {loggingWater ? (
            <QuickLogWater
              todayMl={waterMl}
              onAdd={logWater}
              onDone={() => setLoggingWater(false)}
            />
          ) : (
            <Button size="sm" variant="secondary" fullWidth disabled={waterLoading || !!waterError} onPress={() => setLoggingWater(true)}>
              Log Water
            </Button>
          )}
        </DashCard>
      </View>}

      <LogSleepSheet
        visible={sleepSheetOpen}
        onClose={() => setSleepSheetOpen(false)}
        onSave={(bedtime, wakeTime, quality) =>
          logSleep(
            localDate(wakeTime),
            bedtime.toISOString(),
            wakeTime.toISOString(),
            quality,
          )
        }
      />

      {layout.physique && <DashCard title="Physique">
        <Pressable
          onPress={() => router.push('/progress-photos')}
          className="w-16 h-16 rounded-2xl bg-background border border-border items-center justify-center self-center"
        >
          <Ionicons name="camera-outline" size={22} color="#6B7280" />
        </Pressable>
      </DashCard>}

      <Pressable
        onPress={() => setCustomizing(true)}
        className="flex-row items-center justify-between bg-surface border border-border rounded-2xl px-4 py-3.5"
      >
        <View className="flex-row items-center gap-2">
          <Ionicons name="grid-outline" size={16} color="#9CA3AF" />
          <Text className="text-gray-400 font-semibold">Customize dashboard</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      </Pressable>
      <Modal visible={customizing} transparent animationType="fade" onRequestClose={() => setCustomizing(false)}>
        <View className="flex-1 bg-black/70 justify-center px-4">
          <View className="bg-surface rounded-2xl p-5 gap-4 max-h-[85%]">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg text-white font-bold">Dashboard layout</Text>
              <Pressable accessibilityLabel="Close dashboard settings" onPress={() => setCustomizing(false)} className="w-11 h-11 items-center justify-center">
                <Ionicons name="close" size={22} color="#fff" />
              </Pressable>
            </View>
            <ScrollView>
              {dashboardGroups.map(({ key, label }) => <View key={key} className="flex-row items-center justify-between min-h-[52px] gap-3">
                <Text className="text-white flex-1">{label}</Text>
                <Switch value={layout[key]} disabled={!layoutLoaded || layoutAction.pending}
                  onValueChange={(value) => void layoutAction.run(() => updateLayout({ ...layout, [key]: value }))} />
              </View>)}
            </ScrollView>
            {(layoutError || layoutAction.error) && <Text className="text-red-400">{layoutAction.error ?? layoutError}</Text>}
            <Button variant="secondary" disabled={!layoutLoaded} loading={layoutAction.pending}
              onPress={() => void layoutAction.run(() => updateLayout({ ...defaultDashboardLayout }))}>Restore defaults</Button>
          </View>
        </View>
      </Modal>

      {trend.direction === 'up' || trend.direction === 'down' ? (
        <Text className="text-xs text-gray-500 text-center">
          Bodyweight {trend.direction === 'up' ? 'up' : 'down'}{' '}
          {formatWeightKg(Math.abs(trend.deltaKg ?? 0), weightUnit).value} {weightUnit} since your last entry
        </Text>
      ) : null}
    </ScrollView>
  );
}
