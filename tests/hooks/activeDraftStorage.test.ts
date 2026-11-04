import { beforeEach, expect, it, vi } from 'vitest';
import { deferred } from '../helpers/renderHook';
import { readActiveDraft, writeActiveDraft } from '../../src/lib/workout/activeDraftStorage';
const storage = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), remove: vi.fn() }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: {
  getItem: (...args: unknown[]) => storage.read(...args),
  setItem: (...args: unknown[]) => storage.write(...args),
  removeItem: (...args: unknown[]) => storage.remove(...args),
} }));
beforeEach(() => {
  storage.read.mockReset().mockResolvedValue('saved');
  storage.write.mockReset().mockResolvedValue(undefined);
  storage.remove.mockReset().mockResolvedValue(undefined);
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
