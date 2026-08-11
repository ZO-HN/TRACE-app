import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTraceUserContext } from '../../src/context/TraceUserContext';
import { useCheckIns } from '../../src/hooks/useCheckIns';
import { useCheckInTemplates } from '../../src/hooks/useCheckInTemplates';
import Card from '../../src/components/ui/Card';
import Skeleton from '../../src/components/ui/Skeleton';
import ScreenHeader from '../../src/components/ui/ScreenHeader';

const STATUS_STYLE: Record<string, string> = {
  scheduled: 'bg-background border-border text-gray-400',
  submitted: 'bg-background border-border text-gray-400',
  reviewed: 'bg-primary/15 border-primary/30 text-primary',
};

export default function CheckInsScreen() {
  const { profile } = useTraceUserContext();
  const { checkIns, isLoading, error } = useCheckIns(profile!.id);
  const { templates, isLoading: templatesLoading } = useCheckInTemplates();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader title="Check-ins" />

      <ScrollView contentContainerClassName="p-4 gap-6">
        <View className="gap-3">
          <Text className="text-xs text-gray-500 uppercase font-bold">Start a check-in</Text>
          {templatesLoading ? (
            <Skeleton className="h-16 w-full rounded-xl" />
          ) : templates.length === 0 ? (
            <Text className="text-sm text-gray-500">Your coach hasn't assigned any check-in templates yet.</Text>
          ) : (
            templates.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => router.push(`/checkins/${t.id}`)}
                className="flex-row items-center justify-between bg-surface border border-border rounded-xl px-4 py-3.5"
              >
                <View className="flex-1 pr-3">
                  <Text className="text-white font-semibold">{t.name}</Text>
                  {t.description && (
                    <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>
                      {t.description}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color="#6B7280" />
              </Pressable>
            ))
          )}
        </View>

        <View className="gap-3">
          <Text className="text-xs text-gray-500 uppercase font-bold">History</Text>
          {isLoading ? (
            <View className="gap-2">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </View>
          ) : error ? (
            <Text className="text-sm text-red-400">Could not load check-ins: {error}</Text>
          ) : checkIns.length === 0 ? (
            <View className="items-center justify-center py-8 gap-2">
              <Ionicons name="clipboard-outline" size={28} color="#6B7280" />
              <Text className="text-sm text-gray-500 text-center">No check-ins submitted yet.</Text>
            </View>
          ) : (
            checkIns.map((c) => (
              <Card key={c.id} className="p-4 gap-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-white font-semibold">{c.templateName ?? 'Check-in'}</Text>
                  <View className={`border rounded-full px-2 py-0.5 ${STATUS_STYLE[c.status]}`}>
                    <Text className={`text-[10px] font-bold uppercase ${STATUS_STYLE[c.status].split(' ').pop()}`}>
                      {c.status}
                    </Text>
                  </View>
                </View>
                {c.submittedAt && (
                  <Text className="text-xs text-gray-500">
                    {new Date(c.submittedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                )}
                {c.coachNotes && (
                  <View className="bg-background border border-border rounded-xl p-3 gap-1">
                    <Text className="text-xs text-gray-500 uppercase font-bold">Coach notes</Text>
                    <Text className="text-sm text-gray-300">{c.coachNotes}</Text>
                  </View>
                )}
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
