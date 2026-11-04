// Thin client for any OpenAI-compatible /chat/completions endpoint. No
// vendor SDK — this is deliberately generic so it works against whatever
// base URL the user configured in src/lib/ai/secureConfig.ts (OpenAI, a
// compatibility proxy for another provider, or a self-hosted model).

import * as FileSystem from 'expo-file-system/legacy';
import type { AICopilotConfig } from './types';
import { validateAIConfig } from './types';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ChatContentPart[];
}

export type ChatContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface ChatCompletionResult {
  ok: true;
  content: string;
}
export interface ChatCompletionError {
  ok: false;
  error: string;
}

const REQUEST_TIMEOUT_MS = 30_000;

export async function chatCompletion(
  config: AICopilotConfig,
  messages: ChatMessage[],
): Promise<ChatCompletionResult | ChatCompletionError> {
  const invalid = validateAIConfig(config);
  if (invalid) return { ok: false, error: invalid };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const claude = config.provider === 'anthropic';
    const claudeContent = (content: ChatMessage['content']) => typeof content === 'string' ? content : content.map((part) => {
      if (part.type === 'text') return part;
      const match = part.image_url.url.match(/^data:([^;]+);base64,(.+)$/s);
      return { type: 'image', source: match ? { type: 'base64', media_type: match[1], data: match[2] } : { type: 'url', url: part.image_url.url } };
    });
    const res = await fetch(`${config.baseUrl.replace(/\/+$/, '')}/${claude ? 'messages' : 'chat/completions'}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(claude ? { 'x-api-key': config.apiKey.trim(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' } : { Authorization: `Bearer ${config.apiKey.trim()}` }),
      },
      body: JSON.stringify(claude ? {
        model: config.model.trim(), max_tokens: 2048,
        system: messages.filter((message) => message.role === 'system').map((message) => typeof message.content === 'string' ? message.content : '').join('\n'),
        messages: messages.filter((message) => message.role !== 'system').map((message) => ({ role: message.role, content: claudeContent(message.content) })),
      } : { model: config.model.trim(), messages }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const hint = res.status === 401 || res.status === 403 ? 'Check your API key and model permissions.' : res.status === 429 ? 'API quota or rate limit reached. Check provider billing or try again later.' : res.status === 404 ? 'Model or endpoint not found. Check the model ID.' : 'Provider request failed. Try again later.';
      return { ok: false, error: `${res.status}: ${hint}` };
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      content?: { type: string; text?: string }[];
    };
    const content = claude ? json.content?.filter((part) => part.type === 'text').map((part) => part.text ?? '').join('\n') : json.choices?.[0]?.message?.content;
    if (!content) return { ok: false, error: 'No response content from the model.' };

    return { ok: true, content };
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      return { ok: false, error: 'Request timed out.' };
    }
    return { ok: false, error: e instanceof Error ? e.message : 'Request failed.' };
  } finally {
    clearTimeout(timeout);
  }
}

export interface TranscriptionResult {
  ok: true;
  text: string;
}
export interface TranscriptionError {
  ok: false;
  error: string;
}

/** Transcribes a local audio file via the configured endpoint's
 * /audio/transcriptions route (the Whisper-compatible shape most
 * OpenAI-compatible providers expose alongside /chat/completions). */
export async function transcribeAudio(
  config: AICopilotConfig,
  fileUri: string,
  mimeType: string,
): Promise<TranscriptionResult | TranscriptionError> {
  if (config.provider === 'gemini' || config.provider === 'anthropic') return { ok: false, error: 'Voice transcription is not supported by this provider integration. Use text input.' };
  const invalid = validateAIConfig(config);
  if (invalid) return { ok: false, error: invalid };
  try {
    const result = await FileSystem.uploadAsync(
      `${config.baseUrl.replace(/\/$/, '')}/audio/transcriptions`,
      fileUri,
      {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        mimeType,
        parameters: { model: 'whisper-1' },
        headers: { Authorization: `Bearer ${config.apiKey}` },
      },
    );

    if (result.status < 200 || result.status >= 300) {
      return { ok: false, error: `${result.status}: ${result.body.slice(0, 200)}` };
    }

    const json = JSON.parse(result.body) as { text?: string };
    if (!json.text) return { ok: false, error: 'No transcription text in the response.' };
    return { ok: true, text: json.text };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Transcription failed.' };
  }
}
