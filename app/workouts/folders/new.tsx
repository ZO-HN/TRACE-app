import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTraceUserContext } from '../../../src/context/TraceUserContext';
import { useWorkoutFolders } from '../../../src/hooks/useWorkoutFolders';
import Card from '../../../src/components/ui/Card';
import Button from '../../../src/components/ui/Button';
import { useAsyncAction } from '../../../src/hooks/useAsyncAction';

export default function NewFolderModal() {
  const { profile } = useTraceUserContext();
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const id = typeof params.id === 'string' ? params.id : undefined;
  const { createFolder, renameFolder } = useWorkoutFolders(profile!.id);
  const [name, setName] = useState(typeof params.name === 'string' ? params.name : '');
  const { pending: submitting, error, run } = useAsyncAction();

  const handleCreate = () => run(async () => {
    const result = await (id ? renameFolder(id, name) : createFolder(name));
    if (result.ok) {
      router.back();
    } else {
      throw new Error(result.error ?? 'Could not create folder.');
    }
  });

  return (
    <SafeAreaView className="flex-1 bg-black/60 justify-center px-8">
      <Card className="p-5 gap-4">
        <Text className="text-lg font-bold text-white">{id ? 'Rename Folder' : 'New Folder'}</Text>
        <Text className="text-sm text-gray-400">Enter a name for the new folder</Text>
        <TextInput
          accessibilityLabel="Folder name"
          value={name}
          onChangeText={setName}
          placeholder="Folder name"
          placeholderTextColor="#6B7280"
          autoFocus
          maxLength={80}
          editable={!submitting}
          className="h-11 bg-background border border-border rounded-xl px-3 text-white"
        />
        {error && <Text accessibilityRole="alert" className="text-xs text-red-400">{error}</Text>}
        <View className="flex-row justify-end gap-4">
          <Pressable accessibilityRole="button" disabled={submitting} onPress={() => router.back()} className="px-3 py-2 min-h-11 justify-center">
            <Text className="text-gray-400 font-medium">Cancel</Text>
          </Pressable>
          <Button size="sm" onPress={() => void handleCreate()} loading={submitting} disabled={!name.trim()}>
            {id ? 'Save' : 'Create'}
          </Button>
        </View>
      </Card>
    </SafeAreaView>
  );
}
