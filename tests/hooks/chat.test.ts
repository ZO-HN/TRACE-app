import { act } from 'react-test-renderer';
import { beforeEach, expect, it, vi } from 'vitest';
import { deferred, renderHook } from '../helpers/renderHook';
import { useDirectChat } from '../../src/hooks/useDirectChat';
import type { DirectMessage } from '../../src/lib/chat/types';
const fake = vi.hoisted(() => ({ read: vi.fn(), send: vi.fn(), receive: (_: { new: unknown }) => {} }));
vi.mock('expo-crypto', () => ({ randomUUID: () => crypto.randomUUID() }));
vi.mock('../../src/lib/supabase', () => ({ supabase: {
  rpc: (name: string, payload: unknown) => name === 'get_direct_messages_page' ? fake.read(payload) : fake.send(payload),
  channel: () => { const channel = { on: (_event: unknown, _filter: unknown, cb: typeof fake.receive) => { fake.receive = cb; return channel; }, subscribe: () => channel }; return channel; },
  removeChannel: vi.fn(),
} }));
const message = (id: string, peer = 'b', time = '2026-11-07T00:01:00Z'): DirectMessage => ({ id, sender_id: 'a', recipient_id: peer, content: id, created_at: time, read_at: null });
beforeEach(() => {
  fake.read.mockReset().mockResolvedValue({ data: [], error: null });
  fake.send.mockReset().mockImplementation(async p => ({ data: { ...message(p.p_message_id, p.p_recipient_id), content: p.p_content }, error: null }));
});
it('loads newest paged history and preserves realtime messages received during loading', async () => {
  const wait = deferred<{ data: DirectMessage[]; error: null }>(); fake.read.mockReturnValue(wait.promise);
  const hook = await renderHook(() => useDirectChat('a', 'b'));
  await act(async () => fake.receive({ new: message('new') }));
  await act(async () => wait.resolve({ data: [message('old', 'b', '2026-11-07T00:00:00Z')], error: null }));
  expect(hook.current.messages.map(m => m.id)).toEqual(['old', 'new']);
  expect(fake.read).toHaveBeenCalledWith({ p_owner_id: 'a', p_peer_id: 'b', p_limit: 50 });
});
it('hides old conversation data and rejects its late send callback after peer changes', async () => {
  fake.read.mockResolvedValueOnce({ data: [message('old')], error: null }); let peer = 'b';
  const hook = await renderHook(() => useDirectChat('a', peer)); const oldSend = hook.current.send;
  fake.read.mockReturnValue(new Promise(() => {})); peer = 'c'; await hook.rerender();
  expect(hook.current.messages).toEqual([]); await expect(oldSend('private old draft')).rejects.toThrow('conversation changed'); expect(fake.send).not.toHaveBeenCalled();
});
it('retries the same send identity after response loss and clears error only on confirmation', async () => {
  const hook = await renderHook(() => useDirectChat('a', 'b'));
  fake.send.mockResolvedValueOnce({ data: null, error: { message: 'Response lost' } });
  await act(async () => { await expect(hook.current.send('hello')).rejects.toThrow(); });
  await act(async () => { await hook.current.send('hello'); });
  expect(fake.send.mock.calls[1]).toEqual(fake.send.mock.calls[0]); expect(hook.current.error).toBeNull(); expect(hook.current.messages[0].content).toBe('hello');
});
it('uses timestamp/id cursor, deduplicates realtime overlap and retains history after page failure', async () => {
  const rows = Array.from({ length: 50 }, (_, i) => message(`m${String(50-i).padStart(2,'0')}`));
  fake.read.mockResolvedValueOnce({ data: rows, error: null }); const hook = await renderHook(() => useDirectChat('a', 'b'));
  expect(hook.current.hasMore).toBe(true);
  fake.read.mockRejectedValueOnce(new Error('Offline')); await act(async () => { await hook.current.loadOlder(); }); expect(hook.current.messages).toHaveLength(50);
  const wait = deferred<{ data: DirectMessage[]; error: null }>(); fake.read.mockReturnValueOnce(wait.promise);
  let reading!: Promise<void>; await act(async () => { reading = hook.current.loadOlder(); });
  await act(async () => fake.receive({ new: message('m00','b','2026-11-06T00:00:00Z') }));
  await act(async () => { wait.resolve({ data: [message('m00','b','2026-11-06T00:00:00Z')], error: null }); await reading; });
  expect(fake.read.mock.lastCall?.[0]).toMatchObject({ p_before_id: 'm01', p_before: rows[49].created_at });
  expect(hook.current.messages).toHaveLength(51); expect(hook.current.hasMore).toBe(false);
});
it('coalesces repeated sends and releases its lock after a synchronous transport exception', async () => {
  const hook = await renderHook(() => useDirectChat('a', 'b'));
  fake.send.mockImplementationOnce(() => { throw new Error('Transport failed'); });
  await act(async () => { const first = hook.current.send('hello'); expect(hook.current.send('hello')).toBe(first); await expect(first).rejects.toThrow('Transport failed'); });
  await act(async () => { await hook.current.send('hello'); }); expect(hook.current.messages).toHaveLength(1);
});
