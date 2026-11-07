import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTraceUserContext } from '../../src/context/TraceUserContext';
import { useBodyweightSettings } from '../../src/hooks/useBodyweightSettings';
import { useUnitPreference } from '../../src/hooks/useUnitPreference';
import {
  cancelWeighInReminder,
  requestReminderPermission,
  scheduleWeighInReminder,
} from '../../src/lib/bodyweight/weighInReminder';
import Card from '../../src/components/ui/Card';
import Switch from '../../src/components/ui/Switch';
import Select from '../../src/components/ui/Select';
import ScreenHeader from '../../src/components/ui/ScreenHeader';
import { useAsyncAction } from '../../src/hooks/useAsyncAction';

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
  const { settings, update, isLoading, error: settingsError, refresh, isPersisted } = useBodyweightSettings(profile!.id);
  const { unit, setUnit, isLoaded } = useUnitPreference();
  const unitAction = useAsyncAction();
  const action = useAsyncAction();

  const handleToggleReminder = (enabled: boolean) => action.run(async () => {
    if (enabled) {
      const granted = await requestReminderPermission();
      if (!granted) {
        Alert.alert('Notifications disabled', 'Enable notifications for TRACE in system settings first.');
        return;
      }
      const time = settings.weighInReminderTime ?? '08:00';
      await scheduleWeighInReminder(time);
      const result = await update({ weighInReminderEnabled: true, weighInReminderTime: time });
      if (!result.ok) {
        await cancelWeighInReminder();
        throw new Error(result.error);
      }
    } else {
      await cancelWeighInReminder();
      const result = await update({ weighInReminderEnabled: false });
      if (!result.ok) {
        if (settings.weighInReminderEnabled) await scheduleWeighInReminder(settings.weighInReminderTime ?? '08:00');
        throw new Error(result.error);
      }
    }
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader title="Bodyweight Settings" />

      <ScrollView contentContainerClassName="p-4 gap-4">
        {settingsError && <Card className="p-4 gap-2">
          <Text accessibilityRole="alert" className="text-red-400">Could not load saved bodyweight settings: {settingsError}</Text>
          <Pressable accessibilityRole="button" disabled={isLoading} onPress={() => void refresh()} className="min-h-[48px] justify-center">
            <Text className="text-primary font-semibold">{isLoading ? 'Retrying…' : 'Retry loading settings'}</Text>
          </Pressable>
        </Card>}
        {!isPersisted && !settingsError && !isLoading && <Text className="text-amber-400 text-xs">Settings have not been confirmed from the server yet; changes are disabled.</Text>}
        <View className="gap-3 pb-4 border-b border-border">
          <Text className="text-base font-bold text-white">Default weight unit</Text>
          <View className="flex-row gap-2">
            {(['kg', 'lbs'] as const).map((value) => <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityLabel={value === 'kg' ? 'Kilograms' : 'Pounds'}
              accessibilityState={{ checked: unit === value, disabled: !isLoaded || unitAction.pending }}
              disabled={!isLoaded || unitAction.pending}
              onPress={() => void unitAction.run(() => setUnit(value))}
              style={{ borderRadius: 16 }}
              className={`flex-1 h-12 rounded-lg border items-center justify-center ${unit === value ? 'border-primary bg-surface' : 'border-border'}`}
            >
              <Text className={unit === value ? 'text-primary font-bold' : 'text-gray-400'}>{value === 'kg' ? 'Kilograms (kg)' : 'Pounds (lb)'}</Text>
            </Pressable>)}
          </View>
          {unitAction.error && <Text className="text-red-400 text-sm">Could not save unit. Please try again.</Text>}
        </View>
        {action.error && <Text className="text-red-400">{action.error}</Text>}
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
        </SectionCard>

        <Pressable accessibilityRole="button" onPress={() => router.push('/bodyweight/entry')}
          className="flex-row items-center gap-2 border border-border rounded-xl px-4 py-3 min-h-[48px]">
          <Ionicons name="calendar-outline" size={18} color="#E5E7EB" />
          <Text className="text-white font-medium">Add a past weigh-in</Text>
        </Pressable>

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
              disabled={isLoading || action.pending}
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
            onChange={(v) => { if (!isLoading && isPersisted && !settingsError) void action.run(async () => {
              const result = await update({ movingAverageWindow: v === '7' ? 7 : 14 });
              if (!result.ok) throw new Error(result.error);
            }); }}
          />
        </SectionCard>

        <SectionCard title="Goal" description="Bodyweight goals live in roadmaps. Create one to start tracking.">
          <Pressable
            onPress={() => router.push('/bodyweight/roadmap')}
            className="flex-row items-center justify-between border border-border rounded-xl px-4 py-3"
          >
            <Text className="text-white font-medium">Go to roadmaps</Text>
            <Ionicons name="chevron-forward" size={18} color="#6B7280" />
          </Pressable>
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}
