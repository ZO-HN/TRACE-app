import '../global.css';

import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="bodyweight/settings" options={{ presentation: 'card' }} />
        <Stack.Screen name="bodyweight/history" options={{ presentation: 'card' }} />
        <Stack.Screen name="leaderboards/index" options={{ presentation: 'card' }} />
        <Stack.Screen name="leaderboards/[exerciseId]" options={{ presentation: 'card' }} />
        <Stack.Screen name="workouts/index" options={{ presentation: 'card' }} />
        <Stack.Screen name="workouts/folders/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="nutrition/add-meal" options={{ presentation: 'modal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
