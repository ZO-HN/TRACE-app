import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSessionSummaries } from '../hooks/useSessionSummaries';
import { formatDuration, formatSessionDate } from '../lib/workout/summary';
import Card from './ui/Card';
import FadeInView from './ui/FadeInView';
import Skeleton from './ui/Skeleton';

export default function SessionSummaries({ userId }: { userId: string }) {
  const { sessions, isLoading } = useSessionSummaries(userId);

  if (isLoading && sessions.length === 0) {
    return (
      <View className="gap-2">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </View>
    );
  }
  if (sessions.length === 0) {
    return (
      <View className="items-center py-6 gap-2">
        <Ionicons name="time-outline" size={26} color="#6B7280" />
        <Text className="text-sm text-gray-500">No completed sessions yet.</Text>
      </View>
    );
  }

  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-gray-400 uppercase tracking-wider px-2">
        Recent sessions
      </Text>
      {sessions.map((s, i) => (
        <FadeInView key={s.id} delay={i * 40}>
          <Card className="flex-row items-center justify-between px-3 py-2.5">
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
    </View>
  );
}
