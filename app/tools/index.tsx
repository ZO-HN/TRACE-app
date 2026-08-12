import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import ScreenHeader from '../../src/components/ui/ScreenHeader';
import { TOOLS } from '../../src/lib/calculators/registry';

export default function ToolsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader title="Calculators" />
      <ScrollView contentContainerClassName="p-4 gap-3">
        {TOOLS.map((tool) => (
          <Pressable
            key={tool.slug}
            onPress={() => router.push(`/tools/${tool.slug}`)}
            className="flex-row items-center gap-4 bg-surface border border-border rounded-xl px-4 py-3.5"
          >
            <View className="w-11 h-11 rounded-full bg-primary/15 items-center justify-center">
              <Ionicons name={tool.icon} size={20} color="#4ADE80" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold">{tool.title}</Text>
              <Text className="text-xs text-gray-500 mt-0.5">{tool.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6B7280" />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
