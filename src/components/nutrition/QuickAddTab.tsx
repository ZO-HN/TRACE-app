import { AI_AVAILABLE, AI_UNAVAILABLE_REASON } from '../../lib/ai/availability';
import { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useNutritionLogs } from '../../hooks/useNutritionLogs';
import { useAICopilotConfig } from '../../hooks/useAICopilotConfig';
import { hasAnyMacro, parseQuickEntry } from '../../lib/nutrition/parseQuickEntry';
import { nutritionEntryError } from '../../lib/nutrition/validation';
import { chatCompletion } from '../../lib/ai/client';
import {
  buildMealPhotoScanMessages,
  parseScannedMeal,
  scannedMealToQuickEntryText,
} from '../../lib/ai/mealPhotoScan';
import type { MealTemplateItem } from '../../lib/nutrition/types';
import VoiceInputButton from '../ai/VoiceInputButton';
import Button from '../ui/Button';
import { useAsyncAction } from '../../hooks/useAsyncAction';

export default function QuickAddTab({
  userId,
  slot,
  onLogged,
}: {
  userId: string;
  slot?: number | null;
  onLogged: (item: MealTemplateItem) => void;
}) {
  const { logEntry } = useNutritionLogs(userId);
  const { config, isConfigured } = useAICopilotConfig();
  const [text, setText] = useState('');
  const action = useAsyncAction();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => parseQuickEntry(text), [text]);
  const validationError = parsed.error ?? nutritionEntryError({ ...parsed, description: text.trim(), meal_slot: slot });
  const chips = [
    parsed.protein_g != null && `${parsed.protein_g}g protein`,
    parsed.carbs_g != null && `${parsed.carbs_g}g carbs`,
    parsed.fat_g != null && `${parsed.fat_g}g fat`,
    parsed.calories != null && `${parsed.calories} kcal`,
  ].filter(Boolean) as string[];

  const handleLog = () => action.run(async () => {
    setError(null);
    const result = await logEntry(text, slot);
    if (result.ok) {
      onLogged({ name: text.trim(), ...parsed });
      setText('');
    } else {
      setError(result.error ?? 'Could not log that entry.');
    }
  });

  const handleAIScan = async () => {
    if (!AI_AVAILABLE) { setError(AI_UNAVAILABLE_REASON); return; }
    if (!isConfigured || !config) {
      router.push('/ai-copilot/settings');
      return;
    }
    setScanning(true);
    setError(null);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setError('Camera access was not granted. You can still type your entry.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.5 });
      if (result.canceled || !result.assets?.[0]) return;
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
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
      <View className="gap-1">
        <Text accessibilityRole="header" className="text-lg font-bold text-white">Quick entry</Text>
        <Text className="text-sm text-gray-400">Use the values on your food label. A food name alone won't calculate nutrition.</Text>
      </View>
      <Text className="text-sm font-semibold text-gray-200">Food and nutrition</Text>
      <View className="flex-row items-center gap-2">
        <TextInput
          accessibilityLabel="Food and nutrition"
          accessibilityHint="Include calories or macros, for example yogurt, 150 kcal, 20g protein"
          editable={!action.pending && !scanning}
          multiline
          textAlignVertical="top"
          style={{ minHeight: 112 }}
          value={text}
          onChangeText={setText}
          placeholder="e.g. Yogurt, 150 kcal, 20g protein, 10g carbs, 3g fat"
          placeholderTextColor="#6B7280"
          className="flex-1 bg-surface border border-border rounded-xl p-3 text-white"
        />
        <VoiceInputButton onTranscribed={setText} onError={setError} />
      </View>
      {chips.length > 0 && (
        <View className="gap-2">
          <Text className="text-sm text-gray-400">Review values to log · only entered values are saved</Text>
          <View className="flex-row flex-wrap gap-1.5">
          {chips.map((chip) => (
            <View key={chip} className="bg-primary/10 px-2 py-1 rounded-full">
              <Text className="text-primary text-xs font-semibold">{chip}</Text>
            </View>
          ))}
          </View>
        </View>
      )}
      {text.trim().length > 0 && validationError && <Text className="text-sm text-amber-300">{validationError}</Text>}
      {(error || action.error) && <Text accessibilityRole="alert" className="text-sm text-red-400">{error ?? action.error}</Text>}
      <Button onPress={() => void handleLog()} loading={action.pending} disabled={!hasAnyMacro(parsed) || !!validationError || scanning} fullWidth>
        Save entry
      </Button>
      <Text className="text-xs text-gray-400">Food logs save on this device first, including offline.</Text>
      <Button
        variant="secondary"
        size="sm"
        onPress={() => void handleAIScan()}
        loading={scanning}
        disabled={action.pending}
        icon={<Ionicons name="camera-outline" size={14} color="#E5E7EB" />}
      >
        {isConfigured ? 'Scan photo with AI' : 'Set up AI Copilot to scan photos'}
      </Button>
      <Text className="text-xs text-gray-400">Photo estimates need a connection. Review the values before saving.</Text>
    </ScrollView>
  );
}
