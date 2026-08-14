import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTraceUserContext } from '../../src/context/TraceUserContext';
import { usePrograms } from '../../src/hooks/usePrograms';
import { useProgramEnrollment } from '../../src/hooks/useProgramEnrollment';
import { enrollmentProgressPct, SPLIT_TEMPLATES } from '../../src/lib/programs/types';
import Card from '../../src/components/ui/Card';
import Button from '../../src/components/ui/Button';
import ScreenHeader from '../../src/components/ui/ScreenHeader';
import Skeleton from '../../src/components/ui/Skeleton';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useTraceUserContext();
  const { programs, isLoading, deleteProgram, generateShareLink } = usePrograms(profile!.id);
  const { enrollments, enroll, advance } = useProgramEnrollment(profile!.id);
  const [sharing, setSharing] = useState(false);

  const program = programs.find((p) => p.id === id);
  const activeEnrollment = enrollments.find((e) => e.programId === id && !e.completedAt);
  const splitLabel = SPLIT_TEMPLATES.find((s) => s.value === program?.splitType)?.label;

  const weeks = useMemo(() => {
    if (!program) return [];
    const byWeek = new Map<number, typeof program.days>();
    for (const day of program.days) {
      byWeek.set(day.weekNumber, [...(byWeek.get(day.weekNumber) ?? []), day]);
    }
    return Array.from(byWeek.entries()).sort(([a], [b]) => a - b);
  }, [program]);

  const trainingDaysPerWeek = weeks[0]?.[1]?.length ?? 0;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <ScreenHeader title="Program" />
        <View className="p-4 gap-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </View>
      </SafeAreaView>
    );
  }

  if (!program) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <ScreenHeader title="Program" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-sm text-gray-500 text-center">This program isn't available anymore.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const progress = activeEnrollment ? enrollmentProgressPct(activeEnrollment, program.totalWeeks) : null;

  const handleShare = async () => {
    setSharing(true);
    const result = await generateShareLink(program.id, program.shareToken);
    setSharing(false);
    if (!result.ok) {
      Alert.alert('Could not share', result.error);
      return;
    }
    void Share.share({
      message: `Join my "${program.name}" program on TRACE — open Programs > Join a Program and paste this code:\n\n${result.token}`,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader
        title={program.name}
        right={
          <Pressable disabled={sharing} onPress={() => void handleShare()}>
            <Ionicons name="share-outline" size={20} color={sharing ? '#6B7280' : '#FFFFFF'} />
          </Pressable>
        }
      />
      <ScrollView contentContainerClassName="p-4 gap-4">
        <Card className="p-4 gap-2">
          {program.description && <Text className="text-sm text-gray-300">{program.description}</Text>}
          <View className="flex-row gap-4 mt-1">
            <View>
              <Text className="text-xs text-gray-500 uppercase">Length</Text>
              <Text className="text-white font-semibold">{program.totalWeeks} weeks</Text>
            </View>
            <View>
              <Text className="text-xs text-gray-500 uppercase">Split</Text>
              <Text className="text-white font-semibold">{splitLabel}</Text>
            </View>
            <View>
              <Text className="text-xs text-gray-500 uppercase">Training days/wk</Text>
              <Text className="text-white font-semibold">{trainingDaysPerWeek}</Text>
            </View>
          </View>
        </Card>

        {activeEnrollment ? (
          <Card className="p-4 gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-white font-semibold">
                Week {activeEnrollment.currentWeek} of {program.totalWeeks}
              </Text>
              <Text className="text-primary text-sm font-bold">{progress ?? 0}%</Text>
            </View>
            <View className="h-2 bg-background rounded-full overflow-hidden">
              <View className="h-2 bg-primary rounded-full" style={{ width: `${progress ?? 0}%` }} />
            </View>
            <Button
              variant="secondary"
              onPress={() => void advance(activeEnrollment.id, program.totalWeeks)}
            >
              Mark today done
            </Button>
          </Card>
        ) : (
          <Button fullWidth onPress={() => void enroll(program.id)}>
            Start this program
          </Button>
        )}

        <View className="gap-3">
          <Text className="text-xs text-gray-500 uppercase font-bold">Week-by-week</Text>
          {weeks.map(([weekNumber, days]) => (
            <Card key={weekNumber} className="p-3 gap-1.5">
              <Text className="text-xs text-gray-500 font-semibold px-1">Week {weekNumber}</Text>
              {DAY_LABELS.map((label, i) => {
                const day = days.find((d) => d.dayOfWeek === i + 1);
                return (
                  <View key={label} className="flex-row items-center justify-between px-1 py-1">
                    <Text className="text-xs text-gray-500 w-10">{label}</Text>
                    <Text className={`text-sm flex-1 ${day ? 'text-white' : 'text-gray-600'}`}>
                      {day?.workoutTemplateName ?? 'Rest'}
                    </Text>
                  </View>
                );
              })}
            </Card>
          ))}
        </View>

        <Button
          variant="danger"
          onPress={() =>
            Alert.alert('Delete program?', 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                  void deleteProgram(program.id).then((r) => {
                    if (r.ok) router.replace('/programs');
                  });
                },
              },
            ])
          }
        >
          Delete program
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
