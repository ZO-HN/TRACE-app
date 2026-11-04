// The AI copilot is BYO-key: each user supplies their own API key and
// endpoint (any OpenAI-compatible /chat/completions API — OpenAI itself,
// a compatibility proxy in front of another provider, or a self-hosted
// model). Stored locally only (expo-secure-store), never synced to
// Supabase — see src/lib/ai/secureConfig.ts.

export interface AICopilotConfig {
  provider?: 'openai' | 'gemini' | 'anthropic' | 'custom';
  baseUrl: string; // e.g. "https://api.openai.com/v1"
  apiKey: string;
  model: string; // e.g. "gpt-4o-mini"
}

export const AI_PROVIDERS = {
  openai: { label: 'OpenAI (GPT)', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  gemini: { label: 'Google AI Studio (Gemini)', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-3.8-flash' },
  anthropic: { label: 'Anthropic (Claude)', baseUrl: 'https://api.anthropic.com/v1', model: '' },
  custom: { label: 'Other OpenAI-compatible API', baseUrl: '', model: '' },
} as const;

export function validateAIConfig(config: AICopilotConfig): string | null {
  if (!isAICopilotConfigured(config)) return 'Enter an API key, endpoint, and model ID.';
  try {
    const url = new URL(config.baseUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return 'Use an HTTPS endpoint without credentials, query parameters, or fragments.';
    if (config.provider && config.provider !== 'custom' && config.baseUrl.replace(/\/+$/, '') !== AI_PROVIDERS[config.provider].baseUrl) return 'The endpoint does not match the selected provider.';
  } catch { return 'Enter a valid HTTPS endpoint.'; }
  return null;
}

export const DEFAULT_AI_BASE_URL = 'https://api.openai.com/v1';
export const DEFAULT_AI_MODEL = 'gpt-4o-mini';

export function isAICopilotConfigured(
  config: Partial<AICopilotConfig> | null,
): config is AICopilotConfig {
  return !!config?.baseUrl?.trim() && !!config?.apiKey?.trim() && !!config?.model?.trim();
}
