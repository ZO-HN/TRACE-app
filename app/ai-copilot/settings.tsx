import { AI_AVAILABLE } from '../../src/lib/ai/availability';
import AIUnavailable from '../../src/components/ai/AIUnavailable';
// AI Copilot setup — BYO API key. Per project decision: no built-in
// "Roscoe"-equivalent is bundled or paid for by TRACE; each user brings
// their own key for any OpenAI-compatible endpoint, stored on-device only
// (expo-secure-store — see src/lib/ai/secureConfig.ts). Nothing here is
// synced to Supabase or seen by TRACE's backend.

import { useEffect, useState } from 'react';
import { Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAICopilotConfig } from '../../src/hooks/useAICopilotConfig';
import { chatCompletion } from '../../src/lib/ai/client';
import { AI_PROVIDERS, DEFAULT_AI_BASE_URL, DEFAULT_AI_MODEL, type AICopilotConfig } from '../../src/lib/ai/types';
import Select from '../../src/components/ui/Select';
import { useAsyncAction } from '../../src/hooks/useAsyncAction';
import ScreenHeader from '../../src/components/ui/ScreenHeader';
import Card from '../../src/components/ui/Card';
import Button from '../../src/components/ui/Button';

export default function AICopilotSettingsScreen() {
  return AI_AVAILABLE ? <EnabledAICopilotSettingsScreen /> : <AIUnavailable />;
}

function EnabledAICopilotSettingsScreen() {
  const { config, isLoading, save, clear } = useAICopilotConfig();
  const [baseUrl, setBaseUrl] = useState(DEFAULT_AI_BASE_URL);
  const [provider, setProvider] = useState<NonNullable<AICopilotConfig['provider']>>('openai');
  const action = useAsyncAction();
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(DEFAULT_AI_MODEL);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setProvider(config.provider ?? 'custom');
      setBaseUrl(config.baseUrl);
      setApiKey(config.apiKey);
      setModel(config.model);
    }
  }, [config]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await chatCompletion(
      { provider, baseUrl: baseUrl.trim(), apiKey: apiKey.trim(), model: model.trim() },
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
    try {
      await save({ provider, baseUrl: baseUrl.trim(), apiKey: apiKey.trim(), model: model.trim() });
      router.replace('/ai-copilot');
    } finally { setSaving(false); }
  };

  if (isLoading) return null;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader title="AI Copilot" />
      <ScrollView contentContainerClassName="p-4 gap-4">
        <Card className="p-4 gap-2">
          <Text className="text-sm text-gray-400">
            API usage is billed by your provider, separately from ChatGPT or Claude subscriptions.
            Keys and messages go directly to the selected endpoint, not TRACE's servers.
            {Platform.OS === 'web' ? ' Browser keys remain in memory until reload. Use only a trusted browser.' : ' Keys are saved in secure device storage.'}
          </Text>
        </Card>
        <Select value={provider} options={Object.entries(AI_PROVIDERS).map(([value, preset]) => ({ value: value as NonNullable<AICopilotConfig['provider']>, label: preset.label }))}
          onChange={(value) => { setProvider(value); setBaseUrl(AI_PROVIDERS[value].baseUrl); setModel(AI_PROVIDERS[value].model); setApiKey(''); setTestResult(null); }} />
        {action.error && <Text className="text-red-400">{action.error}</Text>}

        <View className="gap-2">
          <Text className="text-xs text-gray-500 uppercase tracking-wide">Base URL</Text>
          <TextInput
            value={baseUrl}
            editable={provider === 'custom' && !action.pending}
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
            placeholder="Provider API key"
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
            placeholder="Model ID from your provider"
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
            onPress={() => void action.run(handleTest)}
            loading={testing}
            disabled={action.pending || !baseUrl.trim() || !apiKey.trim() || !model.trim()}
          >
            Test connection
          </Button>
          <Button
            fullWidth
            onPress={() => void action.run(handleSave)}
            loading={saving}
            disabled={action.pending || !baseUrl.trim() || !apiKey.trim() || !model.trim()}
          >
            Save
          </Button>
          {config && (
            <Button variant="secondary" fullWidth disabled={action.pending} onPress={() => void action.run(async () => { await clear(); setApiKey(''); setTestResult(null); })}>
              Remove key from this device
            </Button>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
