// Training-phase / goal "Roadmap" — Tracked's goal-based training-phase
// planner (docs/feature-research/tracked-app-parity-gap.md Tier B).

import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTraceUserContext } from '../../src/context/TraceUserContext';
import { useRoadmaps } from '../../src/hooks/useRoadmaps';
import ScreenHeader from '../../src/components/ui/ScreenHeader';
import Card from '../../src/components/ui/Card';
import Button from '../../src/components/ui/Button';
import Skeleton from '../../src/components/ui/Skeleton';

export default function RoadmapScreen() {
  const { profile } = useTraceUserContext();
  const { phases, isLoading, isPersisted, createPhase, deletePhase } = useRoadmaps(profile!.id);

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [targetMetric, setTargetMetric] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Give this phase a name.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await createPhase({
      name: name.trim(),
      start_date: new Date().toISOString().slice(0, 10),
      target_date: targetDate.trim() || null,
      target_metric: targetMetric.trim() || null,
      target_value: targetValue.trim() ? Number(targetValue) : null,
    });
    setSubmitting(false);
    if (result.ok) {
      setName('');
      setTargetDate('');
      setTargetMetric('');
      setTargetValue('');
      setCreating(false);
    } else {
      setError(result.error ?? 'Could not create that phase.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader title="Roadmap" />
      <ScrollView contentContainerClassName="p-4 gap-4">
        {!isPersisted && !isLoading && (
          <Text className="text-xs text-amber-400">
            Roadmaps aren't fully set up on this backend yet — phases won't survive a reload.
          </Text>
        )}

        {isLoading ? (
          <>
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </>
        ) : (
          phases.map((p) => (
            <Card key={p.id} className="p-4 gap-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-bold text-white">{p.name}</Text>
                <Pressable onPress={() => void deletePhase(p.id)}>
                  <Ionicons name="trash-outline" size={16} color="#F87171" />
                </Pressable>
              </View>
              <Text className="text-xs text-gray-500">
                Started {p.start_date}
                {p.target_date ? ` · targeting ${p.target_date}` : ''}
              </Text>
              {p.target_metric && (
                <Text className="text-xs text-gray-400">
                  Goal: {p.target_metric} {p.target_value != null ? `→ ${p.target_value}` : ''}
                </Text>
              )}
            </Card>
          ))
        )}

        {phases.length === 0 && !isLoading && (
          <View className="items-center py-6 gap-2">
            <Ionicons name="flag-outline" size={26} color="#6B7280" />
            <Text className="text-sm text-gray-500">No training phases yet.</Text>
          </View>
        )}

        {creating ? (
          <Card className="p-4 gap-3">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Phase name (e.g. Cut — Jan-Mar)"
              placeholderTextColor="#6B7280"
              className="h-11 bg-background border border-border rounded-xl px-3 text-white"
            />
            <TextInput
              value={targetDate}
              onChangeText={setTargetDate}
              placeholder="Target date (YYYY-MM-DD, optional)"
              placeholderTextColor="#6B7280"
              className="h-11 bg-background border border-border rounded-xl px-3 text-white"
            />
            <TextInput
              value={targetMetric}
              onChangeText={setTargetMetric}
              placeholder="Target metric (e.g. bodyweight_kg, optional)"
              placeholderTextColor="#6B7280"
              className="h-11 bg-background border border-border rounded-xl px-3 text-white"
            />
            <TextInput
              value={targetValue}
              onChangeText={setTargetValue}
              placeholder="Target value (optional)"
              placeholderTextColor="#6B7280"
              keyboardType="decimal-pad"
              className="h-11 bg-background border border-border rounded-xl px-3 text-white"
            />
            {error && <Text className="text-xs text-red-400">{error}</Text>}
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setCreating(false)}
                className="flex-1 h-10 items-center justify-center"
              >
                <Text className="text-gray-500 text-sm font-medium">Cancel</Text>
              </Pressable>
              <Button size="sm" fullWidth onPress={() => void handleCreate()} loading={submitting}>
                Create
              </Button>
            </View>
          </Card>
        ) : (
          <Button
            variant="secondary"
            fullWidth
            onPress={() => setCreating(true)}
            icon={<Ionicons name="add-outline" size={16} color="#E5E7EB" />}
          >
            New training phase
          </Button>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
