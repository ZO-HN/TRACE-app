import '../global.css';

import { ActivityIndicator, Pressable, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useTraceUser } from '../src/hooks/useTraceUser';
import { useOutboxSync } from '../src/hooks/useOutboxSync';
import { usePushNotifications } from '../src/hooks/usePushNotifications';
import { supabase } from '../src/lib/supabase';
import AuthScreen from '../src/components/auth/AuthScreen';
import ChooseCoachScreen from '../src/components/auth/ChooseCoachScreen';
import { TraceUserProvider } from '../src/context/TraceUserContext';

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
  useOutboxSync();
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
  // the trainee has a coach. Only applies to trainees; a coach account
  // logging in here (shouldn't normally happen) isn't gated by this.
  if (profile.role === 'trainee' && !profile.coach_id) {
    return <ChooseCoachScreen onLinked={() => void traceUser.refetchProfile()} />;
  }

  return <TraceUserProvider value={traceUser}>{children}</TraceUserProvider>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Gate>
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
      </Gate>
    </SafeAreaProvider>
  );
}
