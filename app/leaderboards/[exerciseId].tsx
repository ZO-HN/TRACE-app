import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTraceUserContext } from '../../src/context/TraceUserContext';
import { useExerciseCatalog } from '../../src/hooks/useExerciseCatalog';
import { useLeaderboard } from '../../src/hooks/useLeaderboard';
import Card from '../../src/components/ui/Card';

const RANK_ICON: { icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { icon: 'trophy', color: '#FBBF24' },
  { icon: 'medal', color: '#D1D5DB' },
  { icon: 'ribbon', color: '#D97706' },
];

export default function ExerciseLeaderboardScreen() {
  const { profile } = useTraceUserContext();
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const { rows } = useExerciseCatalog();
  const { entries, isLoading, isAvailable } = useLeaderboard(profile!.id, exerciseId ?? null);

  const exerciseName = rows.find((r) => r.id === exerciseId)?.name ?? 'Leaderboard';

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-lg font-bold text-white">{exerciseName} Leaderboard</Text>
          <Text className="text-xs text-gray-500">Top performers this month</Text>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Loading…</Text>
        </View>
      ) : !isAvailable ? (
        <View className="flex-1 items-center justify-center px-6 gap-2">
          <Ionicons name="trophy-outline" size={32} color="#6B7280" />
          <Text className="text-white font-semibold text-center">Leaderboards aren't live yet</Text>
          <Text className="text-sm text-gray-500 text-center">
            This feature needs a backend update that hasn't been applied yet. Check back soon.
          </Text>
        </View>
      ) : entries.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6 gap-2">
          <Ionicons name="people-outline" size={32} color="#6B7280" />
          <Text className="text-white font-semibold text-center">No entries yet</Text>
          <Text className="text-sm text-gray-500 text-center">
            Log a set for this exercise, or follow friends, to populate the board.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerClassName="px-4 py-4 gap-2">
          {entries.map((entry, i) => {
            const rank = RANK_ICON[i];
            return (
              <Card
                key={entry.userId}
                className={`flex-row items-center gap-3 px-4 py-3 ${entry.isSelf ? 'border-l-4 border-l-primary' : ''}`}
              >
                <View className="w-8 items-center">
                  {rank ? (
                    <Ionicons name={rank.icon} size={20} color={rank.color} />
                  ) : (
                    <Text className="text-gray-500 font-bold">{i + 1}</Text>
                  )}
                </View>
                <View className="flex-1">
                  <Text className={`font-semibold ${entry.isSelf ? 'text-primary' : 'text-white'}`}>
                    {entry.displayName}
                    {entry.isSelf ? ' (You)' : ''}
                  </Text>
                  <View className="flex-row items-center gap-2 mt-0.5">
                    <Ionicons name="barbell-outline" size={12} color="#9CA3AF" />
                    <Text className="text-gray-400 text-xs">
                      {entry.weightLbs} lbs × {entry.reps}
                      {entry.rpe != null ? ` · RPE ${entry.rpe}` : ''}
                    </Text>
                  </View>
                  <Text className="text-gray-500 text-xs mt-0.5">
                    Volume: {entry.volume} · Sets: {entry.sets}
                  </Text>
                </View>
              </Card>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
