import { useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useNutritionLogs } from '../../hooks/useNutritionLogs';
import { useAICopilotConfig } from '../../hooks/useAICopilotConfig';
import { parseQuickEntry } from '../../lib/nutrition/parseQuickEntry';
import { chatCompletion } from '../../lib/ai/client';
import {
  buildMealPhotoScanMessages,
  parseScannedMeal,
  scannedMealToQuickEntryText,
} from '../../lib/ai/mealPhotoScan';
import type { MealTemplateItem } from '../../lib/nutrition/types';
import Button from '../ui/Button';

export default function QuickAddTab({
  userId,
  onLogged,
}: {
  userId: string;
  onLogged: (item: MealTemplateItem) => void;
}) {
  const { logEntry } = useNutritionLogs(userId);
  const { config, isConfigured } = useAICopilotConfig();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);
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
      onLogged({ name: text.trim(), ...parsed });
      setText('');
    } else {
      setError(result.error ?? 'Could not log that entry.');
    }
  };

  const handleAIScan = async () => {
    if (!isConfigured || !config) {
      router.push('/ai-copilot/settings');
      return;
    }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;

    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.5 });
    if (result.canceled || !result.assets?.[0]) return;

    setScanning(true);
    setError(null);
    try {
      const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
        encoding: 'base64',
      });
      const response = await chatCompletion(config, buildMealPhotoScanMessages(base64));
      if (!response.ok) {
        setError(response.error);
        return;
      }
      const meal = parseScannedMeal(response.content);
      if (!meal) {
        setError('Could not read a meal estimate from the AI response.');
        return;
      }
      setText(scannedMealToQuickEntryText(meal));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Photo scan failed.');
    } finally {
      setScanning(false);
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
      <Button
        variant="secondary"
        size="sm"
        onPress={() => void handleAIScan()}
        loading={scanning}
        icon={<Ionicons name="camera-outline" size={14} color="#E5E7EB" />}
      >
        {isConfigured ? 'Scan photo with AI' : 'Set up AI Copilot to scan photos'}
      </Button>
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
