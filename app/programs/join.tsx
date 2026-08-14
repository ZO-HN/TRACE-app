import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useJoinProgram } from '../../src/hooks/useJoinProgram';
import ScreenHeader from '../../src/components/ui/ScreenHeader';
import Button from '../../src/components/ui/Button';

export default function JoinProgramScreen() {
  const { join, isJoining } = useJoinProgram();
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    setError(null);
    const result = await join(token);
    if (result.ok && result.programId) {
      router.replace(`/programs/${result.programId}`);
    } else {
      setError(result.error ?? 'Could not join that program.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader title="Join a Program" />
      <View className="p-4 gap-4">
        <Text className="text-sm text-gray-400">
          Paste the share code someone sent you. You'll get your own independent copy to follow and customize.
        </Text>
        <TextInput
          value={token}
          onChangeText={setToken}
          placeholder="Share code"
          placeholderTextColor="#6B7280"
          autoCapitalize="none"
          autoCorrect={false}
          className="bg-surface border border-border rounded-xl px-4 py-3 text-white"
        />
        {error && <Text className="text-xs text-red-400">{error}</Text>}
        <Button fullWidth size="lg" onPress={() => void handleJoin()} loading={isJoining} disabled={!token.trim()}>
          Join program
        </Button>
      </View>
    </SafeAreaView>
  );
}
