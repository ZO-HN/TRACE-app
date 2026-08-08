import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useTraceUserContext } from '../../src/context/TraceUserContext';
import { useCardioExercises } from '../../src/hooks/useCardioExercises';
import { useCardioEntries } from '../../src/hooks/useCardioEntries';
import { useCardioHistory } from '../../src/hooks/useCardioHistory';
import { formatMinSec, mondayOf, thisWeekStats } from '../../src/lib/cardio/summary';
import DateNav from '../../src/components/cardio/DateNav';
import Card from '../../src/components/ui/Card';
import Button from '../../src/components/ui/Button';
import ScreenHeader from '../../src/components/ui/ScreenHeader';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function NewEntryForm({
  onAdd,
  onCancel,
}: {
  onAdd: (durationSeconds: number) => Promise<void>;
  onCancel: () => void;
}) {
  const [min, setMin] = useState('');
  const [sec, setSec] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    const total = (parseInt(min, 10) || 0) * 60 + (parseInt(sec, 10) || 0);
    if (total <= 0) return;
    setSubmitting(true);
    await onAdd(total);
    setSubmitting(false);
  };

  return (
    <Card className="p-4 gap-3">
      <Text className="text-xs text-gray-500 uppercase font-bold tracking-wider">Time</Text>
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <TextInput
            value={min}
            onChangeText={setMin}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor="#6B7280"
            autoFocus
            className="h-12 bg-background border border-border rounded-xl px-3 text-center text-white text-lg"
          />
          <Text className="text-center text-xs text-gray-500 mt-1">min</Text>
        </View>
        <Text className="text-white text-lg">:</Text>
        <View className="flex-1">
          <TextInput
            value={sec}
            onChangeText={setSec}
            keyboardType="number-pad"
            placeholder="00"
            placeholderTextColor="#6B7280"
            className="h-12 bg-background border border-border rounded-xl px-3 text-center text-white text-lg"
          />
          <Text className="text-center text-xs text-gray-500 mt-1">sec</Text>
        </View>
      </View>
      <View className="flex-row gap-2">
        <Pressable onPress={onCancel} className="flex-1 h-10 items-center justify-center">
          <Text className="text-gray-500 text-sm font-medium">Cancel</Text>
        </Pressable>
        <Button fullWidth onPress={() => void handleSave()} loading={submitting}>
          Save entry
        </Button>
      </View>
    </Card>
  );
}

export default function CardioExerciseScreen() {
  const { profile } = useTraceUserContext();
  const { exerciseId, date: dateParam } = useLocalSearchParams<{
    exerciseId: string;
    date?: string;
  }>();
  const [date, setDate] = useState(dateParam ?? todayKey());
  const [addingEntry, setAddingEntry] = useState(false);

  const { exercises } = useCardioExercises(profile!.id);
  const exerciseName = exercises.find((e) => e.id === exerciseId)?.name ?? 'Cardio';

  const { entries, isLoading, addEntry, deleteEntry } = useCardioEntries(
    profile!.id,
    exerciseId,
    date,
  );
  const { entries: weekEntries } = useCardioHistory(profile!.id, mondayOf(date));
  const thisExerciseWeekEntries = weekEntries.filter((e) => e.cardioExerciseId === exerciseId);
  const week = thisWeekStats(thisExerciseWeekEntries, new Date(`${date}T00:00:00`));

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader title={exerciseName} />
      <DateNav date={date} onChange={setDate} />

      <ScrollView contentContainerClassName="p-4 gap-4">
        <Card className="p-4">
          <Text className="text-xs text-gray-500 uppercase font-bold tracking-wider">This week</Text>
          <Text className="text-white text-3xl font-bold mt-1">
            {Math.round(week.totalSeconds / 60)}{' '}
            <Text className="text-sm text-primary font-semibold">min</Text>
          </Text>
        </Card>

        {isLoading ? null : entries.length === 0 && !addingEntry ? (
          <View className="items-center py-10 gap-3">
            <View className="w-16 h-16 rounded-full bg-surface items-center justify-center">
              <Ionicons name="pulse-outline" size={26} color="#6B7280" />
            </View>
            <Text className="text-white font-bold">No entries yet</Text>
            <Text className="text-sm text-gray-500 text-center px-6">
              Add your first entry to start tracking this exercise.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {entries.map((entry, i) => (
              <Card key={entry.id} className="p-4 flex-row items-center justify-between">
                <View>
                  <Text className="text-xs text-gray-500 uppercase font-bold tracking-wider">
                    Entry {i + 1}
                  </Text>
                  <Text className="text-white text-lg font-bold mt-1">
                    {formatMinSec(entry.durationSeconds)}
                  </Text>
                </View>
                <Pressable onPress={() => void deleteEntry(entry.id)}>
                  <Ionicons name="trash-outline" size={18} color="#F87171" />
                </Pressable>
              </Card>
            ))}
          </View>
        )}

        {addingEntry ? (
          <NewEntryForm
            onAdd={async (seconds) => {
              await addEntry(seconds);
              setAddingEntry(false);
            }}
            onCancel={() => setAddingEntry(false)}
          />
        ) : (
          <Button fullWidth size="lg" onPress={() => setAddingEntry(true)} icon={<Ionicons name="add" size={18} color="#062E14" />}>
            Add entry
          </Button>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
