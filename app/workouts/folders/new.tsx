import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTraceUserContext } from '../../../src/context/TraceUserContext';
import { useWorkoutFolders } from '../../../src/hooks/useWorkoutFolders';
import Card from '../../../src/components/ui/Card';
import Button from '../../../src/components/ui/Button';

export default function NewFolderModal() {
  const { profile } = useTraceUserContext();
  const { createFolder } = useWorkoutFolders(profile!.id);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setSubmitting(true);
    setError(null);
    const result = await createFolder(name);
    setSubmitting(false);
    if (result.ok) {
      router.back();
    } else {
      setError(result.error ?? 'Could not create folder.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black/60 justify-center px-8">
      <Card className="p-5 gap-4">
        <Text className="text-lg font-bold text-white">New Folder</Text>
        <Text className="text-sm text-gray-400">Enter a name for the new folder</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Folder name"
          placeholderTextColor="#6B7280"
          autoFocus
          className="h-11 bg-background border border-border rounded-xl px-3 text-white"
        />
        {error && <Text className="text-xs text-red-400">{error}</Text>}
        <View className="flex-row justify-end gap-4">
          <Pressable onPress={() => router.back()} className="px-3 py-2">
            <Text className="text-gray-400 font-medium">Cancel</Text>
          </Pressable>
          <Button size="sm" onPress={() => void handleCreate()} loading={submitting} disabled={!name.trim()}>
            Create
          </Button>
        </View>
      </Card>
    </SafeAreaView>
  );
}
