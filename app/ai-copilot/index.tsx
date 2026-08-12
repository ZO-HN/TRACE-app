// AI Copilot chat — the BYO-key replacement for a built-in "Roscoe"-style
// assistant. Session-local only: no chat history table, no server
// involvement beyond the user's own configured endpoint. If no key is
// configured yet, routes to /ai-copilot/settings first.

import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAICopilotConfig } from '../../src/hooks/useAICopilotConfig';
import { chatCompletion, type ChatMessage } from '../../src/lib/ai/client';
import ScreenHeader from '../../src/components/ui/ScreenHeader';
import Button from '../../src/components/ui/Button';

const SYSTEM_PROMPT: ChatMessage = {
  role: 'system',
  content:
    'You are a fitness and nutrition assistant inside a workout-tracking app. Be concise. You are not the user\'s coach — their coach programs their training; defer to the coach on programming decisions and suggest they check with their coach when relevant.',
};

export default function AICopilotChatScreen() {
  const { config, isConfigured, isLoading } = useAICopilotConfig();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!isLoading && !isConfigured) {
      router.replace('/ai-copilot/settings');
    }
  }, [isLoading, isConfigured]);

  const send = async () => {
    const text = input.trim();
    if (!text || !config) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    setError(null);

    const result = await chatCompletion(config, [SYSTEM_PROMPT, ...nextMessages]);
    setSending(false);

    if (result.ok) {
      setMessages((cur) => [...cur, { role: 'assistant', content: result.content }]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    } else {
      setError(result.error);
    }
  };

  if (isLoading || !isConfigured) return null;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader
        title="AI Copilot"
        right={
          <Pressable onPress={() => router.push('/ai-copilot/settings')}>
            <Ionicons name="settings-outline" size={20} color="#9CA3AF" />
          </Pressable>
        }
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView ref={scrollRef} contentContainerClassName="p-4 gap-3" className="flex-1">
          {messages.length === 0 && (
            <Text className="text-sm text-gray-500 text-center mt-8">
              Ask about your training, nutrition, or general fitness questions. This uses your
              own configured API key — see the gear icon above.
            </Text>
          )}
          {messages.map((m, i) => (
            <View
              key={i}
              className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                m.role === 'user' ? 'self-end bg-primary/20' : 'self-start bg-surface border border-border'
              }`}
            >
              <Text className="text-white text-sm">{typeof m.content === 'string' ? m.content : ''}</Text>
            </View>
          ))}
          {error && <Text className="text-xs text-red-400 text-center">{error}</Text>}
        </ScrollView>

        <View className="flex-row items-center gap-2 p-3 border-t border-border">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask something…"
            placeholderTextColor="#6B7280"
            className="flex-1 h-11 bg-surface border border-border rounded-xl px-3 text-white"
            editable={!sending}
            onSubmitEditing={() => void send()}
          />
          <Button size="sm" onPress={() => void send()} loading={sending} disabled={!input.trim()}>
            Send
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
