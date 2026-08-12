import { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTraceUserContext } from '../../src/context/TraceUserContext';
import { useFormChecks } from '../../src/hooks/useFormChecks';
import { useMediaUpload } from '../../src/hooks/useMediaUpload';
import { useExerciseCatalog } from '../../src/hooks/useExerciseCatalog';
import type { RNFile } from '../../src/lib/storage/uploadMedia';
import ScreenHeader from '../../src/components/ui/ScreenHeader';
import Select from '../../src/components/ui/Select';
import Button from '../../src/components/ui/Button';

const NO_EXERCISE = 'none';

export default function NewFormCheckScreen() {
  const { profile } = useTraceUserContext();
  const { submit } = useFormChecks(profile!.id);
  const { rows: exercises, isLoaded } = useExerciseCatalog();
  const media = useMediaUpload();

  const [exerciseId, setExerciseId] = useState(NO_EXERCISE);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickVideo = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: 60,
      quality: 0.6,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setVideoUri(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!videoUri) return;
    setSubmitting(true);
    setError(null);
    try {
      const info = await FileSystem.getInfoAsync(videoUri);
      const file: RNFile = {
        uri: videoUri,
        name: `form-check-${Date.now()}.mp4`,
        type: 'video/mp4',
        size: info.exists ? (info.size ?? 0) : 0,
      };
      const { key } = await media.upload(file, 'form-video');
      const result = await submit(key, exerciseId === NO_EXERCISE ? null : exerciseId);
      if (result.ok) {
        router.replace('/form-checks');
      } else {
        setError(result.error ?? 'Could not submit that form check.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader title="New Form Check" />

      <View className="p-4 gap-4">
        <View className="gap-2">
          <Text className="text-sm text-gray-400">Exercise (optional)</Text>
          <Select
            value={exerciseId}
            options={[
              { value: NO_EXERCISE, label: 'No exercise' },
              ...(isLoaded ? exercises.map((e) => ({ value: e.id, label: e.name })) : []),
            ]}
            onChange={setExerciseId}
          />
        </View>

        <View className="gap-2">
          <Text className="text-sm text-gray-400">Video</Text>
          <Button
            variant="secondary"
            fullWidth
            onPress={() => void pickVideo()}
            icon={<Ionicons name="videocam-outline" size={16} color="#E5E7EB" />}
          >
            {videoUri ? 'Retake video' : 'Record video'}
          </Button>
          {videoUri && (
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="checkmark-circle" size={14} color="#4ADE80" />
              <Text className="text-xs text-primary">Video captured</Text>
            </View>
          )}
        </View>

        {error && <Text className="text-xs text-red-400">{error}</Text>}
        {media.error && <Text className="text-xs text-red-400">{media.error}</Text>}

        <Button
          fullWidth
          size="lg"
          onPress={() => void handleSubmit()}
          loading={submitting}
          disabled={!videoUri}
        >
          Submit for review
        </Button>
      </View>
    </SafeAreaView>
  );
}
