// The AI copilot is BYO-key: each user supplies their own API key and
// endpoint (any OpenAI-compatible /chat/completions API — OpenAI itself,
// a compatibility proxy in front of another provider, or a self-hosted
// model). Stored locally only (expo-secure-store), never synced to
// Supabase — see src/lib/ai/secureConfig.ts.

export interface AICopilotConfig {
  baseUrl: string; // e.g. "https://api.openai.com/v1"
  apiKey: string;
  model: string; // e.g. "gpt-4o-mini"
}

export const DEFAULT_AI_BASE_URL = 'https://api.openai.com/v1';
export const DEFAULT_AI_MODEL = 'gpt-4o-mini';

export function isAICopilotConfigured(
  config: Partial<AICopilotConfig> | null,
): config is AICopilotConfig {
  return !!config?.baseUrl?.trim() && !!config?.apiKey?.trim() && !!config?.model?.trim();
}
