import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTraceUserContext } from '../../src/context/TraceUserContext';
import ChatScreen from '../../src/components/ChatScreen';

export default function MessagesTab() {
  const { profile } = useTraceUserContext();
  if (!profile!.coach_id) {
    return (
      <View className="flex-1 items-center justify-center px-6 gap-3">
        <Ionicons name="chatbubble-outline" size={32} color="#6B7280" />
        <Text className="text-sm text-gray-500 text-center">
          Not enrolled with a coach yet — no one to message.
        </Text>
      </View>
    );
  }
  return <ChatScreen myId={profile!.id} coachId={profile!.coach_id} />;
}
