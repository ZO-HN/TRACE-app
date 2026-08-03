import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBodyweightLogs } from '../hooks/useBodyweightLogs';
import { isValidBodyweightLbs } from '../lib/bodyweight/mapBodyweight';
import { latestTrend } from '../lib/bodyweight/trend';
import Button from './ui/Button';
import Card from './ui/Card';
import FadeInView from './ui/FadeInView';
import Skeleton from './ui/Skeleton';

const TREND_STYLE: Record<ReturnType<typeof latestTrend>['direction'], string> = {
  up: 'text-red-400',
  down: 'text-green-400',
  flat: 'text-gray-400',
  unknown: 'text-gray-500',
};

const TREND_ICON: Record<ReturnType<typeof latestTrend>['direction'], keyof typeof Ionicons.glyphMap> = {
  up: 'trending-up',
  down: 'trending-down',
  flat: 'remove',
  unknown: 'remove',
};

export default function BodyweightLogger({ userId }: { userId: string }) {
  const { entries, isLoading, error, logToday } = useBodyweightLogs(userId);
  const [weight, setWeight] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const trend = latestTrend(entries);

  const handleLog = async () => {
    const lbs = parseFloat(weight);
    if (!isValidBodyweightLbs(lbs)) {
      setFormError('Enter a realistic bodyweight in lbs.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    const result = await logToday(lbs);
    setSubmitting(false);
    if (result.ok) {
      setWeight('');
    } else {
      setFormError(result.error ?? 'Could not log that entry.');
    }
  };

  return (
    <View className="gap-4">
      <Card className="p-4">
        <View className="flex-row items-center gap-2 mb-3">
          <Ionicons name="body-outline" size={16} color="#3B82F6" />
          <Text className="text-sm font-semibold text-white">Log today's weight</Text>
        </View>
        <View className="flex-row gap-2">
          <TextInput
            value={weight}
            onChangeText={setWeight}
            placeholder="lbs"
            placeholderTextColor="#6B7280"
            keyboardType="decimal-pad"
            className="flex-1 h-11 bg-background border border-border rounded-xl px-3 text-center text-white font-medium"
          />
          <Button onPress={() => void handleLog()} loading={submitting} disabled={weight.trim().length === 0}>
            Log
          </Button>
        </View>
        {formError && (
          <View className="flex-row items-center gap-1.5 mt-2">
            <Ionicons name="alert-circle-outline" size={13} color="#F87171" />
            <Text className="text-xs text-red-400">{formError}</Text>
          </View>
        )}
        {trend.direction !== 'unknown' && (
          <View className="flex-row items-center gap-1.5 mt-2">
            <Ionicons
              name={TREND_ICON[trend.direction]}
              size={13}
              color={
                trend.direction === 'up' ? '#F87171' : trend.direction === 'down' ? '#4ADE80' : '#9CA3AF'
              }
            />
            <Text className={`text-xs ${TREND_STYLE[trend.direction]}`}>
              {trend.direction === 'flat'
                ? 'No change since last entry'
                : `${Math.abs(trend.deltaKg ?? 0)} kg ${trend.direction === 'up' ? 'up' : 'down'} since last entry`}
            </Text>
          </View>
        )}
      </Card>

      {isLoading ? (
        <View className="gap-2">
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </View>
      ) : error ? (
        <Text className="text-sm text-red-400 px-2">Could not load entries: {error}</Text>
      ) : entries.length === 0 ? (
        <View className="items-center py-6 gap-2">
          <Ionicons name="body-outline" size={26} color="#6B7280" />
          <Text className="text-sm text-gray-500">No entries logged yet.</Text>
        </View>
      ) : (
        <View className="gap-2">
          <Text className="text-sm font-semibold text-gray-400 uppercase tracking-wider px-2">
            History
          </Text>
          {entries.map((e, i) => (
            <FadeInView key={e.id} delay={i * 40}>
              <Card className="flex-row items-center justify-between px-3 py-2.5">
                <Text className="text-sm text-gray-300">{e.recorded_date}</Text>
                <Text className="text-sm font-medium text-white">{e.weight_kg} kg</Text>
              </Card>
            </FadeInView>
          ))}
        </View>
      )}
    </View>
  );
}
