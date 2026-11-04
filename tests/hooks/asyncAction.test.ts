import { act } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import { renderHook, deferred } from '../helpers/renderHook';
import { useAsyncAction } from '../../src/hooks/useAsyncAction';

it('serializes repeated taps before React has rendered a disabled button', async () => {
  const hook = await renderHook(useAsyncAction);
  const save = deferred<void>();
  const action = vi.fn(() => save.promise);
  let pending!: Promise<void>;
  await act(async () => {
    pending = hook.current.run(action);
    await hook.current.run(action);
  });
  expect(action).toHaveBeenCalledTimes(1);
  expect(hook.current.pending).toBe(true);
  await act(async () => { save.resolve(); await pending; });
  expect(hook.current.pending).toBe(false);
});

it('surfaces a rejected save and allows retry', async () => {
  const hook = await renderHook(useAsyncAction);
  await act(async () => { await hook.current.run(async () => { throw new Error('Disk full'); }); });
  expect(hook.current.error).toBe('Disk full');
  expect(hook.current.pending).toBe(false);
  await act(async () => { await hook.current.run(async () => {}); });
  expect(hook.current.error).toBeNull();
});
