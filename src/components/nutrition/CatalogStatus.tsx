import { ActivityIndicator, Text, View } from 'react-native';
import Button from '../ui/Button';

export default function CatalogStatus({ loading, error, onRetry }: { loading: boolean; error: string | null; onRetry: () => Promise<void> }) {
  return (
    <View accessibilityLiveRegion="polite" className="p-4 gap-3">
      {loading ? <><ActivityIndicator color="#4ADE80" /><Text className="text-sm text-gray-400">Loading saved foods…</Text></> : <>
        <Text accessibilityRole="alert" className="text-sm text-amber-300">Saved foods are unavailable. Check your connection or use Quick Add to log offline.</Text>
        <Text className="text-xs text-gray-400">{error}</Text>
        <Button variant="secondary" onPress={() => void onRetry()}>Retry</Button>
      </>}
    </View>
  );
}
