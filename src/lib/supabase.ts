import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};
const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl) as
  | string
  | undefined;
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
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
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
