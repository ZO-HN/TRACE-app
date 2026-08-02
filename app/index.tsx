import { Text, View } from 'react-native';

// Placeholder home screen — the real signed-out/signed-in split and the
// offline-capable lift logger land in Phase 1. This just proves the Expo
// Router + NativeWind scaffold renders end to end.
export default function Home() {
  return (
    <View className="flex-1 items-center justify-center bg-black px-6">
      <Text className="text-2xl font-bold text-white mb-2">TRACE</Text>
      <Text className="text-sm text-gray-400 text-center">
        Client app scaffold — Phase 0. Logging, offline outbox, and auth land
        in Phase 1.
      </Text>
    </View>
  );
}
