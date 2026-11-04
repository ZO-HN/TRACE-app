import { act } from 'react-test-renderer';
import { beforeEach, expect, it, vi } from 'vitest';
import { renderHook, deferred } from '../helpers/renderHook';
import { useNutritionCatalog } from '../../src/hooks/useNutritionCatalog';

const api = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('../../src/lib/supabase', () => ({ supabase: { from: () => {
  const query = { select: () => query, eq: () => query, order: () => api.read() };
  return query;
} } }));
beforeEach(() => api.read.mockReset().mockResolvedValue({ data: [], error: null }));

it('distinguishes a failed read from an empty catalog and recovers on retry', async () => {
  api.read.mockRejectedValueOnce(new Error('Network unavailable'));
  const hook = await renderHook(() => useNutritionCatalog('custom_foods', 'id', 'a'));
  expect(hook.current.isLoading).toBe(false);
  expect(hook.current.error).toBe('Network unavailable');
  await act(async () => { await hook.current.refresh(); });
  expect(hook.current.rows).toEqual([]);
  expect(hook.current.error).toBeNull();
});

it('rejects stale catalog responses across an account switch', async () => {
  const old = deferred<{ data: { id: string }[]; error: null }>();
  api.read.mockReturnValueOnce(old.promise);
  let user = 'a';
  const hook = await renderHook(() => useNutritionCatalog('favorite_foods', 'id', user));
  user = 'b';
  await hook.rerender();
  await act(async () => old.resolve({ data: [{ id: 'private-a-food' }], error: null }));
  expect(hook.current.rows).toEqual([]);
});
