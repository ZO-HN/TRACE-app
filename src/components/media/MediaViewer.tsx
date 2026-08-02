// Renders a private R2 object (by key) as video or image via a signed GET URL.

import { Image, Linking, Pressable, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useMediaUrl } from '../../hooks/useMediaUrl';
import { renderKindFromKey } from '../../lib/storage/mediaKind';

function VideoClip({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
  });
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
  const { url, error, loading } = useMediaUrl(objectKey);
  const kind = renderKindFromKey(objectKey);

  if (loading) {
    return <View className="h-40 rounded-lg bg-background border border-border" />;
  }
  if (error || !url) {
    return <Text className="text-xs text-red-400">{error ?? 'Media unavailable'}</Text>;
  }

  if (kind === 'video') {
    return <VideoClip url={url} />;
  }
  if (kind === 'image') {
    return (
      <Image
        source={{ uri: url }}
        className="w-full rounded-lg border border-border"
        style={{ aspectRatio: 4 / 3 }}
        resizeMode="cover"
      />
    );
  }
  return (
    <Pressable onPress={() => Linking.openURL(url)}>
      <Text className="text-xs text-primary underline">Open attachment</Text>
    </Pressable>
  );
}
