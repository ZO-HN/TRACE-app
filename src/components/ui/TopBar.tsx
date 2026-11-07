import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AppMenu from './AppMenu';

/**
 * Persistent top bar for every tab screen — hamburger (left, opens a
 * left-side pop-out menu, matching where the icon lives), placeholder logo + wordmark (center), bell
 * (notifications) + chat (messages) icons (right). Matches the reference
 * app's header, which stays the same across Home/Workouts/Nutrition/etc.
 */
export default function TopBar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <Pressable accessibilityRole="button" accessibilityLabel="Open menu" onPress={() => setMenuOpen(true)} className="w-11 h-11 items-center justify-center -ml-2">
          <Ionicons name="menu" size={24} color="#FFFFFF" />
        </Pressable>

        <View className="flex-row items-center gap-2">
          <View className="w-6 h-6 rounded-md bg-primary/20 border border-primary/40 items-center justify-center">
            <Ionicons name="paw" size={14} color="#818CF8" />
          </View>
          <Text className="text-white font-extrabold tracking-wide">TRACE</Text>
        </View>

        <View className="flex-row items-center gap-1">
          <Pressable accessibilityRole="button" accessibilityLabel="Notifications" className="w-11 h-11 items-center justify-center" onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Messages" className="w-11 h-11 items-center justify-center" onPress={() => router.push('/(tabs)/messages')}>
            <Ionicons name="chatbubble-outline" size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <AppMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
