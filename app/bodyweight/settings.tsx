import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTraceUserContext } from '../../src/context/TraceUserContext';
import { useBodyweightSettings } from '../../src/hooks/useBodyweightSettings';
import {
  cancelWeighInReminder,
  requestReminderPermission,
  scheduleWeighInReminder,
} from '../../src/lib/bodyweight/weighInReminder';
import Card from '../../src/components/ui/Card';
import Switch from '../../src/components/ui/Switch';
import Select from '../../src/components/ui/Select';

function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="p-4 gap-3">
      <Text className="text-base font-bold text-white">{title}</Text>
      <Text className="text-sm text-gray-400">{description}</Text>
      {children}
    </Card>
  );
}

export default function BodyweightSettingsScreen() {
  const { profile } = useTraceUserContext();
  const { settings, update } = useBodyweightSettings(profile!.id);
  const [reminderBusy, setReminderBusy] = useState(false);

  const handleToggleReminder = async (enabled: boolean) => {
    setReminderBusy(true);
    if (enabled) {
      const granted = await requestReminderPermission();
      if (!granted) {
        Alert.alert('Notifications disabled', 'Enable notifications for TRACE in system settings first.');
        setReminderBusy(false);
        return;
      }
      const time = settings.weighInReminderTime ?? '08:00';
      await scheduleWeighInReminder(time);
      await update({ weighInReminderEnabled: true, weighInReminderTime: time });
    } else {
      await cancelWeighInReminder();
      await update({ weighInReminderEnabled: false });
    }
    setReminderBusy(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <Text className="text-lg font-bold text-white">Bodyweight Settings</Text>
      </View>

      <ScrollView contentContainerClassName="p-4 gap-4">
        <SectionCard
          title="Health Connect Integration"
          description="Automatically sync your bodyweight data from Health Connect to keep your records up to date."
        >
          <Pressable
            onPress={() => Alert.alert('Coming soon', 'Health Connect sync is not available yet.')}
            className="flex-row items-center gap-2 border border-border rounded-xl px-4 py-3"
          >
            <Ionicons name="pulse-outline" size={18} color="#E5E7EB" />
            <Text className="text-white font-medium">Sync Recent Data</Text>
          </Pressable>
          <Pressable
            onPress={() => Alert.alert('Coming soon', 'Historical import is not available yet.')}
            className="flex-row items-center gap-2 border border-border rounded-xl px-4 py-3"
          >
            <Ionicons name="phone-portrait-outline" size={18} color="#6B7280" />
            <Text className="text-gray-500 font-medium">Import All Historical Data</Text>
          </Pressable>
        </SectionCard>

        <SectionCard
          title="Weigh-in Reminders"
          description="Get a reminder only when you have not logged a weigh-in for the day."
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-white font-semibold">
                {settings.weighInReminderEnabled ? 'Reminders enabled' : 'Reminders disabled'}
              </Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                Push notifications must be enabled on this device.
              </Text>
            </View>
            <Switch
              value={settings.weighInReminderEnabled}
              onValueChange={(v) => void handleToggleReminder(v)}
              disabled={reminderBusy}
            />
          </View>
        </SectionCard>

        <SectionCard
          title="Bodyweight Moving Average"
          description="Choose the number of days to use for calculating your bodyweight moving average and trends. 7 days is more responsive to changes, while 14 days provides smoother trends."
        >
          <Select
            value={String(settings.movingAverageWindow) as '7' | '14'}
            options={[
              { value: '7', label: '7 days' },
              { value: '14', label: '14 days' },
            ]}
            onChange={(v) => void update({ movingAverageWindow: v === '7' ? 7 : 14 })}
          />
        </SectionCard>

        <SectionCard title="Goal" description="Bodyweight goals live in roadmaps. Create one to start tracking.">
          <View className="flex-row items-center justify-between border border-border rounded-xl px-4 py-3 opacity-50">
            <Text className="text-gray-500 font-medium">Go to roadmaps</Text>
            <Ionicons name="chevron-forward" size={18} color="#6B7280" />
          </View>
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}
