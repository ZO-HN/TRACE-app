import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTraceUserContext } from '../../src/context/TraceUserContext';
import { useWorkoutFolders } from '../../src/hooks/useWorkoutFolders';
import { useWorkoutTemplates } from '../../src/hooks/useWorkoutTemplates';
import { groupByFolder } from '../../src/lib/workout/folders';
import Card from '../../src/components/ui/Card';
import Button from '../../src/components/ui/Button';
import Select from '../../src/components/ui/Select';

const UNFOLDERED = 'none';

export default function WorkoutsIndexScreen() {
  const { profile } = useTraceUserContext();
  const { folders, refresh: refreshFolders } = useWorkoutFolders(profile!.id);
  const {
    templates,
    isLoading,
    refresh: refreshTemplates,
    moveToFolder,
  } = useWorkoutTemplates(profile!.id);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // This screen stays mounted underneath the "New Folder" modal (Stack
  // semantics), so router.back() doesn't remount it or rerun its initial
  // fetch — without this, a newly created folder wouldn't show up until
  // the user left and re-entered /workouts.
  useFocusEffect(
    useCallback(() => {
      void refreshFolders();
      void refreshTemplates();
    }, [refreshFolders, refreshTemplates]),
  );

  const groups = groupByFolder(templates, folders);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <Text className="text-lg font-bold text-white flex-1">My Workouts</Text>
        <Pressable onPress={() => router.push('/workouts/folders/new')}>
          <Ionicons name="folder-open-outline" size={20} color="#E5E7EB" />
        </Pressable>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Loading…</Text>
        </View>
      ) : templates.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6 gap-2">
          <Ionicons name="barbell-outline" size={32} color="#6B7280" />
          <Text className="text-lg font-bold text-white">No workouts yet</Text>
          <Text className="text-sm text-gray-500 text-center">
            Generate a workout from the Stats tab or wait for your coach to assign one.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerClassName="px-4 py-4 gap-4">
          {groups.map((group) => {
            const key = group.folder?.id ?? 'unfoldered';
            const isCollapsed = collapsed[key];
            return (
              <View key={key} className="gap-2">
                <Pressable
                  onPress={() => setCollapsed((c) => ({ ...c, [key]: !c[key] }))}
                  className="flex-row items-center gap-2 px-1"
                >
                  <Ionicons name={isCollapsed ? 'chevron-forward' : 'chevron-down'} size={16} color="#9CA3AF" />
                  <Text className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                    {group.folder?.name ?? 'My Workouts'} ({group.templates.length})
                  </Text>
                </Pressable>

                {!isCollapsed &&
                  group.templates.map((t) => (
                    <Card key={t.id} className="p-4 gap-3">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-white font-semibold text-base">{t.name}</Text>
                        <View className="bg-primary/15 border border-primary/30 rounded-full px-2 py-0.5">
                          <Text className="text-primary text-xs font-medium">
                            {t.scope === 'ASSIGNED' ? 'Coach' : 'Mine'}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-xs text-gray-500">{t.exerciseCount} exercises</Text>
                      {folders.length > 0 && (
                        <Select
                          value={t.folderId ?? UNFOLDERED}
                          options={[
                            { value: UNFOLDERED, label: 'No folder' },
                            ...folders.map((f) => ({ value: f.id, label: f.name })),
                          ]}
                          onChange={(value) =>
                            void moveToFolder(t.id, value === UNFOLDERED ? null : value)
                          }
                        />
                      )}
                      <Button
                        size="sm"
                        onPress={() =>
                          router.push({ pathname: '/(tabs)', params: { templateId: t.id } })
                        }
                      >
                        Start Workout
                      </Button>
                    </Card>
                  ))}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
