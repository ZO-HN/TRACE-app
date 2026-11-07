// Local-only storage for the AI copilot's API key/config — device keychain
// via expo-secure-store, never synced to Supabase or any TRACE server. Each
// user configures their own key; nothing here is shared across devices.

import * as SecureStore from 'expo-secure-store';
import type { AICopilotConfig } from './types';
import { Platform } from 'react-native';
import { isAICopilotConfigured, validateAIConfig } from './types';
import { AI_AVAILABLE, AI_UNAVAILABLE_REASON } from './availability';

let webConfig: AICopilotConfig | null = null;

const STORAGE_KEY = 'trace_ai_copilot_config_v1';

export async function loadAICopilotConfig(): Promise<AICopilotConfig | null> {
  if (!AI_AVAILABLE) return null;
  if (Platform.OS === 'web') return webConfig;
  const raw = await SecureStore.getItemAsync(STORAGE_KEY);
  if (!raw) return null;
  try {
    const config = JSON.parse(raw);
    return isAICopilotConfigured(config) ? config : null;
  } catch {
    return null;
  }
}

export async function saveAICopilotConfig(config: AICopilotConfig): Promise<void> {
  if (!AI_AVAILABLE) throw new Error(AI_UNAVAILABLE_REASON);
  const error = validateAIConfig(config);
  if (error) throw new Error(error);
  if (Platform.OS === 'web') { webConfig = { ...config }; return; }
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(config));
}

export async function clearAICopilotConfig(): Promise<void> {
  if (Platform.OS === 'web') { webConfig = null; return; }
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}
