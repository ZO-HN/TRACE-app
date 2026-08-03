import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useNutritionLogs } from '../hooks/useNutritionLogs';
import { parseQuickEntry } from '../lib/nutrition/parseQuickEntry';

function MacroPreview({ text }: { text: string }) {
  const parsed = useMemo(() => parseQuickEntry(text), [text]);
  const chips = [
    parsed.protein_g != null && `${parsed.protein_g}g protein`,
    parsed.carbs_g != null && `${parsed.carbs_g}g carbs`,
    parsed.fat_g != null && `${parsed.fat_g}g fat`,
    parsed.calories != null && `${parsed.calories} kcal`,
  ].filter(Boolean) as string[];

  if (chips.length === 0) return null;

  return (
    <View className="flex-row flex-wrap gap-1.5 mt-2">
      {chips.map((chip) => (
        <View key={chip} className="bg-primary/10 px-2 py-1 rounded">
          <Text className="text-primary text-xs font-semibold">{chip}</Text>
        </View>
      ))}
    </View>
  );
}

// Barcode/photo capture are recorded methods in the schema but not resolved
// to macros anywhere yet — same "documented placeholder" status as the AI
// chat's RAG pipeline. Honest about that rather than half-wiring a camera
// flow with nothing on the other end.
function ComingSoonButton({ label }: { label: string }) {
  return (
    <Pressable
      onPress={() =>
        Alert.alert('Coming soon', `${label} isn't wired up yet — log manually for now.`)
      }
      className="flex-1 h-11 bg-background border border-border rounded-lg items-center justify-center"
    >
      <Text className="text-gray-400 text-xs font-medium">{label}</Text>
    </Pressable>
  );
}

export default function NutritionLogger({ userId }: { userId: string }) {
  const { entries, isLoading, error, logEntry } = useNutritionLogs(userId);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleLog = async () => {
    setSubmitting(true);
    setFormError(null);
    const result = await logEntry(text);
    setSubmitting(false);
    if (result.ok) {
      setText('');
    } else {
      setFormError(result.error ?? 'Could not log that entry.');
    }
  };

  return (
    <View className="gap-4">
      <View className="bg-surface border border-border rounded-xl p-4">
        <Text className="text-sm font-semibold text-white mb-2">Quick-log nutrition</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="e.g. 80g protein, 40g carbs, 20g fat, 650 kcal"
          placeholderTextColor="#6B7280"
          className="h-11 bg-background border border-border rounded-lg px-3 text-white"
          multiline={false}
        />
        <MacroPreview text={text} />
        {formError && <Text className="text-xs text-red-400 mt-2">{formError}</Text>}

        <Pressable
          onPress={() => void handleLog()}
          disabled={submitting || text.trim().length === 0}
          className="h-11 bg-primary rounded-lg items-center justify-center mt-3 disabled:opacity-50"
        >
          <Text className="text-white font-semibold">{submitting ? 'Logging…' : 'Log'}</Text>
        </Pressable>

        <View className="flex-row gap-2 mt-2">
          <ComingSoonButton label="Scan barcode" />
          <ComingSoonButton label="Snap a photo" />
        </View>
      </View>

      {isLoading ? null : error ? (
        <Text className="text-sm text-red-400 px-2">Could not load entries: {error}</Text>
      ) : entries.length === 0 ? (
        <Text className="text-sm text-gray-500 px-2">No entries logged yet today.</Text>
      ) : (
        <View className="gap-2">
          <Text className="text-sm font-semibold text-gray-400 uppercase tracking-wider px-2">
            Recent entries
          </Text>
          {entries.map((e) => (
            <View
              key={e.id}
              className="bg-surface border border-border rounded-lg px-3 py-2.5"
            >
              <Text className="text-sm text-white">{e.description ?? 'Entry'}</Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                {[
                  e.protein_g != null && `${e.protein_g}g P`,
                  e.carbs_g != null && `${e.carbs_g}g C`,
                  e.fat_g != null && `${e.fat_g}g F`,
                  e.calories != null && `${e.calories} kcal`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
