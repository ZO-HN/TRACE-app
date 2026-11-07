import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DEFAULT_BODYWEIGHT_SETTINGS, type BodyweightSettings } from '../lib/bodyweight/types';

export interface UseBodyweightSettings {
  settings: BodyweightSettings;
  isLoading: boolean;
  error: string | null;
  isPersisted: boolean;
  refresh: () => Promise<void>;
  update: (patch: Partial<BodyweightSettings>) => Promise<{ ok: boolean; error?: string }>;
}

export function useBodyweightSettings(userId: string): UseBodyweightSettings {
  const [settings, setSettings] = useState(DEFAULT_BODYWEIGHT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPersisted, setIsPersisted] = useState(false);
  const generation = useRef(0);
  const saving = useRef(false);

  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setIsLoading(true); setError(null); setIsPersisted(false);
    try {
      const { data, error: readError } = await supabase.from('bodyweight_settings')
        .select('moving_average_window, weigh_in_reminder_enabled, weigh_in_reminder_time')
        .eq('user_id', userId).maybeSingle();
      if (request !== generation.current) return;
      if (readError) throw readError;
      setSettings(data ? {
        movingAverageWindow: data.moving_average_window === 7 ? 7 : 14,
        weighInReminderEnabled: data.weigh_in_reminder_enabled ?? false,
        weighInReminderTime: data.weigh_in_reminder_time ?? null,
      } : DEFAULT_BODYWEIGHT_SETTINGS);
      setIsPersisted(true); setError(null);
    } catch (cause) {
      if (request === generation.current) setError(cause instanceof Error ? cause.message : 'Could not load bodyweight settings.');
    } finally {
      if (request === generation.current) setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => { void refresh(); return () => { generation.current++; }; }, [refresh]);

  const update = useCallback(async (patch: Partial<BodyweightSettings>) => {
    if (saving.current) return { ok: false, error: 'A settings save is already in progress.' };
    if (!isPersisted || error) return { ok: false, error: 'Load settings successfully before saving.' };
    saving.current = true;
    const request = generation.current;
    const next = { ...settings, ...patch };
    try {
      const { data, error: writeError } = await supabase.from('bodyweight_settings').upsert({
        user_id: userId, moving_average_window: next.movingAverageWindow,
        weigh_in_reminder_enabled: next.weighInReminderEnabled, weigh_in_reminder_time: next.weighInReminderTime,
      }, { onConflict: 'user_id' }).select('user_id').maybeSingle();
      if (writeError) throw writeError;
      if (request !== generation.current) return { ok: false, error: 'The active account changed before settings were confirmed.' };
      if (!data || data.user_id !== userId) throw new Error('The server did not confirm saving these settings.');
      setSettings(next); setIsPersisted(true); setError(null);
      return { ok: true };
    } catch (cause) {
      return { ok: false, error: cause instanceof Error ? cause.message : 'Could not save bodyweight settings.' };
    } finally { saving.current = false; }
  }, [error, isPersisted, settings, userId]);

  return { settings, isLoading, error, isPersisted, refresh, update };
}
