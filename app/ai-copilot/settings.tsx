// AI Copilot setup — BYO API key. Per project decision: no built-in
// "Roscoe"-equivalent is bundled or paid for by TRACE; each user brings
// their own key for any OpenAI-compatible endpoint, stored on-device only
// (expo-secure-store — see src/lib/ai/secureConfig.ts). Nothing here is
// synced to Supabase or seen by TRACE's backend.

import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAICopilotConfig } from '../../src/hooks/useAICopilotConfig';
import { chatCompletion } from '../../src/lib/ai/client';
import { DEFAULT_AI_BASE_URL, DEFAULT_AI_MODEL } from '../../src/lib/ai/types';
import ScreenHeader from '../../src/components/ui/ScreenHeader';
import Card from '../../src/components/ui/Card';
import Button from '../../src/components/ui/Button';

export default function AICopilotSettingsScreen() {
  const { config, isLoading, save, clear } = useAICopilotConfig();
  const [baseUrl, setBaseUrl] = useState(DEFAULT_AI_BASE_URL);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(DEFAULT_AI_MODEL);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setBaseUrl(config.baseUrl);
      setApiKey(config.apiKey);
      setModel(config.model);
    }
  }, [config]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await chatCompletion(
      { baseUrl, apiKey, model },
      [{ role: 'user', content: 'Reply with just the word "ok".' }],
    );
    setTesting(false);
    setTestResult(
      result.ok
        ? { ok: true, message: 'Connected — the endpoint responded.' }
        : { ok: false, message: result.error },
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await save({ baseUrl: baseUrl.trim(), apiKey: apiKey.trim(), model: model.trim() });
    setSaving(false);
    router.back();
  };

  if (isLoading) return null;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader title="AI Copilot" />
      <ScrollView contentContainerClassName="p-4 gap-4">
        <Card className="p-4 gap-2">
          <Text className="text-sm text-gray-400">
            TRACE doesn't bundle or pay for an AI assistant. Bring your own API key for any
            OpenAI-compatible endpoint (OpenAI, a compatible proxy, or a self-hosted model). Your
            key is stored only on this device and is never sent to TRACE's servers.
          </Text>
        </Card>

        <View className="gap-2">
          <Text className="text-xs text-gray-500 uppercase tracking-wide">Base URL</Text>
          <TextInput
            value={baseUrl}
            onChangeText={setBaseUrl}
            placeholder={DEFAULT_AI_BASE_URL}
            placeholderTextColor="#6B7280"
            autoCapitalize="none"
            autoCorrect={false}
            className="h-11 bg-background border border-border rounded-xl px-3 text-white"
          />
        </View>

        <View className="gap-2">
          <Text className="text-xs text-gray-500 uppercase tracking-wide">API Key</Text>
          <TextInput
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="sk-..."
            placeholderTextColor="#6B7280"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            className="h-11 bg-background border border-border rounded-xl px-3 text-white"
          />
        </View>

        <View className="gap-2">
          <Text className="text-xs text-gray-500 uppercase tracking-wide">Model</Text>
          <TextInput
            value={model}
            onChangeText={setModel}
            placeholder={DEFAULT_AI_MODEL}
            placeholderTextColor="#6B7280"
            autoCapitalize="none"
            autoCorrect={false}
            className="h-11 bg-background border border-border rounded-xl px-3 text-white"
          />
        </View>

        {testResult && (
          <Text className={`text-xs ${testResult.ok ? 'text-primary' : 'text-red-400'}`}>
            {testResult.message}
          </Text>
        )}

        <View className="gap-2">
          <Button
            variant="secondary"
            fullWidth
            onPress={() => void handleTest()}
            loading={testing}
            disabled={!baseUrl.trim() || !apiKey.trim() || !model.trim()}
          >
            Test connection
          </Button>
          <Button
            fullWidth
            onPress={() => void handleSave()}
            loading={saving}
            disabled={!baseUrl.trim() || !apiKey.trim() || !model.trim()}
          >
            Save
          </Button>
          {config && (
            <Button variant="secondary" fullWidth onPress={() => void clear()}>
              Remove key from this device
            </Button>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
