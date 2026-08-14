import '../global.css';

import { ActivityIndicator, Pressable, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useTraceUser } from '../src/hooks/useTraceUser';
import { useOutboxSync } from '../src/hooks/useOutboxSync';
import { usePushNotifications } from '../src/hooks/usePushNotifications';
import { supabase } from '../src/lib/supabase';
import AuthScreen from '../src/components/auth/AuthScreen';
import ChooseCoachScreen from '../src/components/auth/ChooseCoachScreen';
import { TraceUserProvider } from '../src/context/TraceUserContext';

// Google sign-in is account-level, shared across this Supabase project —
// it has no concept of "which app" a user came from. A coach who signs
// into this trainee app with the same Google account they use on the
// dashboard resolves to their existing coach profile (matched by email),
// not a new trainee account. Without this screen, that profile fell
// straight through into the full trainee UI: workout/nutrition/bodyweight
// writes would silently succeed under the coach's own user_id (polluting
// their coach account with trainee-style data), while Form Checks and
// Check-ins would fail outright (their BEFORE INSERT triggers require
// profiles.coach_id, which is null for a coach). Block it here instead,
// before any of that can happen.
function CoachAccountBlocked() {
  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
      <Ionicons name="business-outline" size={32} color="#6B7280" />
      <Text className="text-xl font-bold text-white mt-4 mb-2 text-center">This is a coach account</Text>
      <Text className="text-sm text-gray-400 text-center mb-6">
        TRACE for trainees doesn't support coach accounts. Use the coach dashboard instead.
      </Text>
      <Pressable onPress={() => void supabase.auth.signOut()}>
        <Text className="text-primary font-medium">Sign out</Text>
      </Pressable>
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

  if (profile.role === 'coach') {
    return <CoachAccountBlocked />;
  }

  // Blocks everything below this point — no tabs, no dashboard reads — until
  // the trainee has a coach.
  if (!profile.coach_id) {
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
