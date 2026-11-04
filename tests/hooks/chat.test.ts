import { act } from 'react-test-renderer';
import { beforeEach, expect, it, vi } from 'vitest';
import { deferred, renderHook } from '../helpers/renderHook';
import { useDirectChat } from '../../src/hooks/useDirectChat';
import type { DirectMessage } from '../../src/lib/chat/types';

const fake = vi.hoisted(() => ({ read: vi.fn(), order: vi.fn(), send: vi.fn(), receive: (_: { new: unknown }) => {} }));
vi.mock('../../src/lib/supabase', () => ({ supabase: {
  from: () => {
    let inserting = false;
    const query = { select: () => query, or: () => query,
      order: (...args: unknown[]) => { fake.order(...args); return query; }, limit: () => fake.read(),
      insert: () => { inserting = true; return query; }, single: () => inserting ? fake.send() : fake.read() };
    return query;
  },
  channel: () => {
    const channel = { on: (_event: unknown, _filter: unknown, cb: typeof fake.receive) => { fake.receive = cb; return channel; }, subscribe: () => channel };
    return channel;
  }, removeChannel: vi.fn(),
} }));
const message = (id: string, peer = 'b'): DirectMessage => ({ id, sender_id: 'a', recipient_id: peer, content: id,
  created_at: `2026-09-29T00:0${id === 'old' ? 0 : 1}:00Z`, read_at: null });
beforeEach(() => {
  fake.order.mockReset();
  fake.read.mockReset().mockResolvedValue({ data: [], error: null });
  fake.send.mockReset().mockResolvedValue({ data: message('new'), error: null });
});

it('loads the newest 200 messages and preserves messages received during history loading', async () => {
  const load = deferred<{ data: DirectMessage[]; error: null }>();
  fake.read.mockReturnValue(load.promise);
  const hook = await renderHook(() => useDirectChat('a', 'b'));
  await act(async () => fake.receive({ new: message('new') }));
  await act(async () => load.resolve({ data: [message('old')], error: null }));
  expect(hook.current.messages.map((m) => m.id)).toEqual(['old', 'new']);
  expect(fake.order).toHaveBeenCalledWith('created_at', { ascending: false });
});

it('clears old conversation data immediately when switching peers', async () => {
  fake.read.mockResolvedValue({ data: [message('old')], error: null });
  let peer = 'b';
  const hook = await renderHook(() => useDirectChat('a', peer));
  fake.read.mockReturnValue(new Promise(() => {}));
  peer = 'c';
  await hook.rerender();
  expect(hook.current.messages).toEqual([]);
});

it('clears a previous send error after a successful retry', async () => {
  const hook = await renderHook(() => useDirectChat('a', 'b'));
  fake.send.mockResolvedValueOnce({ data: null, error: { message: 'Offline' } });
  await act(async () => { await expect(hook.current.send('hello')).rejects.toBeDefined(); });
  await act(async () => { await hook.current.send('hello'); });
  expect(hook.current.error).toBeNull();
});
