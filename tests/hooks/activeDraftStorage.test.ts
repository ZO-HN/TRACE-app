import { beforeEach, expect, it, vi } from 'vitest';
import { deferred } from '../helpers/renderHook';
import { listActiveDrafts, readActiveDraft, writeActiveDraft } from '../../src/lib/workout/activeDraftStorage';
const storage = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), remove: vi.fn(), keys: vi.fn() }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: {
  getItem: (...args: unknown[]) => storage.read(...args),
  setItem: (...args: unknown[]) => storage.write(...args),
  removeItem: (...args: unknown[]) => storage.remove(...args),
  getAllKeys: () => storage.keys(),
} }));
beforeEach(() => {
  storage.read.mockReset().mockResolvedValue('saved');
  storage.write.mockReset().mockResolvedValue(undefined);
  storage.remove.mockReset().mockResolvedValue(undefined);
});
it('discovers only valid drafts for the exact owner and persisted selection without network data', async () => {
  const prefix = 'trace:active-workout:v1:';
  storage.keys.mockResolvedValue([`${prefix}a:nondefault`, `${prefix}ab:other`, `${prefix}a:bad`, `${prefix}a:foreign`, 'unrelated']);
  storage.read.mockImplementation(async (key: string) => key.endsWith(':bad') ? 'invalid' : JSON.stringify({
    version: 1, templateId: key.endsWith(':foreign') ? 'foreign' : 'nondefault',
    session: { id: 'session', userId: key.endsWith(':foreign') ? 'b' : 'a', sessionName: 'Saved leg day', startedAtMs: 1 },
    exercises: [], logIds: [], videoKeys: {},
  }));
  expect((await listActiveDrafts('a')).map((draft) => draft.templateId)).toEqual(['nondefault']);
  expect(storage.read).not.toHaveBeenCalledWith(`${prefix}ab:other`);
});
it('waits for earlier draft writes before reading on remount', async () => {
  const pending = deferred<void>();
  storage.write.mockReturnValueOnce(pending.promise);
  const write = writeActiveDraft('a', 'first');
  const read = readActiveDraft('a');
  await Promise.resolve();
  expect(storage.read).not.toHaveBeenCalled();
  pending.resolve();
  await write;
  await expect(read).resolves.toBe('saved');
});
it('orders a finished-workout removal after pending writes', async () => {
  const pending = deferred<void>();
  storage.write.mockReturnValueOnce(pending.promise);
  const write = writeActiveDraft('a', 'first');
  const remove = writeActiveDraft('a', null);
  await Promise.resolve();
  expect(storage.remove).not.toHaveBeenCalled();
  pending.resolve();
  await write;
  await remove;
  expect(storage.remove).toHaveBeenCalledWith('a');
});
it('does not poison later saves after a storage failure', async () => {
  storage.write.mockRejectedValueOnce(new Error('Disk full'));
  await expect(writeActiveDraft('a', 'first')).rejects.toThrow('Disk full');
  await expect(writeActiveDraft('a', 'retry')).resolves.toBeUndefined();
});
