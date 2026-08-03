import { Pressable, Text, View } from 'react-native';
import { useWorkoutGenerator } from '../hooks/useWorkoutGenerator';
import { kgToLbs } from '../lib/units';

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
    <View className="bg-surface border border-border rounded-xl p-4 gap-3">
      <View>
        <Text className="text-sm font-semibold text-white">Generate a workout</Text>
        <Text className="text-xs text-gray-500 mt-1">
          Rule-based, from your own training data (least-trained muscle groups +
          personal records) — not an AI model call.
        </Text>
      </View>

      <Pressable
        onPress={() => void generate()}
        disabled={isGenerating}
        className="h-11 bg-primary rounded-lg items-center justify-center disabled:opacity-50"
      >
        <Text className="text-white font-semibold">
          {isGenerating ? 'Generating…' : suggestion ? 'Regenerate' : 'Generate 3-day split'}
        </Text>
      </Pressable>

      {error && <Text className="text-xs text-red-400">{error}</Text>}

      {suggestion && (
        <View className="gap-3">
          {suggestion.days.map((day) => (
            <View key={day.dayNumber} className="gap-1">
              <Text className="text-xs font-semibold text-gray-400 uppercase">
                Day {day.dayNumber}
              </Text>
              {day.items.map((item) => (
                <View
                  key={item.exerciseId}
                  className="flex-row items-center justify-between bg-background rounded-lg px-3 py-2"
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

          <Pressable
            onPress={() => void handleSave()}
            disabled={isSaving}
            className="h-11 bg-background border border-primary rounded-lg items-center justify-center disabled:opacity-50"
          >
            <Text className="text-primary font-semibold">
              {isSaving ? 'Saving…' : 'Save as my next workout'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
