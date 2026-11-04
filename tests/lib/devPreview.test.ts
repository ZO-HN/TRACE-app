import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });

it('never enables preview in production, even with the flag set', async () => {
  vi.stubGlobal('__DEV__', false);
  vi.stubEnv('EXPO_PUBLIC_DEV_PREVIEW', '1');
  expect((await import('../../src/lib/devPreview')).isDevPreview).toBe(false);
});

it('requires an explicit development flag', async () => {
  vi.stubGlobal('__DEV__', true);
  vi.stubEnv('EXPO_PUBLIC_DEV_PREVIEW', '0');
  expect((await import('../../src/lib/devPreview')).isDevPreview).toBe(false);
  vi.resetModules();
  vi.stubEnv('EXPO_PUBLIC_DEV_PREVIEW', '1');
  expect((await import('../../src/lib/devPreview')).isDevPreview).toBe(true);
});

it('blocks cloud mutations without sending them to the server', async () => {
  const network = vi.fn();
  vi.stubGlobal('fetch', network);
  const { previewFetch } = await import('../../src/lib/devPreview');
  for (const method of ['POST', 'PATCH', 'PUT', 'DELETE']) {
    expect((await previewFetch('https://example.invalid', { method })).status).toBe(403);
  }
  expect(network).not.toHaveBeenCalled();
});
