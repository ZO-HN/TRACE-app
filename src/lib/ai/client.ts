// Thin client for any OpenAI-compatible /chat/completions endpoint. No
// vendor SDK — this is deliberately generic so it works against whatever
// base URL the user configured in src/lib/ai/secureConfig.ts (OpenAI, a
// compatibility proxy for another provider, or a self-hosted model).

import * as FileSystem from 'expo-file-system/legacy';
import type { AICopilotConfig } from './types';

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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({ model: config.model, messages }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, error: `${res.status} ${res.statusText}${body ? `: ${body.slice(0, 200)}` : ''}` };
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content;
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
