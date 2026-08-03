import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

type Tab = 'log' | 'nutrition' | 'progress' | 'stats' | 'messages';

const TABS: { key: Tab; label: string }[] = [
  { key: 'log', label: 'Log' },
  { key: 'nutrition', label: 'Nutrition' },
  { key: 'progress', label: 'Progress' },
  { key: 'stats', label: 'Stats' },
  { key: 'messages', label: 'Messages' },
];

function TabBar({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  return (
    <View className="flex-row border-t border-border bg-surface">
      {TABS.map((tab) => (
        <Pressable
          key={tab.key}
          onPress={() => onChange(tab.key)}
          className="flex-1 py-3 items-center"
        >
          <Text
            className={`text-sm font-medium ${
              active === tab.key ? 'text-primary' : 'text-gray-500'
            }`}
          >
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
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
        <Text className="text-white font-semibold">
          {profile.first_name} {profile.last_name}
        </Text>
        <Pressable onPress={() => void supabase.auth.signOut()}>
          <Text className="text-gray-500 text-sm">Sign out</Text>
        </Pressable>
      </View>

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
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-sm text-gray-500 text-center">
              Not enrolled with a coach yet — no one to message.
            </Text>
          </View>
        ))}

      <TabBar active={tab} onChange={setTab} />
    </SafeAreaView>
  );
}
