import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAssignedWorkout } from '../hooks/useAssignedWorkout';
import { useBodyweightLogs } from '../hooks/useBodyweightLogs';
import { useNutritionLogs } from '../hooks/useNutritionLogs';
import { buildDateStrip } from '../lib/dashboard/today';
import { sumTodayMacros } from '../lib/dashboard/today';
import { latestTrend } from '../lib/bodyweight/trend';
import { isValidBodyweightLbs } from '../lib/bodyweight/mapBodyweight';
import { kgToLbs } from '../lib/units';
import Card from './ui/Card';
import Button from './ui/Button';

// This app has no unit-preference setting anywhere yet (Bodyweight Settings
// only has moving-average window + reminders) — every other bodyweight
// entry point (BodyweightLogger, the history table) already defaults to
// lbs, so the inline quick-log below matches that rather than inventing a
// unit toggle that doesn't exist in Settings.
const WEIGHT_UNIT = 'lbs';

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
  children,
}: {
  title: string;
  badge?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={`p-4 gap-3 ${className}`}>
      <View className="flex-row items-center justify-between">
        <Text className="text-white font-bold">{title}</Text>
        {badge && <Badge>{badge}</Badge>}
      </View>
      {children}
    </Card>
  );
}

function comingSoon(feature: string) {
  Alert.alert('Coming soon', `${feature} isn't available yet.`);
}

function QuickLogWeight({
  logToday,
  onDone,
}: {
  logToday: (weightLbs: number, note?: string) => Promise<{ ok: boolean; error?: string }>;
  onDone: () => void;
}) {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const lbs = parseFloat(value);
    if (!isValidBodyweightLbs(lbs)) {
      setError('Enter a realistic bodyweight.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await logToday(lbs);
    setSubmitting(false);
    if (result.ok) {
      onDone();
    } else {
      setError(result.error ?? 'Could not log that entry.');
    }
  };

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder={WEIGHT_UNIT}
          placeholderTextColor="#6B7280"
          keyboardType="decimal-pad"
          autoFocus
          className="flex-1 h-9 bg-background border border-border rounded-lg px-2 text-center text-white text-sm"
        />
        <Text className="text-xs text-gray-500">{WEIGHT_UNIT}</Text>
      </View>
      {error && <Text className="text-[11px] text-red-400">{error}</Text>}
      <View className="flex-row gap-2">
        <Pressable onPress={onDone} className="flex-1 h-9 items-center justify-center">
          <Text className="text-gray-500 text-xs font-medium">Cancel</Text>
        </Pressable>
        <Button size="sm" fullWidth onPress={() => void handleSubmit()} loading={submitting} disabled={!value.trim()}>
          Save
        </Button>
      </View>
    </View>
  );
}

// No steps table/hook exists in this app at all (unlike bodyweight, which
// has a real bodyweight_logs table) — this is session-local only, same
// "documented, not silently fake" caveat as the Nutrition tab's extra meal
// slots. Persisting it for real needs either a manual step-count table or
// an actual Health Connect/HealthKit integration (the latter is exactly
// what's already stubbed as "Coming soon" in Bodyweight Settings).
function QuickLogSteps({ onSave, onDone }: { onSave: (steps: number) => void; onDone: () => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const steps = parseInt(value, 10);
    if (!Number.isFinite(steps) || steps < 0 || steps > 200_000) {
      setError('Enter a realistic step count.');
      return;
    }
    onSave(steps);
    onDone();
  };

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
      {error && <Text className="text-[11px] text-red-400">{error}</Text>}
      <View className="flex-row gap-2">
        <Pressable onPress={onDone} className="flex-1 h-9 items-center justify-center">
          <Text className="text-gray-500 text-xs font-medium">Cancel</Text>
        </Pressable>
        <Button size="sm" fullWidth onPress={handleSubmit} disabled={!value.trim()}>
          Save
        </Button>
      </View>
    </View>
  );
}

