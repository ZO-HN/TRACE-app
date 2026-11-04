import { afterEach, expect, it, vi } from 'vitest';
import { AI_PROVIDERS } from '../../src/lib/ai/types';
import { chatCompletion, transcribeAudio } from '../../src/lib/ai/client';
import { clearAICopilotConfig, loadAICopilotConfig, saveAICopilotConfig } from '../../src/lib/ai/secureConfig';

vi.mock('expo-file-system/legacy', () => ({}));
vi.mock('expo-secure-store', () => ({ setItemAsync: vi.fn(), getItemAsync: vi.fn(), deleteItemAsync: vi.fn() }));
vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));
afterEach(async () => { vi.unstubAllGlobals(); await clearAICopilotConfig(); });

it.each(['openai', 'gemini'] as const)('uses the correct %s endpoint and key', async (provider) => {
  const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: 'Hello' } }] })));
  vi.stubGlobal('fetch', request);
  const config = { provider, ...AI_PROVIDERS[provider], apiKey: 'test-only' };
  expect(await chatCompletion(config, [{ role: 'user', content: 'Hello' }])).toEqual({ ok: true, content: 'Hello' });
  expect(request.mock.calls[0][0]).toBe(`${config.baseUrl}/chat/completions`);
  expect(request.mock.calls[0][1].headers.Authorization).toBe('Bearer test-only');
});

it('maps Claude system, conversation, and image blocks and reads text responses', async () => {
  const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ content: [{ type: 'text', text: 'Hello' }] })));
  vi.stubGlobal('fetch', request);
  const result = await chatCompletion({ provider: 'anthropic', ...AI_PROVIDERS.anthropic, model: 'test-model', apiKey: 'test-only' }, [
    { role: 'system', content: 'Be concise' }, { role: 'user', content: [{ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,YQ==' } }] },
  ]);
  expect(result).toEqual({ ok: true, content: 'Hello' });
  const [url, options] = request.mock.calls[0];
  expect(url).toBe('https://api.anthropic.com/v1/messages');
  expect(options.headers['x-api-key']).toBe('test-only');
  expect(JSON.parse(options.body)).toMatchObject({ system: 'Be concise', max_tokens: 2048, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'YQ==' } }] }] });
});

it('rejects insecure endpoints before sending keys', async () => {
  const request = vi.fn(); vi.stubGlobal('fetch', request);
  expect((await chatCompletion({ baseUrl: 'http://example.com', apiKey: 'secret', model: 'test' }, [])).ok).toBe(false);
  expect(request).not.toHaveBeenCalled();
});

it.each([401, 429, 404])('reports HTTP %s without exposing provider response secrets', async (status) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('secret', { status })));
  const result = await chatCompletion({ ...AI_PROVIDERS.openai, apiKey: 'secret' }, []);
  expect(result.ok).toBe(false);
  expect(JSON.stringify(result)).not.toContain('secret');
});

it('stores browser configuration in memory and clears it', async () => {
  const config = { ...AI_PROVIDERS.gemini, provider: 'gemini' as const, apiKey: 'test-only' };
  await saveAICopilotConfig(config);
  expect(await loadAICopilotConfig()).toEqual(config);
  await clearAICopilotConfig();
  expect(await loadAICopilotConfig()).toBeNull();
});

it('does not send unsupported Gemini transcription requests', async () => {
  expect((await transcribeAudio({ ...AI_PROVIDERS.gemini, provider: 'gemini', apiKey: 'test-only' }, 'file://test', 'audio/m4a')).ok).toBe(false);
});
