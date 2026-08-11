import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

function comingSoon(feature: string) {
  Alert.alert('Coming soon', `${feature} isn't available yet.`);
}

function MenuRow({
  icon,
  label,
  badge,
  onPress,
  indent = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  badge?: string;
  onPress: () => void;
  indent?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 py-3.5 border-b border-border ${indent ? 'pl-10 pr-4' : 'px-4'}`}
    >
      <Ionicons name={icon} size={18} color="#E5E7EB" />
      <Text className="flex-1 text-white font-medium">{label}</Text>
      {badge && (
        <View className="bg-primary/15 border border-primary/40 rounded-full px-2 py-0.5">
          <Text className="text-primary text-[10px] font-bold uppercase">{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

function ExpandableRow({
  icon,
  label,
  expanded,
  onToggle,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View>
      <Pressable onPress={onToggle} className="flex-row items-center gap-3 px-4 py-3.5 border-b border-border">
        <Ionicons name={icon} size={18} color="#E5E7EB" />
        <Text className="flex-1 text-white font-medium">{label}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#6B7280" />
      </Pressable>
      {expanded && children}
    </View>
  );
}

export default function AppMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [trainingOpen, setTrainingOpen] = useState(true);
  const [physiqueOpen, setPhysiqueOpen] = useState(true);

  const go = (path: Parameters<typeof router.push>[0]) => {
    onClose();
    router.push(path);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/60" onPress={onClose}>
        <Pressable className="absolute left-0 top-0 bottom-0 w-[78%] bg-background border-r border-border" onPress={() => {}}>
          <ScrollView contentContainerClassName="pt-14 pb-8">
            <MenuRow icon="person-outline" label="Account" onPress={() => comingSoon('Account settings')} />
            <MenuRow icon="notifications-outline" label="Notifications" onPress={() => go('/notifications')} />

            <ExpandableRow
              icon="barbell-outline"
              label="Training"
              expanded={trainingOpen}
              onToggle={() => setTrainingOpen((v) => !v)}
            >
              <MenuRow icon="folder-outline" label="My Workouts" indent onPress={() => go('/(tabs)/training')} />
              <MenuRow icon="time-outline" label="History" indent onPress={() => go('/history')} />
              <MenuRow icon="videocam-outline" label="Form Checks" indent onPress={() => go('/form-checks')} />
              <MenuRow icon="clipboard-outline" label="Check-ins" indent onPress={() => go('/checkins')} />
            </ExpandableRow>

            <MenuRow icon="location-outline" label="Gyms" badge="Beta" onPress={() => comingSoon('Gyms')} />

            <ExpandableRow
              icon="body-outline"
              label="Physique"
              expanded={physiqueOpen}
              onToggle={() => setPhysiqueOpen((v) => !v)}
            >
              <MenuRow icon="scale-outline" label="Bodyweight" indent onPress={() => go('/bodyweight/history')} />
              <MenuRow icon="camera-outline" label="Photos" indent onPress={() => comingSoon('Progress photos')} />
              <MenuRow icon="resize-outline" label="Measurements" indent onPress={() => comingSoon('Measurements')} />
              <MenuRow icon="trophy-outline" label="Leaderboards" indent onPress={() => go('/(tabs)/leaderboards')} />
              <MenuRow icon="chatbubble-outline" label="Messages" indent onPress={() => go('/(tabs)/messages')} />
            </ExpandableRow>

            <View className="mt-4 px-4">
              <Pressable
                onPress={() => {
                  onClose();
                  void supabase.auth.signOut();
                }}
                className="flex-row items-center gap-2 py-3"
              >
                <Ionicons name="log-out-outline" size={16} color="#F87171" />
                <Text className="text-red-400 font-medium">Sign out</Text>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
