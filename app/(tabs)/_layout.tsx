import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Slot, useRouter, useSegments } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import TabBar, { type TabDef } from '../../src/components/ui/TabBar';
import { useTraceUserContext } from '../../src/context/TraceUserContext';

type Tab = 'index' | 'nutrition' | 'progress' | 'stats' | 'messages';

const TABS: TabDef<Tab>[] = [
  { key: 'index', label: 'Log', icon: 'barbell-outline', activeIcon: 'barbell' },
  { key: 'nutrition', label: 'Nutrition', icon: 'restaurant-outline', activeIcon: 'restaurant' },
  { key: 'progress', label: 'Progress', icon: 'body-outline', activeIcon: 'body' },
  { key: 'stats', label: 'Stats', icon: 'bar-chart-outline', activeIcon: 'bar-chart' },
  { key: 'messages', label: 'Messages', icon: 'chatbubble-outline', activeIcon: 'chatbubble' },
];

function Avatar({ firstName, lastName }: { firstName: string; lastName: string }) {
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
  return (
    <View className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 items-center justify-center">
      <Text className="text-primary text-xs font-bold">{initials}</Text>
    </View>
  );
}

// The auth/loading gate and TraceUserProvider live in the root app/_layout.tsx
// now — this layout can assume a signed-in profile is already available.
export default function TabsLayout() {
  const { profile } = useTraceUserContext();
  const router = useRouter();
  const segments = useSegments() as unknown as string[];
  // segments looks like ["(tabs)"] for index, or ["(tabs)", "nutrition"] etc.
  const active = (segments[1] as Tab | undefined) ?? 'index';

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <View className="flex-row items-center gap-3">
          <Avatar firstName={profile!.first_name} lastName={profile!.last_name} />
          <Text className="text-white font-semibold">
            {profile!.first_name} {profile!.last_name}
          </Text>
        </View>
        <Pressable
          onPress={() => void supabase.auth.signOut()}
          className="flex-row items-center gap-1 px-2 py-1"
        >
          <Ionicons name="log-out-outline" size={16} color="#6B7280" />
          <Text className="text-gray-500 text-sm">Sign out</Text>
        </Pressable>
      </View>

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
