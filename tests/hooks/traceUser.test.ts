import { act } from 'react-test-renderer';
import { beforeEach, expect, it, vi } from 'vitest';
import { deferred, renderHook } from '../helpers/renderHook';
import { useTraceUser } from '../../src/hooks/useTraceUser';

const api = vi.hoisted(() => {
  Object.assign(globalThis, { __DEV__: false });
  return { session: vi.fn(), read: vi.fn(), cache: vi.fn(),
    event: null as null | ((event: string, session: unknown) => void) };
});
vi.mock('@react-native-community/netinfo', () => ({ default: { fetch: async () => ({ isConnected: true }) } }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: {
  getItem: async () => null, setItem: (...args: unknown[]) => api.cache(...args),
} }));
vi.mock('../../src/lib/supabase', () => ({ supabase: {
  auth: { getSession: () => api.session(), onAuthStateChange: (callback: typeof api.event) => {
    api.event = callback;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  } },
  from: () => { const query = { select: () => query, eq: () => query, single: () => api.read() }; return query; },
} }));

beforeEach(() => {
  api.session.mockReset().mockResolvedValue({ data: { session: { user: { id: 'a' } } }, error: null });
  api.read.mockReset().mockResolvedValue({ data: { id: 'a', coach_id: 'coach' }, error: null });
  api.cache.mockReset().mockResolvedValue(undefined);
});

it('surfaces a rejected session read without an endless loading screen', async () => {
  api.session.mockRejectedValue(new Error('Device storage unavailable'));
  const hook = await renderHook(useTraceUser);
  expect(hook.current.isLoading).toBe(false);
  expect(hook.current.error?.message).toBe('Device storage unavailable');
});

it('does not replace a newer auth event with a delayed initial session', async () => {
  const initial = deferred<unknown>();
  api.session.mockReturnValue(initial.promise);
  const hook = await renderHook(useTraceUser);
  await act(async () => {
    api.event?.('SIGNED_OUT', null);
    initial.resolve({ data: { session: { user: { id: 'a' } } }, error: null });
  });
  expect(hook.current.user).toBeNull();
  expect(hook.current.profile).toBeNull();
  expect(hook.current.isLoading).toBe(false);
});

it('does not restore the previous profile after sign-out during a cache write', async () => {
  const hook = await renderHook(useTraceUser);
  const cache = deferred<void>();
  api.cache.mockReturnValue(cache.promise);
  await act(async () => {
    const refresh = hook.current.refetchProfile();
    await Promise.resolve();
    api.event?.('SIGNED_OUT', null);
    cache.resolve();
    await refresh;
  });
  expect(hook.current.profile).toBeNull();
});

it('rejects failed explicit refresh so callers cannot report a false success', async () => {
  const hook = await renderHook(useTraceUser);
  api.read.mockResolvedValue({ data: null, error: new Error('Network unavailable') });
  await act(async () => { await expect(hook.current.refetchProfile()).rejects.toThrow('Network unavailable'); });
  expect(hook.current.error?.message).toBe('Network unavailable');
});
