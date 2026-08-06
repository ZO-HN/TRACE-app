import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function EmptyTabState({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}) {
  return (
    <View className="flex-1 items-center justify-center px-6 gap-2 py-16">
      <Ionicons name={icon} size={28} color="#6B7280" />
      <Text className="text-white font-semibold">{title}</Text>
      <Text className="text-sm text-gray-500 text-center">{description}</Text>
    </View>
  );
}
