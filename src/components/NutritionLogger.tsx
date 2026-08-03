import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNutritionLogs } from '../hooks/useNutritionLogs';
import { parseQuickEntry } from '../lib/nutrition/parseQuickEntry';
import Button from './ui/Button';
import Card from './ui/Card';
import FadeInView from './ui/FadeInView';
import Skeleton from './ui/Skeleton';

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
        <View key={chip} className="bg-primary/10 px-2 py-1 rounded-full">
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
function ComingSoonButton({
  label,
  icon,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      onPress={() =>
        Alert.alert('Coming soon', `${label} isn't wired up yet — log manually for now.`)
      }
      className="flex-1 h-11 bg-background border border-border rounded-xl items-center justify-center flex-row gap-1.5"
    >
      <Ionicons name={icon} size={15} color="#6B7280" />
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
      <Card className="p-4">
        <View className="flex-row items-center gap-2 mb-3">
          <Ionicons name="nutrition-outline" size={16} color="#3B82F6" />
          <Text className="text-sm font-semibold text-white">Quick-log nutrition</Text>
        </View>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="e.g. 80g protein, 40g carbs, 20g fat, 650 kcal"
          placeholderTextColor="#6B7280"
          className="h-11 bg-background border border-border rounded-xl px-3 text-white"
          multiline={false}
        />
        <MacroPreview text={text} />
        {formError && (
          <View className="flex-row items-center gap-1.5 mt-2">
            <Ionicons name="alert-circle-outline" size={13} color="#F87171" />
            <Text className="text-xs text-red-400">{formError}</Text>
          </View>
        )}

        <View className="mt-3">
          <Button
            onPress={() => void handleLog()}
            loading={submitting}
            disabled={text.trim().length === 0}
            fullWidth
            icon={<Ionicons name="add-circle-outline" size={16} color="#fff" />}
          >
            Log entry
          </Button>
        </View>

        <View className="flex-row gap-2 mt-2">
          <ComingSoonButton label="Scan barcode" icon="barcode-outline" />
          <ComingSoonButton label="Snap a photo" icon="camera-outline" />
        </View>
      </Card>

      {isLoading ? (
        <View className="gap-2">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </View>
      ) : error ? (
        <Text className="text-sm text-red-400 px-2">Could not load entries: {error}</Text>
      ) : entries.length === 0 ? (
        <View className="items-center py-6 gap-2">
          <Ionicons name="restaurant-outline" size={26} color="#6B7280" />
          <Text className="text-sm text-gray-500">No entries logged yet today.</Text>
        </View>
      ) : (
        <View className="gap-2">
          <Text className="text-sm font-semibold text-gray-400 uppercase tracking-wider px-2">
            Recent entries
          </Text>
          {entries.map((e, i) => (
            <FadeInView key={e.id} delay={i * 40}>
              <Card className="px-3 py-2.5">
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
              </Card>
            </FadeInView>
          ))}
        </View>
      )}
    </View>
  );
}
