import { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useDirectChat } from '../hooks/useDirectChat';

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
      <View className="px-4 py-3 border-b border-border">
        <Text className="text-white font-semibold">Your Coach</Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerClassName="p-4 gap-2"
        renderItem={({ item }) => (
          <View
            className={`max-w-[80%] rounded-xl px-3 py-2 ${
              item.sender_id === myId
                ? 'self-end bg-primary'
                : 'self-start bg-surface border border-border'
            }`}
          >
            <Text className={item.sender_id === myId ? 'text-white' : 'text-gray-200'}>
              {item.content}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text className="text-sm text-gray-500 text-center py-8">No messages yet.</Text>
        }
      />

      {error && <Text className="px-4 py-1 text-xs text-red-400">{error}</Text>}

      <View className="flex-row gap-2 p-3 border-t border-border">
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Message your coach…"
          placeholderTextColor="#6B7280"
          className="flex-1 h-11 bg-surface border border-border rounded-lg px-3 text-white"
        />
        <Pressable
          onPress={() => void handleSend()}
          disabled={sending || !draft.trim()}
          className="h-11 px-4 bg-primary rounded-lg items-center justify-center disabled:opacity-50"
        >
          <Text className="text-white font-semibold">Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
