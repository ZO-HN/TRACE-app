import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../ui/ScreenHeader';
import { AI_UNAVAILABLE_REASON } from '../../lib/ai/availability';

export default function AIUnavailable() {
  return <SafeAreaView className="flex-1 bg-background" edges={['top','bottom']}>
    <ScreenHeader title="AI unavailable in V1" />
    <View className="p-6 gap-3"><Text className="text-lg font-semibold text-white">Use your coach’s plan and manual logging</Text><Text className="text-gray-400">{AI_UNAVAILABLE_REASON}</Text><Text className="text-sm text-gray-400">This version does not ask for an API key or send health entries, photos, audio, or chat prompts to an AI provider.</Text></View>
  </SafeAreaView>;
}
