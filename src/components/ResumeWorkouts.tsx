import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { listActiveDrafts } from '../lib/workout/activeDraftStorage';
import type { ActiveWorkoutDraft } from '../lib/workout/activeDraft';
import Button from './ui/Button';

export default function ResumeWorkouts({ userId }: { userId: string }) {
  const [snapshot, setSnapshot] = useState<{ owner: string; drafts: ActiveWorkoutDraft[]; error: string | null } | null>(null);
  const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setSnapshot(null);
    void listActiveDrafts(userId).then((drafts) => {
      if (active) setSnapshot({ owner: userId, drafts, error: null });
    }).catch(() => {
      if (active) setSnapshot({ owner: userId, drafts: [], error: 'Could not load saved workouts on this device.' });
    });
    return () => { active = false; };
  }, [userId, retry]));
  if (snapshot?.owner !== userId) return <Text className="text-sm text-gray-400">Loading saved workouts...</Text>;
  return <View className="gap-2">
    {snapshot.error && <>
      <Text accessibilityRole="alert" className="text-sm text-red-400">{snapshot.error}</Text>
      <Button variant="secondary" onPress={() => setRetry((value) => value + 1)}>Retry saved workouts</Button>
    </>}
    {snapshot.drafts.map((draft) => <Button key={draft.templateId} variant="secondary"
      onPress={() => router.push({ pathname: '/(tabs)/session', params: { templateId: draft.templateId } })}>
      {`Resume ${draft.session.sessionName}`}
    </Button>)}
  </View>;
}
