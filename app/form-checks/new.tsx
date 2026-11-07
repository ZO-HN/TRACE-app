import { useRef, useState } from 'react';
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
import UploadRecovery from '../../src/components/media/UploadRecovery';
import MediaViewer from '../../src/components/media/MediaViewer';
import type {UploadResult} from '../../src/lib/storage/types';
import {bindFormCheckUpload,readUploadJob} from '../../src/lib/storage/uploadJournal';
import {useAsyncAction} from '../../src/hooks/useAsyncAction';

const NO_EXERCISE = 'none';

export default function NewFormCheckScreen() {
  const { profile } = useTraceUserContext();
  return <NewFormCheck key={profile!.id} userId={profile!.id}/>;
}
function NewFormCheck({userId}:{userId:string}){
  const { submit } = useFormChecks(userId);
  const { rows: exercises, isLoaded } = useExerciseCatalog();
  const media = useMediaUpload(userId);

  const [exerciseId, setExerciseId] = useState(NO_EXERCISE);
  const [file,setFile]=useState<RNFile|null>(null);
  const [uploaded,setUploaded]=useState<UploadResult|null>(null);
  const [held,setHeld]=useState(false);
  const videoUri=file?.uri??null;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitActive=useRef(false);const picker=useAsyncAction();
  const useUpload=async(result:UploadResult)=>{
    const job=await readUploadJob(userId,result.operationId);
    setUploaded(result);setFile(null);setHeld(Boolean(job.attachment));setExerciseId(job.attachment?.exerciseId??NO_EXERCISE);setError(null);
  };

  const pickVideo = () => picker.run(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('Camera permission is needed to record a clip.');

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: 60,
      quality: 0.6,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset=result.assets[0];const info=await FileSystem.getInfoAsync(asset.uri);
    const type=asset.mimeType??(/\.mov(?:$|\?)/i.test(asset.uri)?'video/quicktime':/\.webm(?:$|\?)/i.test(asset.uri)?'video/webm':'video/mp4');
    setFile({uri:asset.uri,name:asset.fileName??`form-check-${Date.now()}.${type==='video/quicktime'?'mov':type==='video/webm'?'webm':'mp4'}`,type,size:asset.fileSize??(info.exists?(info.size??0):0)});
    setUploaded(null);setHeld(false);setError(null);
  });

  const handleSubmit = async () => {
    if ((!file&&!uploaded)||submitActive.current) return;
    submitActive.current=true;
    setSubmitting(true);
    setError(null);
    try {
      const clip=uploaded??await media.upload(file!,'form-video');setUploaded(clip);
      const prepared=await bindFormCheckUpload(userId,clip.operationId,exerciseId===NO_EXERCISE?null:exerciseId);setHeld(true);
      const result = await submit(clip.key,prepared.attachment!.exerciseId,clip.operationId);
      if (result.ok) {
        router.replace('/form-checks');
      } else {
        setError(result.error ?? 'Could not submit that form check.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      submitActive.current=false;
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
            disabled={held||submitting}
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
            loading={picker.pending}
            disabled={submitting}
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
        {picker.error&&<Text className="text-xs text-red-400">{picker.error}</Text>}
        {uploaded&&<MediaViewer objectKey={uploaded.key}/>}
        {held&&<Text className="text-gray-400">This submission keeps its original exercise and identity for retry. Check Form Checks before recording a different submission if the previous result is uncertain.</Text>}
        <UploadRecovery media={media} kind="form-video" onUse={useUpload} disabled={submitting||picker.pending}/>

        <Button
          fullWidth
          size="lg"
          onPress={() => void handleSubmit()}
          loading={submitting}
          disabled={!file&&!uploaded}
        >
          Submit for review
        </Button>
      </View>
    </SafeAreaView>
  );
}
