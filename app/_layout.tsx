import '../global.css';

import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useTraceUser } from '../src/hooks/useTraceUser';
import { useOutboxSync } from '../src/hooks/useOutboxSync';
import { usePushNotifications } from '../src/hooks/usePushNotifications';
import { isSupabaseConfigured, supabase } from '../src/lib/supabase';
import AuthScreen from '../src/components/auth/AuthScreen';
import ChooseCoachScreen from '../src/components/auth/ChooseCoachScreen';
import { TraceUserProvider } from '../src/context/TraceUserContext';
import { isDevPreview, previewUser } from '../src/lib/devPreview';

function PreviewGate({ children }: { children: React.ReactNode }) {
  useOutboxSync(null);
  return <TraceUserProvider value={previewUser}>
    <View className="flex-1 bg-background">
      <SafeAreaView edges={['top']} className="bg-surface px-4 py-2">
        <Text className="text-sm text-primary">Local preview - cloud features require login</Text>
      </SafeAreaView>
      {children}
    </View>
  </TraceUserProvider>;
}

function ConfigurationError() {
  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
      <Ionicons name="cloud-offline-outline" size={32} color="#F87171" />
      <Text className="text-xl font-bold text-white mt-4 mb-2 text-center">TRACE is not configured</Text>
      <Text className="text-sm text-gray-400 text-center">
        This build is missing its Supabase URL or anonymous key. Install a correctly configured build or contact support.
      </Text>
    </SafeAreaView>
  );
}

// Auth gate lives here, not in app/(tabs)/_layout.tsx: bodyweight/settings,
// leaderboards/*, workouts/*, nutrition/add-meal are Stack.Screen siblings
// of (tabs), not its descendants — a provider mounted only inside (tabs)
// would never wrap them, and useTraceUserContext() there would throw.
// Gating the whole Stack here means every screen shares one profile fetch.
function Gate({ children }: { children: React.ReactNode }) {
  const traceUser = useTraceUser();
  const { isLoading, error, user, profile } = traceUser;

  // Keep the offline outbox flushing to Supabase whenever connectivity
  // returns. Mounted unconditionally so it hydrates even while signed out.
  const sync = useOutboxSync(profile?.role === 'trainee' ? user?.id ?? null : null);
  usePushNotifications(profile?.id ?? null);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#4ADE80" />
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

  // Blocks everything below this point — no tabs, no dashboard reads — until
  // the trainee has a coach.
  if (!profile.coach_id) {
    return <ChooseCoachScreen onLinked={() => void traceUser.refetchProfile().catch(() => undefined)} />;
  }

  return <TraceUserProvider value={traceUser}>
    <View className="flex-1 bg-background">
      {(sync.pendingCount > 0 || sync.error) && <SafeAreaView edges={['top']} className="bg-surface px-4 py-2">
        <Text className="text-sm text-white">{sync.isSyncing ? 'Syncing saved logs…' : `${sync.pendingCount} saved logs waiting to sync`}</Text>
        {(sync.error || sync.failedCount > 0) && <Text className="text-xs text-red-400">{sync.error ?? 'Some logs could not sync. Your data is still saved on this device.'}</Text>}
        <Pressable onPress={sync.retry} disabled={sync.isSyncing}><Text className="text-primary">Retry sync</Text></Pressable>
      </SafeAreaView>}
      {children}
    </View>
  </TraceUserProvider>;
}

export default function RootLayout() {
  const AppGate = isDevPreview ? PreviewGate : Gate;
  if (!isSupabaseConfigured && !isDevPreview) {
    return (
      <SafeAreaProvider>
        <ConfigurationError />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AppGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="history" options={{ presentation: 'card' }} />
          <Stack.Screen name="notifications" options={{ presentation: 'card' }} />
          <Stack.Screen name="bodyweight/settings" options={{ presentation: 'card' }} />
          <Stack.Screen name="bodyweight/history" options={{ presentation: 'card' }} />
          <Stack.Screen name="cardio/index" options={{ presentation: 'card' }} />
          <Stack.Screen name="cardio/select" options={{ presentation: 'card' }} />
          <Stack.Screen name="cardio/new" options={{ presentation: 'card' }} />
          <Stack.Screen name="cardio/[exerciseId]" options={{ presentation: 'card' }} />
          <Stack.Screen name="sleep/index" options={{ presentation: 'card' }} />
          <Stack.Screen name="form-checks/index" options={{ presentation: 'card' }} />
          <Stack.Screen name="form-checks/new" options={{ presentation: 'card' }} />
          <Stack.Screen name="leaderboards/[exerciseId]" options={{ presentation: 'card' }} />
          <Stack.Screen name="workouts/folders/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="nutrition/add-meal" options={{ presentation: 'modal' }} />
        </Stack>
      </AppGate>
    </SafeAreaProvider>
  );
}
