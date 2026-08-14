import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTraceUserContext } from '../src/context/TraceUserContext';
import { useSessionSummaries } from '../src/hooks/useSessionSummaries';
import { formatDuration, formatSessionDate } from '../src/lib/workout/summary';
import { DATE_RANGE_OPTIONS, filterSessions, type DateRangeFilter } from '../src/lib/workout/historyFilters';
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
        onPress={() => router.push('/(tabs)/training')}
        className="h-14 rounded-[10px] bg-background items-center justify-center"
      >
        <Text className="text-white font-semibold">Generate with AI</Text>
      </Pressable>
    </LinearGradient>
  );
}

const NO_FILTERS: { days: DateRangeFilter; query: string } = { days: 'all', query: '' };

export default function HistoryScreen() {
  const { profile } = useTraceUserContext();
  // History is the full-list view, unlike Dashboard's "recent" callers —
  // needs a real limit so date-range filters aren't silently capped at 10.
  const { sessions, isLoading } = useSessionSummaries(profile!.id, 200);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [days, setDays] = useState<DateRangeFilter>('all');
  const [query, setQuery] = useState('');

  const isFiltered = days !== NO_FILTERS.days || query.trim() !== '';
  const filteredSessions = useMemo(
    () => filterSessions(sessions, { days, query }),
    [sessions, days, query],
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader
        title="History"
        right={
          <Pressable onPress={() => setFiltersOpen((v) => !v)}>
            <Ionicons
              name={isFiltered ? 'filter' : 'filter-outline'}
              size={20}
              color={isFiltered ? '#4ADE80' : '#E5E7EB'}
            />
          </Pressable>
        }
      />

      {filtersOpen && (
        <View className="px-4 py-3 gap-3 border-b border-border">
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by workout name"
            placeholderTextColor="#6B7280"
            className="h-11 bg-surface border border-border rounded-xl px-3 text-white"
          />
          <View className="flex-row flex-wrap gap-2">
            {DATE_RANGE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setDays(opt.value)}
                className={`px-3 py-1.5 rounded-full border ${
                  days === opt.value ? 'bg-primary border-primary' : 'border-border'
                }`}
              >
                <Text className={`text-xs font-medium ${days === opt.value ? 'text-black' : 'text-gray-400'}`}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

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
            <Button fullWidth size="lg" onPress={() => router.push('/(tabs)/training')}>
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
      ) : filteredSessions.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6 gap-2">
          <Ionicons name="search-outline" size={28} color="#6B7280" />
          <Text className="text-white font-semibold">No sessions match</Text>
          <Text className="text-sm text-gray-500 text-center">Try a wider date range or a different search.</Text>
        </View>
      ) : (
        <ScrollView contentContainerClassName="p-4 gap-2">
          {filteredSessions.map((s, i) => (
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
