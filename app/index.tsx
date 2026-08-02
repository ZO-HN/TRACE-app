import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTraceUser } from '../src/hooks/useTraceUser';
import { useOutboxSync } from '../src/hooks/useOutboxSync';
import { supabase } from '../src/lib/supabase';
import AuthScreen from '../src/components/auth/AuthScreen';
import GymLogger from '../src/components/GymLogger';
import SessionSummaries from '../src/components/SessionSummaries';

export default function Home() {
  const { isLoading, error, user, profile } = useTraceUser();

  // Keep the offline outbox flushing to Supabase whenever connectivity
  // returns. Mounted unconditionally so it hydrates even while signed out.
  useOutboxSync();

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

      <GymLogger
        userId={profile.id}
        footer={
          <View className="px-2">
            <SessionSummaries userId={profile.id} />
          </View>
        }
      />
    </SafeAreaView>
  );
}
