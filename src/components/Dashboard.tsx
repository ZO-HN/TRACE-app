import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAssignedWorkout } from '../hooks/useAssignedWorkout';
import { useBodyweightLogs } from '../hooks/useBodyweightLogs';
import { useNutritionLogs } from '../hooks/useNutritionLogs';
import { buildDateStrip } from '../lib/dashboard/today';
import { sumTodayMacros } from '../lib/dashboard/today';
import { latestTrend } from '../lib/bodyweight/trend';
import { kgToLbs } from '../lib/units';
import Card from './ui/Card';
import Button from './ui/Button';

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

export default function Dashboard({ userId }: { userId: string }) {
  const today = new Date();
  const dateStrip = buildDateStrip(today);
  const { templateName, exercises } = useAssignedWorkout(userId);
  const { entries: bwEntries } = useBodyweightLogs(userId, 14);
  const { entries: nutritionEntries } = useNutritionLogs(userId, 50);

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
        <DashCard title="Calories" badge={macros.hasAny ? undefined : 'No goal'} className="flex-1">
          <Text className="text-white text-2xl font-bold">
            {macros.calories} <Text className="text-sm text-gray-500 font-normal">kcal</Text>
          </Text>
        </DashCard>
        <DashCard title="Macros" className="flex-1">
          {macros.hasAny ? (
            <Text className="text-xs text-gray-400">
              {macros.protein_g}g P · {macros.carbs_g}g C · {macros.fat_g}g F
            </Text>
          ) : (
            <Pressable
              onPress={() => router.push('/(tabs)/nutrition')}
              className="items-center gap-1.5 py-2"
            >
              <Ionicons name="restaurant-outline" size={20} color="#6B7280" />
              <Text className="text-xs text-gray-500 text-center">Log food to see your macros</Text>
            </Pressable>
          )}
        </DashCard>
      </View>

      <View className="flex-row gap-3">
        <DashCard title="Bodyweight" badge={bwEntries.length > 0 ? undefined : 'No log'} className="flex-1">
          {bwEntries.length > 0 ? (
            <Text className="text-white text-lg font-bold">
              {kgToLbs(bwEntries[0].weight_kg).toFixed(1)}{' '}
              <Text className="text-xs text-gray-500 font-normal">lbs</Text>
            </Text>
          ) : null}
          <Button size="sm" variant="secondary" fullWidth onPress={() => router.push('/(tabs)/progress')}>
            Log Weight
          </Button>
        </DashCard>
        <DashCard title="Steps" badge="Today" className="flex-1">
          <Button size="sm" variant="secondary" fullWidth onPress={() => comingSoon('Step tracking')}>
            Connect Steps
          </Button>
        </DashCard>
      </View>

      <View className="flex-row gap-3">
        <DashCard title="Cardio" className="flex-1">
          <Pressable onPress={() => comingSoon('Cardio tracking')} className="py-2">
            <Text className="text-xs text-gray-500">Pick a cardio exercise to start tracking.</Text>
          </Pressable>
        </DashCard>
        <DashCard title="Sleep" badge="No log" className="flex-1">
          <Text className="text-xs text-gray-500">No data</Text>
          <Button size="sm" variant="secondary" fullWidth onPress={() => comingSoon('Sleep tracking')}>
            Log Sleep
          </Button>
        </DashCard>
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
