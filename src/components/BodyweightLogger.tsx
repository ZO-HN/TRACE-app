import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useBodyweightLogs } from '../hooks/useBodyweightLogs';
import { isValidBodyweightLbs } from '../lib/bodyweight/mapBodyweight';
import { latestTrend } from '../lib/bodyweight/trend';

const TREND_STYLE: Record<ReturnType<typeof latestTrend>['direction'], string> = {
  up: 'text-red-400',
  down: 'text-green-400',
  flat: 'text-gray-400',
  unknown: 'text-gray-500',
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
      <View className="bg-surface border border-border rounded-xl p-4">
        <Text className="text-sm font-semibold text-white mb-2">Log today's weight</Text>
        <View className="flex-row gap-2">
          <TextInput
            value={weight}
            onChangeText={setWeight}
            placeholder="lbs"
            placeholderTextColor="#6B7280"
            keyboardType="decimal-pad"
            className="flex-1 h-11 bg-background border border-border rounded-lg px-3 text-center text-white font-medium"
          />
          <Pressable
            onPress={() => void handleLog()}
            disabled={submitting || weight.trim().length === 0}
            className="h-11 px-5 bg-primary rounded-lg items-center justify-center disabled:opacity-50"
          >
            <Text className="text-white font-semibold">{submitting ? '…' : 'Log'}</Text>
          </Pressable>
        </View>
        {formError && <Text className="text-xs text-red-400 mt-2">{formError}</Text>}
        {trend.direction !== 'unknown' && (
          <Text className={`text-xs mt-2 ${TREND_STYLE[trend.direction]}`}>
            {trend.direction === 'flat'
              ? 'No change since last entry'
              : `${trend.direction === 'up' ? '▲' : '▼'} ${Math.abs(trend.deltaKg ?? 0)} kg since last entry`}
          </Text>
        )}
      </View>

      {isLoading ? null : error ? (
        <Text className="text-sm text-red-400 px-2">Could not load entries: {error}</Text>
      ) : entries.length === 0 ? (
        <Text className="text-sm text-gray-500 px-2">No entries logged yet.</Text>
      ) : (
        <View className="gap-2">
          <Text className="text-sm font-semibold text-gray-400 uppercase tracking-wider px-2">
            History
          </Text>
          {entries.map((e) => (
            <View
              key={e.id}
              className="flex-row items-center justify-between bg-surface border border-border rounded-lg px-3 py-2.5"
            >
              <Text className="text-sm text-gray-300">{e.recorded_date}</Text>
              <Text className="text-sm font-medium text-white">{e.weight_kg} kg</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
