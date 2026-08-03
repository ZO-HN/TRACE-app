// Registers for push notifications and saves the Expo push token to
// profiles.expo_push_token (read by the send-push-on-message edge function
// with the service role, so no RLS policy is needed for it to read tokens).
//
// Requires an EAS project to be linked (`eas init`) before it can do
// anything real — without one, getExpoPushTokenAsync has no projectId to
// call with. This is a manual, one-time setup step outside of code, same
// category as the Database Webhook and platform_settings.default_coach_id
// steps documented elsewhere. Until that's done, this hook no-ops with a
// console warning rather than crashing or surfacing an error to the user.

import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications(userId: string | null): void {
  useEffect(() => {
    if (!userId || !Device.isDevice) return;

    let cancelled = false;

    (async () => {
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted' || cancelled) return;

        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        if (!projectId) {
          console.warn(
            'usePushNotifications: no EAS project linked (run `eas init`) — skipping token registration.',
          );
          return;
        }

        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
        if (cancelled || !token) return;

        await supabase.from('profiles').update({ expo_push_token: token }).eq('id', userId);
      } catch (e) {
        console.warn('usePushNotifications: registration failed', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);
}
