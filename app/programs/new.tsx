import { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTraceUserContext } from '../../src/context/TraceUserContext';
import { usePrograms } from '../../src/hooks/usePrograms';
import { useWorkoutTemplates } from '../../src/hooks/useWorkoutTemplates';
import { PROGRAM_CATEGORIES, SPLIT_TEMPLATES, type SplitType } from '../../src/lib/programs/types';
import ScreenHeader from '../../src/components/ui/ScreenHeader';
import Select from '../../src/components/ui/Select';
import Button from '../../src/components/ui/Button';

const INPUT_CLASS = 'bg-surface border border-border rounded-xl px-4 py-3 text-white';
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const REST = 'REST';

export default function NewProgramScreen() {
  const { profile } = useTraceUserContext();
  const { createProgram } = usePrograms(profile!.id);
  const { templates } = useWorkoutTemplates(profile!.id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(PROGRAM_CATEGORIES[0]);
  const [splitType, setSplitType] = useState<SplitType>('full_body');
  const [totalWeeks, setTotalWeeks] = useState('6');
  const [pattern, setPattern] = useState<(string | null)[]>(Array(7).fill(null));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const splitHint = useMemo(() => SPLIT_TEMPLATES.find((s) => s.value === splitType)?.days ?? [], [splitType]);

  const templateOptions = [
    { value: REST, label: 'Rest day' },
    ...templates.map((t) => ({ value: t.id, label: t.name })),
  ];

  const handleSubmit = async () => {
    const weeks = parseInt(totalWeeks, 10);
    if (!name.trim()) return setError('Program name is required.');
    if (!Number.isFinite(weeks) || weeks < 1 || weeks > 52) return setError('Weeks must be between 1 and 52.');

    setSubmitting(true);
    setError(null);
    const result = await createProgram({
      name,
      description,
      category,
      splitType,
      totalWeeks: weeks,
      weeklyPattern: pattern,
    });
    setSubmitting(false);
    if (result.ok) router.replace(`/programs/${result.programId}`);
    else setError(result.error ?? 'Could not create that program.');
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader title="New Program" />
      <ScrollView contentContainerClassName="p-4 gap-5">
        <View className="gap-2">
          <Text className="text-sm text-gray-400">Program name</Text>
          <TextInput
            className={INPUT_CLASS}
            placeholder="e.g. 12-Week Strength Block"
            placeholderTextColor="#6B7280"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View className="gap-2">
          <Text className="text-sm text-gray-400">Description (optional)</Text>
          <TextInput
            className={INPUT_CLASS}
            placeholder="What's this program for?"
            placeholderTextColor="#6B7280"
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        <View className="gap-2">
          <Text className="text-sm text-gray-400">Category</Text>
          <Select
            value={category}
            options={PROGRAM_CATEGORIES.map((c) => ({ value: c, label: c }))}
            onChange={setCategory}
          />
        </View>

        <View className="gap-2">
          <Text className="text-sm text-gray-400">Split</Text>
          <Select
            value={splitType}
            options={SPLIT_TEMPLATES.map((s) => ({ value: s.value, label: s.label }))}
            onChange={setSplitType}
          />
        </View>

        <View className="gap-2">
          <Text className="text-sm text-gray-400">Length</Text>
          <View className="flex-row items-center bg-surface border border-border rounded-xl px-4">
            <TextInput
              className="flex-1 py-3 text-white"
              keyboardType="number-pad"
              value={totalWeeks}
              onChangeText={setTotalWeeks}
            />
            <Text className="text-sm text-gray-500">weeks</Text>
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-sm text-gray-400">Weekly schedule — repeats every week</Text>
          {DAY_LABELS.map((label, i) => (
            <View key={label} className="gap-1">
              <Text className="text-xs text-gray-500">
                {label}
                {splitHint[i] && splitHint[i] !== 'Rest' ? ` · ${splitHint[i]}` : ''}
              </Text>
              <Select
                value={pattern[i] ?? REST}
                options={templateOptions}
                onChange={(v) => setPattern((prev) => prev.map((p, idx) => (idx === i ? (v === REST ? null : v) : p)))}
              />
            </View>
          ))}
        </View>

        {error && <Text className="text-xs text-red-400">{error}</Text>}

        <Button fullWidth size="lg" onPress={() => void handleSubmit()} loading={submitting}>
          Create program
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
