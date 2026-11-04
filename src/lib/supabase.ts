import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { isDevPreview, previewFetch } from './devPreview';

const extra = Constants.expoConfig?.extra ?? {};
export const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl) as
  | string
  | undefined;
export const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  extra.supabaseAnonKey) as string | undefined;

/**
 * False when env vars are missing — the app should render a visible
 * configuration error instead of silently talking to a placeholder backend
 * (mirrors the same guard in the coach dashboard's supabase.ts).
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder-project.supabase.co',
  supabaseAnonKey ?? 'placeholder-anon-key',
  {
    ...(isDevPreview ? { global: { fetch: previewFetch } } : {}),
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: !isDevPreview,
      persistSession: !isDevPreview,
      ...(isDevPreview ? { storageKey: 'trace-preview-auth' } : {}),
      detectSessionInUrl: false,
    },
  },
);
