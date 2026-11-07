// Private, owner-only progress photos. Upload verification precedes metadata.

import { useRef, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { useTraceUserContext } from '../../src/context/TraceUserContext';
import { useProgressPhotos } from '../../src/hooks/useProgressPhotos';
import { useMediaUpload } from '../../src/hooks/useMediaUpload';
import type {UploadResult} from '../../src/lib/storage/types';
import UploadRecovery from '../../src/components/media/UploadRecovery';
import type { RNFile } from '../../src/lib/storage/uploadMedia';
import type { ProgressPhoto } from '../../src/lib/progressPhotos/types';
import MediaViewer from '../../src/components/media/MediaViewer';
import ScreenHeader from '../../src/components/ui/ScreenHeader';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';

export default function ProgressPhotosScreen() {
  const { profile } = useTraceUserContext();
  return <ProgressPhotos key={profile!.id} userId={profile!.id}/>;
}
function ProgressPhotos({userId}:{userId:string}){
  const { photos, isLoading, isPersisted, error:readError,refresh,loadMore,hasMore,loadingMore,add } = useProgressPhotos(userId);
  const media = useMediaUpload(userId);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparing, setComparing] = useState<ProgressPhoto | null>(null);
  const captureActive=useRef(false);
  const savePhoto=async(result:UploadResult)=>{
    const saved=await add(result.key,result.recordedDate,undefined,result.operationId);
    if(!saved.ok)throw new Error(saved.error??'Could not save this photo. Recover the same upload to retry.');
  };

  const capture = async () => {
    if(captureActive.current||media.status==='uploading')return;
    captureActive.current=true;setCapturing(true);setError(null);
    try{
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('Camera permission is needed to take a photo.');

    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const info = await FileSystem.getInfoAsync(asset.uri);
      const file: RNFile = {
        uri: asset.uri,
        name: asset.fileName ?? `progress-${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
        size: info.exists ? (info.size ?? 0) : 0,
      };
      await savePhoto(await media.upload(file, 'progress-photo'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      captureActive.current=false;
      setCapturing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader title="Progress Photos" />

      <View className="p-4 gap-3">
        {!isPersisted && !isLoading && (
          <Text className="text-xs text-amber-400">
            This backend needs the current progress-photo schema. No photo is reported saved until the server confirms it.
          </Text>
        )}

        <Button
          variant="secondary"
          fullWidth
          onPress={() => void capture()}
          loading={capturing||media.status==='uploading'}
          icon={<Ionicons name="camera-outline" size={16} color="#E5E7EB" />}
        >
          Take a photo
        </Button>
        {error && <Text className="text-xs text-red-400">{error}</Text>}
        {media.error && <Text className="text-xs text-red-400">{media.error}</Text>}
        {readError&&<Text accessibilityRole="alert" className="text-red-400">{readError}</Text>}
        <Button variant="secondary" size="sm" onPress={()=>void refresh()}>Reload photos</Button>
        <UploadRecovery media={media} kind="progress-photo" onUse={savePhoto} disabled={capturing}/>

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
          !isLoading&&!readError ? (
            <View className="items-center py-12 gap-2">
              <Ionicons name="images-outline" size={26} color="#6B7280" />
              <Text className="text-sm text-gray-500">No progress photos yet.</Text>
            </View>
          ) : null
        }
        ListFooterComponent={hasMore?<Button variant="secondary" loading={loadingMore} onPress={()=>void loadMore()}>Load older photos</Button>:null}
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
