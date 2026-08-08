import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Slot, useRouter, useSegments } from 'expo-router';
import TabBar, { type TabDef } from '../../src/components/ui/TabBar';
import TopBar from '../../src/components/ui/TopBar';

type Tab = 'index' | 'nutrition' | 'progress' | 'stats' | 'messages';

const TABS: TabDef<Tab>[] = [
  { key: 'index', label: 'Log', icon: 'barbell-outline', activeIcon: 'barbell' },
  { key: 'nutrition', label: 'Nutrition', icon: 'restaurant-outline', activeIcon: 'restaurant' },
  { key: 'progress', label: 'Progress', icon: 'body-outline', activeIcon: 'body' },
  { key: 'stats', label: 'Stats', icon: 'bar-chart-outline', activeIcon: 'bar-chart' },
  { key: 'messages', label: 'Messages', icon: 'chatbubble-outline', activeIcon: 'chatbubble' },
];

// The auth/loading gate and TraceUserProvider live in the root app/_layout.tsx
// now — this layout can assume a signed-in profile is already available.
export default function TabsLayout() {
  const router = useRouter();
  const segments = useSegments() as unknown as string[];
  // segments looks like ["(tabs)"] for index, or ["(tabs)", "nutrition"] etc.
  // "session" (the active-workout screen) isn't its own tab — it's reached
  // from the Log tab's Dashboard, so it should still highlight "Log".
  const rawSegment = segments[1] as Tab | 'session' | undefined;
  const active: Tab = rawSegment === 'session' ? 'index' : (rawSegment ?? 'index');

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <TopBar />

      <View className="flex-1">
        <Slot />
      </View>

      <TabBar
        tabs={TABS}
        active={active}
        onChange={(tab) => router.push(tab === 'index' ? '/(tabs)' : (`/(tabs)/${tab}` as never))}
      />
    </SafeAreaView>
  );
}
