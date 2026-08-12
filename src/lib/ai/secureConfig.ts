// Local-only storage for the AI copilot's API key/config — device keychain
// via expo-secure-store, never synced to Supabase or any TRACE server. Each
// user configures their own key; nothing here is shared across devices.

import * as SecureStore from 'expo-secure-store';
import type { AICopilotConfig } from './types';

const STORAGE_KEY = 'trace_ai_copilot_config_v1';

export async function loadAICopilotConfig(): Promise<AICopilotConfig | null> {
  const raw = await SecureStore.getItemAsync(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AICopilotConfig;
  } catch {
    return null;
  }
}

export async function saveAICopilotConfig(config: AICopilotConfig): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(config));
}

export async function clearAICopilotConfig(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}
