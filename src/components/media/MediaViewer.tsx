// Renders a private R2 object (by key) as video or image via a signed GET URL.

import {useEffect,useState} from 'react';
import { Image, Linking, Pressable, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useMediaUrl } from '../../hooks/useMediaUrl';
import { renderKindFromKey } from '../../lib/storage/mediaKind';

function VideoClip({ url,onError }: { url: string;onError:()=>void }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
  });
  useEffect(()=>{const listener=player.addListener('statusChange',event=>{if(event.status==='error')onError();});return()=>listener.remove();},[player,onError]);
  return (
    <VideoView
      player={player}
      style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 8 }}
      allowsPictureInPicture
      nativeControls
    />
  );
}

export default function MediaViewer({ objectKey }: { objectKey: string }) {
  const { url, error, loading,contentType,retry } = useMediaUrl(objectKey);
  const [failedUrl,setFailedUrl]=useState<string|null>(null);
  const reload=()=>{setFailedUrl(null);retry();};
  const kind = contentType?.startsWith('image/')?'image':contentType?.startsWith('video/')?'video':renderKindFromKey(objectKey);

  if (loading) {
    return <View className="h-40 rounded-lg bg-background border border-border" />;
  }
  if (error || !url || failedUrl===url) {
    return <View><Text accessibilityRole="alert" className="text-xs text-red-400">{error ?? 'Media could not be displayed. Reload or choose another file.'}</Text><Pressable accessibilityRole="button" onPress={reload} className="min-h-11 justify-center"><Text className="text-primary">Reload media</Text></Pressable></View>;
  }

  if (kind === 'video') {
    return <VideoClip key={url} url={url} onError={()=>setFailedUrl(url)} />;
  }
  if (kind === 'image') {
    return (
      <Image
        source={{ uri: url }}
        onError={()=>setFailedUrl(url)}
        className="w-full rounded-lg border border-border"
        style={{ aspectRatio: 4 / 3 }}
        resizeMode="cover"
      />
    );
  }
  return (
    <Pressable accessibilityRole="button" onPress={() => {void Linking.openURL(url).catch(()=>setFailedUrl(url));}}>
      <Text className="text-xs text-primary underline">Open attachment</Text>
    </Pressable>
  );
}
