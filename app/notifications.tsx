import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../src/components/ui/ScreenHeader';

export default function NotificationsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader title="Notifications" />
      <View className="flex-1 items-center justify-center px-6 gap-3">
        <View className="w-16 h-16 rounded-full bg-surface items-center justify-center">
          <Ionicons name="notifications-outline" size={28} color="#6B7280" />
        </View>
        <Text className="text-lg font-bold text-white">No notifications</Text>
        <Text className="text-sm text-gray-500 text-center">
          We'll notify you when there's something new to see here
        </Text>
      </View>
    </SafeAreaView>
  );
}
