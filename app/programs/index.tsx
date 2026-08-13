import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTraceUserContext } from '../../src/context/TraceUserContext';
import { usePrograms } from '../../src/hooks/usePrograms';
import { useProgramEnrollment } from '../../src/hooks/useProgramEnrollment';
import { enrollmentProgressPct } from '../../src/lib/programs/types';
import Card from '../../src/components/ui/Card';
import Skeleton from '../../src/components/ui/Skeleton';
import ScreenHeader from '../../src/components/ui/ScreenHeader';

export default function ProgramsScreen() {
  const { profile } = useTraceUserContext();
  const { programs, isLoading, isSupported } = usePrograms(profile!.id);
  const { enrollments } = useProgramEnrollment(profile!.id);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader
        title="Programs"
        right={
          <Pressable onPress={() => router.push('/programs/new')}>
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </Pressable>
        }
      />

      {!isSupported ? (
        <View className="flex-1 items-center justify-center px-6 gap-2">
          <Ionicons name="construct-outline" size={32} color="#6B7280" />
          <Text className="text-lg font-bold text-white">Programs aren't live yet</Text>
          <Text className="text-sm text-gray-500 text-center">
            This feature needs a backend migration that hasn't been applied yet.
          </Text>
        </View>
      ) : isLoading ? (
        <View className="p-4 gap-2">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </View>
      ) : programs.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6 gap-2">
          <Ionicons name="calendar-outline" size={32} color="#6B7280" />
          <Text className="text-lg font-bold text-white">No programs yet</Text>
          <Text className="text-sm text-gray-500 text-center">
            Build a structured, multi-week training plan — pick a split, assign workouts to each day.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerClassName="p-4 gap-3">
          {programs.map((program) => {
            const activeEnrollment = enrollments.find(
              (e) => e.programId === program.id && !e.completedAt,
            );
            const progress = activeEnrollment
              ? enrollmentProgressPct(activeEnrollment, program.totalWeeks)
              : null;
            return (
              <Pressable key={program.id} onPress={() => router.push(`/programs/${program.id}`)}>
                <Card className="p-4 gap-2">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-white font-semibold text-base">{program.name}</Text>
                    <Text className="text-xs text-gray-500">{program.totalWeeks}w</Text>
                  </View>
                  {program.category && <Text className="text-xs text-gray-500">{program.category}</Text>}
                  {progress !== null && (
                    <View className="gap-1 mt-1">
                      <View className="h-1.5 bg-background rounded-full overflow-hidden">
                        <View className="h-1.5 bg-primary rounded-full" style={{ width: `${progress}%` }} />
                      </View>
                      <Text className="text-[11px] text-primary">
                        Week {activeEnrollment!.currentWeek} of {program.totalWeeks} · {progress}%
                      </Text>
                    </View>
                  )}
                </Card>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
