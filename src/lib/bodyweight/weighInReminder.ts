// Local (on-device) daily weigh-in reminder — purely expo-notifications'
// scheduleNotificationAsync, no server round-trip. Independent of
// usePushNotifications' remote-token flow (that hook only registers for
// push; it does not request the local-notification permission this needs
// on every platform, so we request/check it here too).

import * as Notifications from 'expo-notifications';

const REMINDER_IDENTIFIER = 'trace-weigh-in-reminder';

export async function requestReminderPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** time: "HH:mm" 24h. Cancels any previous reminder before scheduling. */
export async function scheduleWeighInReminder(time: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER).catch(() => {});
  const [hour, minute] = time.split(':').map(Number);
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_IDENTIFIER,
    content: {
      title: 'Weigh-in reminder',
      body: "You haven't logged a weigh-in today.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelWeighInReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER).catch(() => {});
}
