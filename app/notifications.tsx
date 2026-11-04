import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTraceUserContext } from '../src/context/TraceUserContext';
import { useNotificationSettings } from '../src/hooks/useNotificationSettings';
import ScreenHeader from '../src/components/ui/ScreenHeader';
import Card from '../src/components/ui/Card';
import Switch from '../src/components/ui/Switch';
import { useAsyncAction } from '../src/hooks/useAsyncAction';
import type { NotificationSettings } from '../src/lib/notifications/quietHours';

function QuietHoursSettings() {
  const { profile } = useTraceUserContext();
  const { settings, update, isLoading } = useNotificationSettings(profile!.id);
  const action = useAsyncAction();
  const save = (patch: Partial<NotificationSettings>) => action.run(async () => {
    const result = await update(patch);
    if (!result.ok) throw new Error(result.error);
  });

  return (
    <Card className="p-4 gap-3 mx-4 mb-2">
      <Text className="text-sm font-bold text-white">Quiet hours</Text>
      <Text className="text-xs text-gray-500">
        {settings.quietHoursEnabled
          ? `Muted ${settings.quietHoursStart ?? '--:--'}–${settings.quietHoursEnd ?? '--:--'}`
          : 'Off — notifications arrive any time'}
      </Text>
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-gray-300">Enable quiet hours</Text>
        <Switch
          value={settings.quietHoursEnabled}
          disabled={isLoading || action.pending}
          onValueChange={(v) => void save({ quietHoursEnabled: v,
            quietHoursStart: settings.quietHoursStart ?? '22:00', quietHoursEnd: settings.quietHoursEnd ?? '07:00' })}
        />
      </View>
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-gray-300">Mute personal chat</Text>
        <Switch value={settings.mutePersonal} disabled={isLoading || action.pending} onValueChange={(v) => void save({ mutePersonal: v })} />
      </View>
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-gray-300">Mute coaching alerts</Text>
        <Switch value={settings.muteCoaching} disabled={isLoading || action.pending} onValueChange={(v) => void save({ muteCoaching: v })} />
      </View>
      {action.error && <Text className="text-xs text-red-400">{action.error}</Text>}
    </Card>
  );
}

export default function NotificationsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScreenHeader title="Notifications" />
      <View className="pt-4">
        <QuietHoursSettings />
      </View>
      <View className="flex-1 items-center justify-center px-6 gap-3">
        <View className="w-16 h-16 rounded-full bg-surface items-center justify-center">
          <Ionicons name="notifications-outline" size={28} color="#6B7280" />
        </View>
        <Text className="text-lg font-bold text-white">No notifications</Text>
        <Text className="text-sm text-gray-500 text-center">
          We'll notify you when there's something new to see here
        </Text>
      </View>
    </SafeAreaView>
  );
}
