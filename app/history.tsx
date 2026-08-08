import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTraceUserContext } from '../src/context/TraceUserContext';
import { useSessionSummaries } from '../src/hooks/useSessionSummaries';
import { formatDuration, formatSessionDate } from '../src/lib/workout/summary';
import Card from '../src/components/ui/Card';
import Button from '../src/components/ui/Button';
import FadeInView from '../src/components/ui/FadeInView';
import Skeleton from '../src/components/ui/Skeleton';
import ScreenHeader from '../src/components/ui/ScreenHeader';

function GenerateWithAIButton() {
  return (
    <LinearGradient
      colors={['#4ADE80', '#3B82F6', '#F87171']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      className="rounded-xl p-[1.5px]"
    >
      <Pressable
        onPress={() => router.push('/(tabs)/stats')}
        className="h-14 rounded-[10px] bg-background items-center justify-center"
      >
        <Text className="text-white font-semibold">Generate with AI</Text>
      </Pressable>
    </LinearGradient>
  );
}

export default function HistoryScreen() {
  const { profile } = useTraceUserContext();
  const { sessions, isLoading } = useSessionSummaries(profile!.id);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader
        title="History"
        right={
          <Pressable onPress={() => Alert.alert('Coming soon', 'Filtering session history is not available yet.')}>
            <Ionicons name="filter-outline" size={20} color="#E5E7EB" />
          </Pressable>
        }
      />

      {isLoading ? (
        <View className="p-4 gap-2">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </View>
      ) : sessions.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6 gap-4">
          <View className="w-20 h-20 rounded-full bg-surface items-center justify-center">
            <Ionicons name="calendar-outline" size={32} color="#6B7280" />
          </View>
          <View className="items-center gap-2">
            <Text className="text-2xl font-bold text-white">Session History</Text>
            <Text className="text-sm text-gray-400 text-center">
              Sessions are workouts that you've added to your calendar. Schedule a workout to your
              calendar to start tracking.
            </Text>
          </View>

          <View className="w-full gap-3 mt-2">
            <Button fullWidth size="lg" onPress={() => router.push('/workouts')}>
              Create Workout
            </Button>
            <View className="flex-row items-center gap-3">
              <View className="flex-1 h-px bg-border" />
              <Text className="text-xs text-gray-500 font-bold">OR</Text>
              <View className="flex-1 h-px bg-border" />
            </View>
            <GenerateWithAIButton />
          </View>
        </View>
      ) : (
        <ScrollView contentContainerClassName="p-4 gap-2">
          {sessions.map((s, i) => (
            <FadeInView key={s.id} delay={i * 40}>
              <Card className="flex-row items-center justify-between px-4 py-3">
                <View>
                  <Text className="text-sm font-medium text-white">{s.session_name}</Text>
                  <Text className="text-xs text-gray-500">{formatSessionDate(s.completed_at)}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-sm text-gray-300">{formatDuration(s.duration_seconds)}</Text>
                  {s.rpe_average != null && (
                    <Text className="text-xs text-gray-500">avg RPE {s.rpe_average}</Text>
                  )}
                </View>
              </Card>
            </FadeInView>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
