import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTraceUserContext } from '../../src/context/TraceUserContext';
import { useCheckIns } from '../../src/hooks/useCheckIns';
import { useCheckInTemplates } from '../../src/hooks/useCheckInTemplates';
import { isQuestionAnswered, type CheckInAnswerValue, type CheckInResponses } from '../../src/lib/checkins/types';
import QuestionField from '../../src/components/checkins/QuestionField';
import ScreenHeader from '../../src/components/ui/ScreenHeader';
import Button from '../../src/components/ui/Button';
import Skeleton from '../../src/components/ui/Skeleton';

export default function FillCheckInScreen() {
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  const { profile } = useTraceUserContext();
  const { templates, isLoading } = useCheckInTemplates();
  const { submit } = useCheckIns(profile!.id);

  const template = useMemo(() => templates.find((t) => t.id === templateId), [templates, templateId]);

  const [responses, setResponses] = useState<CheckInResponses>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setAnswer = (questionId: string, value: CheckInAnswerValue) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const missingRequired = template?.questions.some(
    (q) => q.required && !isQuestionAnswered(q, responses[q.id] ?? null),
  );

  const handleSubmit = async () => {
    if (!template) return;
    setSubmitting(true);
    setError(null);
    const result = await submit(template.id, responses);
    setSubmitting(false);
    if (result.ok) router.replace('/checkins');
    else setError(result.error ?? 'Could not submit that check-in.');
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <ScreenHeader title="Check-in" />
        <View className="p-4 gap-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </View>
      </SafeAreaView>
    );
  }

  if (!template) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <ScreenHeader title="Check-in" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-sm text-gray-500 text-center">
            This check-in template isn't available anymore.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader title={template.name} />

      <ScrollView contentContainerClassName="p-4 gap-5">
        {template.description && <Text className="text-sm text-gray-400">{template.description}</Text>}

        {template.questions.map((q) => (
          <QuestionField key={q.id} question={q} value={responses[q.id] ?? null} onChange={(v) => setAnswer(q.id, v)} />
        ))}

        {error && <Text className="text-xs text-red-400">{error}</Text>}

        <Button fullWidth size="lg" onPress={() => void handleSubmit()} loading={submitting} disabled={missingRequired}>
          Submit check-in
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
