import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Slot, useRouter, useSegments } from 'expo-router';
import TabBar, { type TabDef } from '../../src/components/ui/TabBar';
import TopBar from '../../src/components/ui/TopBar';

// "messages" is intentionally not one of these — it's reached via the top
// bar's chat icon instead (TopBar.tsx), matching the reference's chat/notif
// icons living up top rather than duplicated in the bottom nav.
type Tab = 'index' | 'nutrition' | 'stats';

const TABS: TabDef<Tab>[] = [
  { key: 'index', label: 'Log', icon: 'barbell-outline', activeIcon: 'barbell' },
  { key: 'nutrition', label: 'Nutrition', icon: 'restaurant-outline', activeIcon: 'restaurant' },
  { key: 'stats', label: 'Stats', icon: 'bar-chart-outline', activeIcon: 'bar-chart' },
];

// The auth/loading gate and TraceUserProvider live in the root app/_layout.tsx
// now — this layout can assume a signed-in profile is already available.
export default function TabsLayout() {
  const router = useRouter();
  const segments = useSegments() as unknown as string[];
  // segments looks like ["(tabs)"] for index, or ["(tabs)", "nutrition"] etc.
  // "session" (the active-workout screen) isn't its own tab — it's reached
  // from the Log tab's Dashboard, so it should still highlight "Log". Any
  // other non-tab segment (e.g. "messages", reached via the top bar's chat
  // icon) just won't match a tab key, leaving the bar unhighlighted.
  const rawSegment = segments[1];
  const active = rawSegment === 'session' ? 'index' : (rawSegment ?? 'index');

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
