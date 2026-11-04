import { act } from 'react-test-renderer';
import { beforeEach, expect, it, vi } from 'vitest';
import { renderHook } from '../helpers/renderHook';
import { useBodyweightSettings } from '../../src/hooks/useBodyweightSettings';
import { useNotificationSettings } from '../../src/hooks/useNotificationSettings';
import { useExerciseCatalog } from '../../src/hooks/useExerciseCatalog';

const api = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock('../../src/lib/supabase', () => ({ supabase: {
  from: () => {
    const query = { select: () => query, eq: () => query, order: () => api.read(),
      maybeSingle: () => api.read(), upsert: () => api.write() };
    return query;
  },
} }));
beforeEach(() => {
  api.read.mockReset().mockResolvedValue({ data: null, error: null });
  api.write.mockReset().mockResolvedValue({ error: { code: '42P01', message: 'Unavailable' } });
});

it('does not claim bodyweight settings were saved when the table is missing', async () => {
  const hook = await renderHook(() => useBodyweightSettings('a'));
  const previous = hook.current.settings;
  await act(async () => { expect((await hook.current.update({ weighInReminderEnabled: true })).ok).toBe(false); });
  expect(hook.current.settings).toEqual(previous);
});

it('does not claim notification settings were saved when the table is missing', async () => {
  const hook = await renderHook(() => useNotificationSettings('a'));
  await act(async () => { expect((await hook.current.update({ muteCoaching: true })).ok).toBe(false); });
  expect(hook.current.settings.muteCoaching).toBe(false);
});

it('finishes catalog loading and exposes the backend error for leaderboards', async () => {
  api.read.mockResolvedValue({ data: null, error: { message: 'Network unavailable' } });
  const hook = await renderHook(useExerciseCatalog);
  expect(hook.current.isLoaded).toBe(true);
  expect(hook.current).toHaveProperty('error', 'Network unavailable');
});
