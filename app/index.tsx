import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AnimatePresence, MotiView } from 'moti';
import { useTraceUser } from '../src/hooks/useTraceUser';
import { useOutboxSync } from '../src/hooks/useOutboxSync';
import { usePushNotifications } from '../src/hooks/usePushNotifications';
import { supabase } from '../src/lib/supabase';
import AuthScreen from '../src/components/auth/AuthScreen';
import GymLogger from '../src/components/GymLogger';
import SessionSummaries from '../src/components/SessionSummaries';
import NutritionLogger from '../src/components/NutritionLogger';
import BodyweightLogger from '../src/components/BodyweightLogger';
import StatsScreen from '../src/components/StatsScreen';
import ChatScreen from '../src/components/ChatScreen';
import TabBar, { type TabDef } from '../src/components/ui/TabBar';

type Tab = 'log' | 'nutrition' | 'progress' | 'stats' | 'messages';

const TABS: TabDef<Tab>[] = [
  { key: 'log', label: 'Log', icon: 'barbell-outline', activeIcon: 'barbell' },
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

function FadeSwitch({ tabKey, children }: { tabKey: string; children: ReactNode }) {
  return (
    <AnimatePresence exitBeforeEnter>
      <MotiView
        key={tabKey}
        className="flex-1"
        from={{ opacity: 0, translateY: 6 }}
        animate={{ opacity: 1, translateY: 0 }}
        exit={{ opacity: 0 }}
        transition={{ type: 'timing', duration: 200 }}
      >
        {children}
      </MotiView>
    </AnimatePresence>
  );
}

export default function Home() {
  const { isLoading, error, user, profile } = useTraceUser();
  const [tab, setTab] = useState<Tab>('log');

  // Keep the offline outbox flushing to Supabase whenever connectivity
  // returns. Mounted unconditionally so it hydrates even while signed out.
  useOutboxSync();
  usePushNotifications(profile?.id ?? null);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#3B82F6" />
      </SafeAreaView>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (error || !profile) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-xl font-bold text-white mb-2">Session error</Text>
        <Text className="text-sm text-gray-400 text-center mb-4">
          {error?.message ?? 'Could not load your profile.'}
        </Text>
        <Pressable onPress={() => void supabase.auth.signOut()}>
          <Text className="text-primary font-medium">Sign out and try again</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <View className="flex-row items-center gap-3">
          <Avatar firstName={profile.first_name} lastName={profile.last_name} />
          <Text className="text-white font-semibold">
            {profile.first_name} {profile.last_name}
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

      <FadeSwitch tabKey={tab}>
        {tab === 'log' && <GymLogger userId={profile.id} />}

        {tab === 'nutrition' && (
          <ScrollView className="flex-1" contentContainerClassName="px-4 py-6">
            <NutritionLogger userId={profile.id} />
          </ScrollView>
        )}

        {tab === 'progress' && (
          <ScrollView className="flex-1" contentContainerClassName="px-4 py-6 gap-8">
            <BodyweightLogger userId={profile.id} />
            <SessionSummaries userId={profile.id} />
          </ScrollView>
        )}

        {tab === 'stats' && (
          <ScrollView className="flex-1" contentContainerClassName="px-4 py-6">
            <StatsScreen userId={profile.id} />
          </ScrollView>
        )}

        {tab === 'messages' &&
          (profile.coach_id ? (
            <ChatScreen myId={profile.id} coachId={profile.coach_id} />
          ) : (
            <View className="flex-1 items-center justify-center px-6 gap-3">
              <Ionicons name="chatbubble-outline" size={32} color="#6B7280" />
              <Text className="text-sm text-gray-500 text-center">
                Not enrolled with a coach yet — no one to message.
              </Text>
            </View>
          ))}
      </FadeSwitch>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />
    </SafeAreaView>
  );
}
