import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTraceUserContext } from '../../src/context/TraceUserContext';
import { useCardioExercises } from '../../src/hooks/useCardioExercises';
import DateNav from '../../src/components/cardio/DateNav';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function SelectCardioScreen() {
  const { profile } = useTraceUserContext();
  const { exercises, isLoading } = useCardioExercises(profile!.id);
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const [date, setDate] = useState(dateParam ?? todayKey());
  const [query, setQuery] = useState('');

  const filtered = exercises.filter((e) => e.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <Pressable onPress={() => router.back()} className="absolute left-4 z-10">
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <Text className="flex-1 text-lg font-bold text-white text-center">Select cardio</Text>
        <Pressable onPress={() => router.push('/cardio/new')} className="absolute right-4">
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      <DateNav date={date} onChange={setDate} />

      <View className="px-4 pt-3">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search cardio exercises"
          placeholderTextColor="#6B7280"
          className="h-11 bg-surface border border-border rounded-xl px-3 text-white"
        />
      </View>

      {!isLoading && filtered.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6 gap-2">
          <Ionicons name="pulse-outline" size={28} color="#6B7280" />
          <Text className="text-white font-semibold">No cardio exercises yet</Text>
          <Text className="text-sm text-gray-500 text-center">
            Tap + to create your first one (e.g. Treadmill, Cycling, Rowing).
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerClassName="px-4 py-4 gap-3">
          {filtered.map((exercise) => (
            <Pressable
              key={exercise.id}
              onPress={() => router.push({ pathname: `/cardio/${exercise.id}`, params: { date } })}
              className="flex-row items-center gap-4"
            >
              <View className="w-14 h-14 rounded-full bg-primary/15 items-center justify-center">
                <Ionicons name="paw" size={26} color="#4ADE80" />
              </View>
              <View>
                <Text className="text-white font-bold text-base">{exercise.name}</Text>
                <View className="flex-row items-center gap-2 mt-1">
                  <Text className="text-gray-500 text-sm">Cardio</Text>
                  <View className="bg-primary/20 rounded-md px-2 py-0.5">
                    <Text className="text-primary text-xs font-bold">Custom</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
