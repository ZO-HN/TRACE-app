// Reads/writes bodyweight_settings for the signed-in trainee. That table
// doesn't exist yet (see docs/migrations-drafts/001_bodyweight_settings.sql,
// a handoff draft for the dashboard repo) — until it's applied, every call
// here degrades gracefully to DEFAULT_BODYWEIGHT_SETTINGS and edits are kept
// in-memory only for the session (Postgres "undefined_table" is code 42P01).

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DEFAULT_BODYWEIGHT_SETTINGS, type BodyweightSettings } from '../lib/bodyweight/types';

const TABLE_MISSING_CODE = '42P01';

export interface UseBodyweightSettings {
  settings: BodyweightSettings;
  isLoading: boolean;
  /** True once we've confirmed bodyweight_settings exists and is writable. */
  isPersisted: boolean;
  update: (patch: Partial<BodyweightSettings>) => Promise<{ ok: boolean; error?: string }>;
}

export function useBodyweightSettings(userId: string): UseBodyweightSettings {
  const [settings, setSettings] = useState<BodyweightSettings>(DEFAULT_BODYWEIGHT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isPersisted, setIsPersisted] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const { data, error } = await supabase
        .from('bodyweight_settings')
        .select('moving_average_window, weigh_in_reminder_enabled, weigh_in_reminder_time')
        .eq('user_id', userId)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        if (error.code !== TABLE_MISSING_CODE) {
          // Unexpected error (RLS, network) — keep defaults but stop loading.
        }
        setIsPersisted(false);
        setIsLoading(false);
        return;
      }

      setIsPersisted(true);
      if (data) {
        setSettings({
          movingAverageWindow: data.moving_average_window === 7 ? 7 : 14,
          weighInReminderEnabled: data.weigh_in_reminder_enabled ?? false,
          weighInReminderTime: data.weigh_in_reminder_time ?? null,
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
    async (patch: Partial<BodyweightSettings>) => {
      const next = { ...settings, ...patch };

      const { error } = await supabase.from('bodyweight_settings').upsert(
        {
          user_id: userId,
          moving_average_window: next.movingAverageWindow,
          weigh_in_reminder_enabled: next.weighInReminderEnabled,
          weigh_in_reminder_time: next.weighInReminderTime,
        },
        { onConflict: 'user_id' },
      );

      if (error) {
        if (error.code === TABLE_MISSING_CODE) {
          setIsPersisted(false);
          return { ok: false, error: 'Bodyweight settings could not be saved. Please try again later.' };
        }
        return { ok: false, error: error.message };
      }

      setIsPersisted(true);
      setSettings(next);
      return { ok: true };
    },
    [settings, userId],
  );

  return { settings, isLoading, isPersisted, update };
}
