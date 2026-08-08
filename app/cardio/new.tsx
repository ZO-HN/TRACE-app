import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTraceUserContext } from '../../src/context/TraceUserContext';
import { useCardioExercises } from '../../src/hooks/useCardioExercises';
import ScreenHeader from '../../src/components/ui/ScreenHeader';
import Button from '../../src/components/ui/Button';

export default function NewCardioExerciseScreen() {
  const { profile } = useTraceUserContext();
  const { createExercise } = useCardioExercises(profile!.id);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setSubmitting(true);
    setError(null);
    const result = await createExercise(name);
    setSubmitting(false);
    if (result.ok && result.exercise) {
      router.replace(`/cardio/${result.exercise.id}`);
    } else {
      setError(result.error ?? 'Could not create that exercise.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader title="New cardio exercise" />
      <View className="p-4 gap-3">
        <Text className="text-sm text-gray-400">Exercise name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Cycling"
          placeholderTextColor="#6B7280"
          autoFocus
          className="h-12 bg-surface border border-border rounded-xl px-3 text-white"
        />
        {error && <Text className="text-xs text-red-400">{error}</Text>}
        <Button fullWidth size="lg" onPress={() => void handleCreate()} loading={submitting} disabled={!name.trim()}>
          Create
        </Button>
      </View>
    </SafeAreaView>
  );
}
