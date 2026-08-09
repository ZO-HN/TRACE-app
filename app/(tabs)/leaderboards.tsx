import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useExerciseCatalog } from '../../src/hooks/useExerciseCatalog';
import Card from '../../src/components/ui/Card';

export default function LeaderboardsTab() {
  const { rows, isLoaded } = useExerciseCatalog();

  return (
    <View className="flex-1">
      <View className="px-4 pt-4">
        <Text className="text-2xl font-bold text-white">Compete with Friends!</Text>
        <Text className="text-sm text-gray-400 mt-1">
          Compare your progress with friends and climb the leaderboards for each exercise.
        </Text>
      </View>

      {!isLoaded ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Loading exercises…</Text>
        </View>
      ) : rows.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6 gap-2">
          <Ionicons name="trophy-outline" size={32} color="#6B7280" />
          <Text className="text-sm text-gray-500 text-center">No exercises in the catalog yet.</Text>
        </View>
      ) : (
        <ScrollView contentContainerClassName="px-4 py-4 gap-2">
          {rows.map((exercise) => (
            <Pressable key={exercise.id} onPress={() => router.push(`/leaderboards/${exercise.id}`)}>
              <Card className="flex-row items-center justify-between px-4 py-3.5">
                <Text className="text-white font-medium">{exercise.name}</Text>
                <Ionicons name="chevron-forward" size={18} color="#6B7280" />
              </Card>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
