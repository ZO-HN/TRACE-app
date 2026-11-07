import {useState} from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTraceUserContext } from '../../src/context/TraceUserContext';
import { useFormChecks } from '../../src/hooks/useFormChecks';
import Card from '../../src/components/ui/Card';
import Skeleton from '../../src/components/ui/Skeleton';
import ScreenHeader from '../../src/components/ui/ScreenHeader';
import Button from '../../src/components/ui/Button';
import MediaViewer from '../../src/components/media/MediaViewer';

const STATUS_STYLE: Record<string, string> = {
  unreviewed: 'bg-background border-border text-gray-400',
  reviewed: 'bg-primary/15 border-primary/30 text-primary',
};

export default function FormChecksScreen() {
  const { profile } = useTraceUserContext();
  return <FormChecks key={profile!.id} userId={profile!.id}/>;
}
function FormChecks({userId}:{userId:string}){
  const { formChecks, isLoading, error,refresh,loadMore,hasMore,loadingMore } = useFormChecks(userId);
  const [viewing,setViewing]=useState<string|null>(null);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader
        title="Form Checks"
        right={
          <Pressable onPress={() => router.push('/form-checks/new')}>
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </Pressable>
        }
      />

      <View className="px-4 pt-3"><Button variant="secondary" size="sm" onPress={()=>void refresh()}>Reload form checks</Button></View>
      {error&&<Text accessibilityRole="alert" className="text-sm text-red-400 px-4 pt-4">Could not load form checks: {error}</Text>}
      {isLoading&&formChecks.length===0 ? (
        <View className="p-4 gap-2">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </View>
      ) : formChecks.length === 0&&!error ? (
        <View className="flex-1 items-center justify-center px-6 gap-2">
          <Ionicons name="videocam-outline" size={32} color="#6B7280" />
          <Text className="text-lg font-bold text-white">No form checks yet</Text>
          <Text className="text-sm text-gray-500 text-center">
            Submit a lift video for your coach to review your form.
          </Text>
        </View>
      ) : (
        <FlatList data={formChecks} keyExtractor={fc=>fc.id} contentContainerClassName="p-4 gap-3"
          ListFooterComponent={hasMore?<Button variant="secondary" loading={loadingMore} onPress={()=>void loadMore()}>Load older form checks</Button>:null}
          renderItem={({item:fc}) => (
            <Card key={fc.id} className="p-4 gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-white font-semibold">{fc.exerciseName ?? 'Form check'}</Text>
                <View className={`border rounded-full px-2 py-0.5 ${STATUS_STYLE[fc.status]}`}>
                  <Text className={`text-[10px] font-bold uppercase ${STATUS_STYLE[fc.status].split(' ').pop()}`}>
                    {fc.status}
                  </Text>
                </View>
              </View>
              <Text className="text-xs text-gray-500">
                {fc.submittedAt?new Date(fc.submittedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }):'Submission date unavailable'}
              </Text>
              {fc.coachNotes && (
                <View className="bg-background border border-border rounded-xl p-3 gap-1">
                  <Text className="text-xs text-gray-500 uppercase font-bold">Coach notes</Text>
                  <Text className="text-sm text-gray-300">{fc.coachNotes}</Text>
                </View>
              )}
              {fc.videoKey&&<Button variant="secondary" size="sm" onPress={()=>setViewing(value=>value===fc.id?null:fc.id)}>{viewing===fc.id?'Hide video':'View video'}</Button>}
              {viewing===fc.id&&fc.videoKey&&<MediaViewer objectKey={fc.videoKey}/>}
            </Card>
          )}/>
      )}
    </SafeAreaView>
  );
}
