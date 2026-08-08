import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useWorkoutGenerator } from '../hooks/useWorkoutGenerator';
import { kgToLbs } from '../lib/units';
import Button from './ui/Button';
import Card from './ui/Card';

export default function WorkoutGenerator({ userId }: { userId: string }) {
  const { suggestion, isGenerating, isSaving, error, generate, save } =
    useWorkoutGenerator(userId);

  const handleSave = async () => {
    const result = await save();
    if (result.ok) {
      // Cleared implicitly by re-generating; a saved suggestion becomes
      // loadable next session via useAssignedWorkout's PRIVATE fallback.
      void generate();
    }
  };

  return (
    <Card className="p-4 gap-3">
      <View className="flex-row items-center gap-2">
        <View className="w-8 h-8 rounded-lg bg-primary/15 items-center justify-center">
          <Ionicons name="sparkles-outline" size={16} color="#4ADE80" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-white">Generate a workout</Text>
          <Text className="text-xs text-gray-500 mt-0.5">
            Rule-based, from your own training data — not an AI model call.
          </Text>
        </View>
      </View>

      <Button
        onPress={() => void generate()}
        loading={isGenerating}
        fullWidth
        icon={<Ionicons name="shuffle-outline" size={16} color="#fff" />}
      >
        {suggestion ? 'Regenerate' : 'Generate 3-day split'}
      </Button>

      {error && (
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="alert-circle-outline" size={13} color="#F87171" />
          <Text className="text-xs text-red-400 flex-1">{error}</Text>
        </View>
      )}

      {suggestion && (
        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 250 }}
          className="gap-3"
        >
          {suggestion.days.map((day) => (
            <View key={day.dayNumber} className="gap-1">
              <Text className="text-xs font-semibold text-gray-400 uppercase">
                Day {day.dayNumber}
              </Text>
              {day.items.map((item) => (
                <View
                  key={item.exerciseId}
                  className="flex-row items-center justify-between bg-background rounded-xl px-3 py-2"
                >
                  <Text className="text-sm text-white">{item.exerciseName}</Text>
                  <Text className="text-xs text-gray-400">
                    {item.targetSets}×{item.targetReps} @ RPE {item.targetRpe}
                    {item.suggestedWeightKg != null &&
                      ` · ~${kgToLbs(item.suggestedWeightKg)} lbs`}
                  </Text>
                </View>
              ))}
            </View>
          ))}

          <Button
            onPress={() => void handleSave()}
            loading={isSaving}
            variant="outline"
            fullWidth
            icon={<Ionicons name="checkmark-circle-outline" size={16} color="#4ADE80" />}
          >
            Save as my next workout
          </Button>
        </MotiView>
      )}
    </Card>
  );
}
