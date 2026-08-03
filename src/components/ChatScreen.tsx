import { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useDirectChat } from '../hooks/useDirectChat';
import Button from './ui/Button';

// The trainee's coach's name isn't readable here — profiles RLS only lets a
// trainee read their own row, not their coach's (only coach -> trainee is
// allowed). "Your Coach" is a static label rather than a name lookup that
// would need a new policy; matches the label the coach dashboard repo used
// for the same relationship before the two apps split.
export default function ChatScreen({ myId, coachId }: { myId: string; coachId: string }) {
  const { messages, send, error } = useDirectChat(myId, coachId);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      await send(draft);
      setDraft('');
    } catch {
      // error state surfaced below; draft kept for retry
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-row items-center gap-2.5 px-4 py-3 border-b border-border">
        <View className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 items-center justify-center">
          <Ionicons name="person-outline" size={16} color="#3B82F6" />
        </View>
        <Text className="text-white font-semibold">Your Coach</Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerClassName="p-4 gap-2"
        renderItem={({ item, index }) => (
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 200, delay: Math.min(index, 6) * 20 }}
            className={`max-w-[80%] rounded-2xl px-3 py-2 ${
              item.sender_id === myId
                ? 'self-end bg-primary'
                : 'self-start bg-surface border border-border'
            }`}
          >
            <Text className={item.sender_id === myId ? 'text-white' : 'text-gray-200'}>
              {item.content}
            </Text>
          </MotiView>
        )}
        ListEmptyComponent={
          <View className="items-center py-12 gap-2">
            <Ionicons name="chatbubble-ellipses-outline" size={28} color="#6B7280" />
            <Text className="text-sm text-gray-500">No messages yet.</Text>
          </View>
        }
      />

      {error && (
        <View className="flex-row items-center gap-1.5 px-4 py-1">
          <Ionicons name="alert-circle-outline" size={13} color="#F87171" />
          <Text className="text-xs text-red-400">{error}</Text>
        </View>
      )}

      <View className="flex-row items-center gap-2 p-3 border-t border-border">
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Message your coach…"
          placeholderTextColor="#6B7280"
          className="flex-1 h-11 bg-surface border border-border rounded-xl px-3 text-white"
        />
        <Button onPress={() => void handleSend()} loading={sending} disabled={!draft.trim()}>
          Send
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}
