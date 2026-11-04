import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  clearAICopilotConfig,
  loadAICopilotConfig,
  saveAICopilotConfig,
} from '../lib/ai/secureConfig';
import { isAICopilotConfigured, type AICopilotConfig } from '../lib/ai/types';

export interface UseAICopilotConfig {
  config: AICopilotConfig | null;
  isConfigured: boolean;
  isLoading: boolean;
  save: (config: AICopilotConfig) => Promise<void>;
  clear: () => Promise<void>;
}

export function useAICopilotConfig(): UseAICopilotConfig {
  const [config, setConfig] = useState<AICopilotConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    void loadAICopilotConfig().then((c) => {
      if (!cancelled) {
        setConfig(c);
        setIsLoading(false);
      }
    }).catch(() => { if (!cancelled) { setConfig(null); setIsLoading(false); } });
    return () => {
      cancelled = true;
    };
  }, []));

  const save = useCallback(async (next: AICopilotConfig) => {
    await saveAICopilotConfig(next);
    setConfig(next);
  }, []);

  const clear = useCallback(async () => {
    await clearAICopilotConfig();
    setConfig(null);
  }, []);

  return { config, isConfigured: isAICopilotConfigured(config), isLoading, save, clear };
}
