import { Text, View } from 'react-native';
import { useSessionSummaries } from '../hooks/useSessionSummaries';
import { formatDuration, formatSessionDate } from '../lib/workout/summary';

export default function SessionSummaries({ userId }: { userId: string }) {
  const { sessions, isLoading } = useSessionSummaries(userId);

  if (isLoading && sessions.length === 0) return null;
  if (sessions.length === 0) {
    return (
      <View className="px-2">
        <Text className="text-sm text-gray-500">No completed sessions yet.</Text>
      </View>
    );
  }

  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-gray-400 uppercase tracking-wider px-2">
        Recent sessions
      </Text>
      {sessions.map((s) => (
        <View
          key={s.id}
          className="flex-row items-center justify-between bg-surface border border-border rounded-lg px-3 py-2.5"
        >
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
        </View>
      ))}
    </View>
  );
}