export default function Dashboard({ userId }: { userId: string }) {
  const today = new Date();
  const dateStrip = buildDateStrip(today);
  const { templateName, exercises } = useAssignedWorkout(userId);
  const { entries: bwEntries, logToday } = useBodyweightLogs(userId, 14);
  const { entries: nutritionEntries } = useNutritionLogs(userId, 50);
  const [loggingWeight, setLoggingWeight] = useState(false);
  const [loggingSteps, setLoggingSteps] = useState(false);
  const [todaySteps, setTodaySteps] = useState<number | null>(null);

  const trend = latestTrend(bwEntries);
  const macros = sumTodayMacros(nutritionEntries, today);
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

      <DashCard title="Training" badge={templateName ? undefined : 'No program'}>
        <Button fullWidth onPress={() => router.push('/(tabs)/session')}>
          {templateName ?? (exercises ? 'Continue Workout' : 'Select Workout')}
        </Button>
      </DashCard>

      <View className="flex-row gap-3">
        <Pressable className="flex-1" onPress={() => router.push('/(tabs)/nutrition')}>
          <DashCard title="Calories" badge={macros.hasAny ? undefined : 'No goal'}>
            <Text className="text-white text-2xl font-bold">
              {macros.calories} <Text className="text-sm text-gray-500 font-normal">kcal</Text>
            </Text>
          </DashCard>
        </Pressable>
        <Pressable className="flex-1" onPress={() => router.push('/(tabs)/nutrition')}>
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
      </View>

      <View className="flex-row gap-3">
        <DashCard title="Bodyweight" badge={bwEntries.length > 0 ? undefined : 'No log'} className="flex-1">
          {bwEntries.length > 0 && !loggingWeight ? (
            <Text className="text-white text-lg font-bold">
              {kgToLbs(bwEntries[0].weight_kg).toFixed(1)}{' '}
              <Text className="text-xs text-gray-500 font-normal">{WEIGHT_UNIT}</Text>
            </Text>
          ) : null}
          {loggingWeight ? (
            <QuickLogWeight logToday={logToday} onDone={() => setLoggingWeight(false)} />
          ) : (
            <Button size="sm" variant="secondary" fullWidth onPress={() => setLoggingWeight(true)}>
              Log Weight
            </Button>
          )}
        </DashCard>
        <DashCard title="Steps" badge={todaySteps === null ? 'No log' : 'Today'} className="flex-1">
          {todaySteps !== null && !loggingSteps ? (
            <Text className="text-white text-lg font-bold">
              {todaySteps.toLocaleString()} <Text className="text-xs text-gray-500 font-normal">steps</Text>
            </Text>
          ) : null}
          {loggingSteps ? (
            <QuickLogSteps onSave={setTodaySteps} onDone={() => setLoggingSteps(false)} />
          ) : (
            <Button size="sm" variant="secondary" fullWidth onPress={() => setLoggingSteps(true)}>
              Log Steps
            </Button>
          )}
        </DashCard>
      </View>

      <View className="flex-row gap-3">
        <Pressable className="flex-1" onPress={() => router.push('/(tabs)/progress')}>
          <DashCard title="Cardio">
            <Text className="text-xs text-gray-500">Pick a cardio exercise to start tracking.</Text>
          </DashCard>
        </Pressable>
        <Pressable className="flex-1" onPress={() => router.push('/(tabs)/progress')}>
          <DashCard title="Sleep" badge="No log">
            <Text className="text-xs text-gray-500">No data</Text>
          </DashCard>
        </Pressable>
      </View>

      <DashCard title="Physique">
        <Pressable
          onPress={() => comingSoon('Progress photos')}
          className="w-16 h-16 rounded-2xl bg-background border border-border items-center justify-center self-center"
        >
          <Ionicons name="camera-outline" size={22} color="#6B7280" />
        </Pressable>
      </DashCard>

      <Pressable
        onPress={() => comingSoon('Dashboard customization')}
        className="flex-row items-center justify-between bg-surface border border-border rounded-2xl px-4 py-3.5"
      >
        <View className="flex-row items-center gap-2">
          <Ionicons name="grid-outline" size={16} color="#9CA3AF" />
          <Text className="text-gray-400 font-semibold">Customize dashboard</Text>
        </View>
        <Badge>Pro</Badge>
      </Pressable>

      {trend.direction === 'up' || trend.direction === 'down' ? (
        <Text className="text-xs text-gray-500 text-center">
          Bodyweight {trend.direction === 'up' ? 'up' : 'down'} {Math.abs(trend.deltaKg ?? 0)} kg
          since your last entry
        </Text>
      ) : null}
    </ScrollView>
  );
}
