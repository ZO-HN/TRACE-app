// Progress photos — capture + timeline, following Tracked's "save/share
// progress photos" (docs/feature-research/tracked-app-parity-gap.md Tier B).
// NOTE: upload will fail server-side until the dashboard repo's r2-presign
// edge function adds a 'progress-photo' case — see the caveat on that
// MediaKind value in src/lib/storage/types.ts. Until then this screen still
// works for browsing (once the table exists) but capture surfaces the
// upload error inline rather than silently failing.

import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { useTraceUserContext } from '../../src/context/TraceUserContext';
import { useProgressPhotos } from '../../src/hooks/useProgressPhotos';
import { useMediaUpload } from '../../src/hooks/useMediaUpload';
import type { RNFile } from '../../src/lib/storage/uploadMedia';
import type { ProgressPhoto } from '../../src/lib/progressPhotos/types';
import MediaViewer from '../../src/components/media/MediaViewer';
import ScreenHeader from '../../src/components/ui/ScreenHeader';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';

export default function ProgressPhotosScreen() {
  const { profile } = useTraceUserContext();
  const { photos, isLoading, isPersisted, add } = useProgressPhotos(profile!.id);
  const media = useMediaUpload();
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparing, setComparing] = useState<ProgressPhoto | null>(null);

  const capture = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;

    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled || !result.assets?.[0]) return;

    setCapturing(true);
    setError(null);
    try {
      const asset = result.assets[0];
      const info = await FileSystem.getInfoAsync(asset.uri);
      const file: RNFile = {
        uri: asset.uri,
        name: asset.fileName ?? `progress-${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
        size: info.exists ? (info.size ?? 0) : 0,
      };
      const { key } = await media.upload(file, 'progress-photo');
      const today = new Date().toISOString().slice(0, 10);
      const saved = await add(key, today);
      if (!saved.ok) setError(saved.error ?? 'Could not save that photo.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setCapturing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader title="Progress Photos" />

      <View className="p-4 gap-3">
        {!isPersisted && !isLoading && (
          <Text className="text-xs text-amber-400">
            Progress photos aren't fully set up on this backend yet — entries won't survive a reload.
          </Text>
        )}

        <Button
          variant="secondary"
          fullWidth
          onPress={() => void capture()}
          loading={capturing}
          icon={<Ionicons name="camera-outline" size={16} color="#E5E7EB" />}
        >
          Take a photo
        </Button>
        {error && <Text className="text-xs text-red-400">{error}</Text>}
        {media.error && <Text className="text-xs text-red-400">{media.error}</Text>}

        {comparing && (
          <Card className="p-3 gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-white">Comparing to {comparing.taken_date}</Text>
              <Pressable onPress={() => setComparing(null)}>
                <Ionicons name="close" size={18} color="#9CA3AF" />
              </Pressable>
            </View>
            <MediaViewer objectKey={comparing.photo_s3_key} />
          </Card>
        )}
      </View>

      <FlatList
        data={photos}
        keyExtractor={(p) => p.id}
        numColumns={2}
        contentContainerClassName="p-4 gap-3"
        columnWrapperClassName="gap-3"
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center py-12 gap-2">
              <Ionicons name="images-outline" size={26} color="#6B7280" />
              <Text className="text-sm text-gray-500">No progress photos yet.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            className="flex-1"
            onPress={() => setComparing((cur) => (cur?.id === item.id ? null : item))}
          >
            <Card className="p-1.5 gap-1">
              <MediaViewer objectKey={item.photo_s3_key} />
              <Text className="text-[11px] text-gray-500 text-center">{item.taken_date}</Text>
            </Card>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
