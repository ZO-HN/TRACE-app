import { useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useNutritionLogs } from '../../hooks/useNutritionLogs';
import { parseQuickEntry } from '../../lib/nutrition/parseQuickEntry';
import Button from '../ui/Button';

export default function QuickAddTab({ userId, onLogged }: { userId: string; onLogged: () => void }) {
  const { logEntry } = useNutritionLogs(userId);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => parseQuickEntry(text), [text]);
  const chips = [
    parsed.protein_g != null && `${parsed.protein_g}g protein`,
    parsed.carbs_g != null && `${parsed.carbs_g}g carbs`,
    parsed.fat_g != null && `${parsed.fat_g}g fat`,
    parsed.calories != null && `${parsed.calories} kcal`,
  ].filter(Boolean) as string[];

  const handleLog = async () => {
    setSubmitting(true);
    setError(null);
    const result = await logEntry(text);
    setSubmitting(false);
    if (result.ok) {
      setText('');
      onLogged();
    } else {
      setError(result.error ?? 'Could not log that entry.');
    }
  };

  return (
    <View className="p-4 gap-3">
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="e.g. 80g protein, 40g carbs, 20g fat, 650 kcal"
        placeholderTextColor="#6B7280"
        className="h-11 bg-surface border border-border rounded-xl px-3 text-white"
      />
      {chips.length > 0 && (
        <View className="flex-row flex-wrap gap-1.5">
          {chips.map((chip) => (
            <View key={chip} className="bg-primary/10 px-2 py-1 rounded-full">
              <Text className="text-primary text-xs font-semibold">{chip}</Text>
            </View>
          ))}
        </View>
      )}
      {error && <Text className="text-xs text-red-400">{error}</Text>}
      <Button onPress={() => void handleLog()} loading={submitting} disabled={text.trim().length === 0} fullWidth>
        Log entry
      </Button>
    </View>
  );
}
