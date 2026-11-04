import { act } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deferred, renderHook } from '../helpers/renderHook';
import { useWorkoutFolders } from '../../src/hooks/useWorkoutFolders';
import { useWorkoutTemplates } from '../../src/hooks/useWorkoutTemplates';

const api = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), filters: vi.fn() }));
vi.mock('expo-crypto', () => ({ randomUUID: () => 'new-folder' }));
vi.mock('../../src/lib/supabase', () => ({ supabase: { from: () => {
  let writing = false;
  const query = {
    select: () => writing ? api.write() : query,
    eq: (...args: unknown[]) => { api.filters(...args); return query; },
    or: () => query, order: () => api.read(),
    insert: () => { writing = true; return query; },
    update: () => { writing = true; return query; },
    delete: () => { writing = true; return query; },
  };
  return query;
} } }));

beforeEach(() => {
  api.read.mockReset().mockResolvedValue({ data: [], error: null });
  api.write.mockReset().mockResolvedValue({ data: [{ id: 'saved' }], error: null });
  api.filters.mockReset();
});

for (const [label, useLibrary] of [['folders', useWorkoutFolders], ['templates', useWorkoutTemplates]] as const) {
  describe(label, () => {
    it('exposes rejected reads and allows a successful retry', async () => {
      api.read.mockRejectedValueOnce(new Error('Offline'));
      const hook = await renderHook(() => useLibrary('a'));
      expect(hook.current.isLoading).toBe(false);
      expect(hook.current.error).toBe('Offline');
      await act(async () => { await hook.current.refresh(); });
      expect(hook.current.error).toBeNull();
    });

    it('ignores stale reads after switching accounts', async () => {
      const pending = deferred<{ data: { id: string; name: string }[]; error: null }>();
      api.read.mockReturnValueOnce(pending.promise);
      let user = 'a';
      const hook = await renderHook(() => useLibrary(user));
      user = 'b';
      await hook.rerender();
      await act(async () => { pending.resolve({ data: [{ id: 'private-a', name: 'Private' }], error: null }); });
      const state = hook.current;
      expect('folders' in state ? state.folders : state.templates).toEqual([]);
      expect(state.error).toBeNull();
    });

    it('does not let an older refresh overwrite the latest result', async () => {
      const old = deferred<{ data: []; error: { message: string } }>();
      const hook = await renderHook(() => useLibrary('a'));
      api.read.mockReturnValueOnce(old.promise);
      let pending!: Promise<void>;
      await act(async () => { pending = hook.current.refresh(); });
      await act(async () => { await hook.current.refresh(); });
      await act(async () => { old.resolve({ data: [], error: { message: 'Stale failure' } }); await pending; });
      expect(hook.current.error).toBeNull();
    });
  });
}

it('validates folder names before writing and explicitly scopes changes to their owner', async () => {
  const hook = await renderHook(() => useWorkoutFolders('a'));
  expect((await hook.current.createFolder('  ')).ok).toBe(false);
  expect((await hook.current.renameFolder('f', 'x'.repeat(81))).ok).toBe(false);
  expect(api.write).not.toHaveBeenCalled();
  await act(async () => { expect((await hook.current.renameFolder('f', ' Pull ')).ok).toBe(true); });
  expect(api.filters).toHaveBeenCalledWith('id', 'f');
  expect(api.filters).toHaveBeenCalledWith('user_id', 'a');
});

it('reports zero-row folder writes instead of claiming success', async () => {
  const hook = await renderHook(() => useWorkoutFolders('a'));
  api.write.mockResolvedValue({ data: [], error: null });
  expect((await hook.current.deleteFolder('missing')).ok).toBe(false);
});

it('returns rejected folder writes as actionable failures', async () => {
  const hook = await renderHook(() => useWorkoutFolders('a'));
  api.write.mockRejectedValue(new Error('Disconnected'));
  expect(await hook.current.createFolder('Push')).toEqual({ ok: false, error: 'Disconnected' });
});

it('does not claim a denied or zero-row workout move succeeded', async () => {
  const hook = await renderHook(() => useWorkoutTemplates('a'));
  api.write.mockResolvedValueOnce({ data: [], error: null });
  expect((await hook.current.moveToFolder('w', 'f')).ok).toBe(false);
  api.write.mockRejectedValueOnce(new Error('Connection lost'));
  expect(await hook.current.moveToFolder('w', null)).toEqual({ ok: false, error: 'Connection lost' });
});

it('maps successful workout reads including folder and exercise count', async () => {
  api.read.mockResolvedValue({ data: [{ id: 'w', name: 'Push', scope: 'PRIVATE', folder_id: 'f', template_items: [{ count: 3 }] }], error: null });
  const hook = await renderHook(() => useWorkoutTemplates('a'));
  expect(hook.current.templates).toEqual([{ id: 'w', name: 'Push', scope: 'PRIVATE', folderId: 'f', exerciseCount: 3 }]);
});
