import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

/**
 * Shared "back arrow left, title centered, optional actions right" header —
 * matches the reference screens (History, Bodyweight, Bodyweight Settings):
 * the title is truly centered in the bar, not just left-aligned next to the
 * back button. Used by every pushed (non-tab) screen for consistent spacing.
 */
export default function ScreenHeader({
  title,
  onClose,
  right,
}: {
  title: string;
  /** Use for modal-presented screens (X instead of a back arrow). */
  onClose?: () => void;
  right?: ReactNode;
}) {
  return (
    <View className="flex-row items-center px-4 py-3 border-b border-border">
      <Pressable onPress={onClose ?? (() => router.back())} className="absolute left-4 z-10">
        <Ionicons name={onClose ? 'close' : 'arrow-back'} size={22} color="#FFFFFF" />
      </Pressable>
      <Text className="flex-1 text-lg font-bold text-white text-center" numberOfLines={1}>
        {title}
      </Text>
      {right && <View className="absolute right-4 flex-row items-center gap-3">{right}</View>}
    </View>
  );
}
