// Reads/writes notification_settings for the signed-in trainee. Table
// doesn't exist yet (docs/migrations-drafts/009_tracked_parity_tier_b.sql)
// — degrades to DEFAULT_NOTIFICATION_SETTINGS with in-memory-only edits
// until applied, same TABLE_MISSING_CODE pattern as useBodyweightSettings.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationSettings,
} from '../lib/notifications/quietHours';

const TABLE_MISSING_CODE = '42P01';

export interface UseNotificationSettings {
  settings: NotificationSettings;
  isLoading: boolean;
  isPersisted: boolean;
  update: (patch: Partial<NotificationSettings>) => Promise<{ ok: boolean; error?: string }>;
}

export function useNotificationSettings(userId: string): UseNotificationSettings {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isPersisted, setIsPersisted] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('quiet_hours_enabled, quiet_hours_start, quiet_hours_end, mute_personal, mute_coaching')
        .eq('user_id', userId)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        setIsPersisted(false);
        setIsLoading(false);
        return;
      }

      setIsPersisted(true);
      if (data) {
        setSettings({
          quietHoursEnabled: data.quiet_hours_enabled ?? false,
          quietHoursStart: data.quiet_hours_start ?? null,
          quietHoursEnd: data.quiet_hours_end ?? null,
          mutePersonal: data.mute_personal ?? false,
          muteCoaching: data.mute_coaching ?? false,
        });
      }
      setIsLoading(false);
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  const update = useCallback(
    async (patch: Partial<NotificationSettings>) => {
      const next = { ...settings, ...patch };
      setSettings(next);

      const { error } = await supabase.from('notification_settings').upsert(
        {
          user_id: userId,
          quiet_hours_enabled: next.quietHoursEnabled,
          quiet_hours_start: next.quietHoursStart,
          quiet_hours_end: next.quietHoursEnd,
          mute_personal: next.mutePersonal,
          mute_coaching: next.muteCoaching,
        },
        { onConflict: 'user_id' },
      );

      if (error) {
        if (error.code === TABLE_MISSING_CODE) {
          setIsPersisted(false);
          return { ok: true };
        }
        return { ok: false, error: error.message };
      }

      setIsPersisted(true);
      return { ok: true };
    },
    [settings, userId],
  );

  return { settings, isLoading, isPersisted, update };
}
