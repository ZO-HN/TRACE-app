import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import ScreenHeader from '../../src/components/ui/ScreenHeader';
import { findTool } from '../../src/lib/calculators/registry';
import { TOOL_COMPONENTS } from '../../src/components/tools/calculators';

export default function ToolScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const tool = findTool(slug);
  const Calculator = slug ? TOOL_COMPONENTS[slug] : undefined;

  if (!tool || !Calculator) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <ScreenHeader title="Calculator" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-sm text-gray-500 text-center">That calculator doesn't exist.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader title={tool.title} />
      <ScrollView contentContainerClassName="p-4 gap-4">
        <Text className="text-sm text-gray-400">{tool.description}</Text>
        <Calculator />
      </ScrollView>
    </SafeAreaView>
  );
}
