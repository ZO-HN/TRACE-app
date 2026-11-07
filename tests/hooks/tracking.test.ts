import { act } from 'react-test-renderer';
import { beforeEach, expect, it, vi } from 'vitest';
import { renderHook, deferred } from '../helpers/renderHook';
import { useNutritionLogs } from '../../src/hooks/useNutritionLogs';
import { useWaterLogs } from '../../src/hooks/useWaterLogs';
import { useSessionSummaries } from '../../src/hooks/useSessionSummaries';
import { useBodyweightLogs } from '../../src/hooks/useBodyweightLogs';
import { useOutboxStore } from '../../src/lib/outbox/outboxStore';
import { __setOutboxDriver } from '../../src/lib/outbox/db';
import { createMemoryOutboxDriver } from '../../src/lib/outbox/memoryDriver';

const api = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock('expo-crypto', () => ({ randomUUID: () => crypto.randomUUID() }));
vi.mock('expo-router', async () => {
  const { useEffect } = await import('react');
  return { useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]) };
});
vi.mock('../../src/lib/supabase', () => ({ supabase: {
  from: () => {
    const query = { select: () => query, eq: () => query, order: () => query, or: () => query, gte: () => query, lt: () => query, range: (...args: unknown[]) => api.read(...args),
      limit: () => api.read(), maybeSingle: () => api.read(), upsert: (...args: unknown[]) => api.write(...args) };
    return query;
  },
} }));
beforeEach(() => {
  __setOutboxDriver(createMemoryOutboxDriver());
  useOutboxStore.setState({ items: [] });
  api.read.mockReset().mockResolvedValue({ data: [], error: null });
  api.write.mockReset().mockResolvedValue({ error: null });
});

it('shows a workout saved offline in history before server delivery', async () => {
  const history = await renderHook(() => useSessionSummaries('a'));
  await act(async () => {
    await useOutboxStore.getState().ensureSessionQueued({
      id: 'session-a', user_id: 'a', session_name: 'Leg day', duration_seconds: 600,
      completed_at: '2026-09-29T05:00:00Z',
    });
  });
  expect(history.current.sessions).toHaveLength(1);
  expect(history.current.sessions[0].session_name).toBe('Leg day');
  const otherUser = await renderHook(() => useSessionSummaries('b'));
  expect(otherUser.current.sessions).toEqual([]);
});

it('shows food logged elsewhere across mounted screens and remounts without double counting', async () => {
  const home = await renderHook(() => useNutritionLogs('a'));
  const addMeal = await renderHook(() => useNutritionLogs('a'));
  await act(async () => { await addMeal.current.logEntry('25g protein, 200 kcal', 2); });
  expect(home.current.entries).toHaveLength(1);
  const reopened = await renderHook(() => useNutritionLogs('a'));
  expect(reopened.current.entries).toHaveLength(1);
  expect(reopened.current.entries[0].meal_slot).toBe(2);
  const otherUser = await renderHook(() => useNutritionLogs('b'));
  expect(otherUser.current.entries).toEqual([]);
});

it('returns a recoverable save error when device storage fails', async () => {
  const driver = createMemoryOutboxDriver();
  __setOutboxDriver({ ...driver, put: async () => { throw new Error('Disk full'); } });
  const hook = await renderHook(() => useNutritionLogs('a'));
  await act(async () => {
    expect(await hook.current.logEntry('200 kcal')).toEqual({ ok: false, error: 'Disk full' });
  });
  expect(hook.current.entries).toEqual([]);
});

it('does not erase a saved meal when an older server read finishes', async () => {
  const read = deferred<{ data: never[]; error: null }>();
  api.read.mockReturnValue(read.promise);
  const hook = await renderHook(() => useNutritionLogs('a'));
  await act(async () => { await hook.current.logEntry('200 kcal'); });
  await act(async () => read.resolve({ data: [], error: null }));
  expect(hook.current.entries).toHaveLength(1);
});

it('deduplicates a server echo while preserving the original offline logging time', async () => {
  const hook = await renderHook(() => useNutritionLogs('a'));
  await act(async () => { await hook.current.logEntry('200 kcal'); });
  const [entry] = hook.current.entries;
  const [item] = useOutboxStore.getState().items;
  await act(async () => { useOutboxStore.setState({ items: [{ ...item, status: 'synced', updated_at: '2030-01-01T00:00:00Z' }] }); });
  api.read.mockResolvedValue({ data: [entry], error: null });
  const reopened = await renderHook(() => useNutritionLogs('a'));
  expect(reopened.current.entries).toEqual([entry]);
  expect(reopened.current.entries[0].logged_at).not.toBe('2030-01-01T00:00:00Z');
});

it.each(['42P01', '42501'])('never reports water saved after backend error %s', async (code) => {
  api.read.mockResolvedValue({ data: { amount_ml: 500 }, error: null });
  api.write.mockResolvedValue({ error: { code, message: 'Write failed' } });
  const hook = await renderHook(() => useWaterLogs('a'));
  await act(async () => { expect((await hook.current.logToday(750)).ok).toBe(false); });
  expect(hook.current.todayMl).toBe(500);
});

it('keeps water unchanged until the write succeeds', async () => {
  api.read.mockResolvedValue({ data: { amount_ml: 500 }, error: null });
  const write = deferred<{ error: null }>();
  api.write.mockReturnValue(write.promise);
  const hook = await renderHook(() => useWaterLogs('a'));
  let saving!: ReturnType<typeof hook.current.logToday>;
  await act(async () => { saving = hook.current.logToday(750); });
  expect(hook.current.todayMl).toBe(500);
  await act(async () => { write.resolve({ error: null }); await saving; });
  expect(hook.current.todayMl).toBe(750);
});

it('exposes a recoverable error when weigh-in loading rejects', async () => {
  api.read.mockRejectedValue(new Error('Connection lost'));
  const hook = await renderHook(() => useBodyweightLogs('a'));
  expect(hook.current.isLoading).toBe(false);
  expect(hook.current.error).toBe('Connection lost');
});

it('does not report a weigh-in saved when the backend rejects it', async () => {
  api.write.mockResolvedValue({ error: { message: 'Permission denied' } });
  const hook = await renderHook(() => useBodyweightLogs('a'));
  await act(async () => { expect(await hook.current.logToday(150)).toEqual({ ok: false, error: 'Permission denied' }); });
  expect(hook.current.entries).toEqual([]);
});

it('stores the exact entered kilogram value from the quick logger', async () => {
  const hook = await renderHook(() => useBodyweightLogs('a'));
  await act(async () => { expect((await hook.current.logToday(70.25, undefined, 'kg')).ok).toBe(true); });
  expect(api.write.mock.calls[0][0]).toMatchObject({ user_id: 'a', weight_kg: 70.25 });
});

it('ignores a late weigh-in read after the account changes', async () => {
  const read = deferred<{ data: { id: string; recorded_date: string; weight_kg: number; note: null }[]; error: null }>();
  api.read.mockReturnValueOnce(read.promise).mockResolvedValue({ data: [], error: null });
  let userId = 'a';
  const hook = await renderHook(() => useBodyweightLogs(userId));
  userId = 'b';
  await hook.rerender();
  await act(async () => read.resolve({ data: [{ id: 'a-log', recorded_date: '2026-10-11', weight_kg: 70, note: null }], error: null }));
  expect(hook.current.entries).toEqual([]);
});


it('loads every page of a day rather than truncating totals at 50 entries', async () => {
  const day = '2026-10-31';
  const rows = Array.from({ length: 501 }, (_, index) => ({
    id: `food-${index}`, logged_at: new Date(`${day}T12:00:00`).toISOString(),
    method: 'TYPED', description: 'Food', calories: 10, protein_g: null, carbs_g: null, fat_g: null,
  }));
  api.read.mockResolvedValueOnce({ data: rows.slice(0, 500), error: null })
    .mockResolvedValueOnce({ data: rows.slice(500), error: null });
  const hook = await renderHook(() => useNutritionLogs('a', 50, day));
  expect(hook.current.entries).toHaveLength(501);
  expect(hook.current.entries.reduce((sum, entry) => sum + (entry.calories ?? 0), 0)).toBe(5010);
  expect(api.read.mock.calls).toEqual([[0, 499], [500, 999]]);
});
it('uses the recorded diary day instead of moving an entry with its timestamp, and pages a complete weekly range', async () => {
  const day = '2026-11-07';
  const entries = Array.from({length:501},(_,i)=>({id:`recorded-${i}`,recorded_date:day,logged_at:'2026-11-06T00:00:00Z',method:'TYPED',description:'Food',calories:10,protein_g:0.2,carbs_g:null,fat_g:null}));
  api.read.mockResolvedValueOnce({data:entries.slice(0,500),error:null}).mockResolvedValueOnce({data:entries.slice(500),error:null});
  const hook = await renderHook(() => useNutritionLogs('a', 200, undefined, {from:'2026-11-01',to:'2026-11-08'}));
  expect(hook.current.entries).toHaveLength(501);expect(hook.current.entries.reduce((sum,e)=>sum+(e.calories??0),0)).toBe(5010);
  expect(api.read.mock.calls).toEqual([[0,499],[500,999]]);
});

it('retains a pending daily entry on read failure and deduplicates its server echo on retry', async () => {
  const day = '2026-10-31';
  const loggedAt = new Date(`${day}T12:00:00`).toISOString();
  await useOutboxStore.getState().enqueueNutritionLog({ id: 'pending-food', user_id: 'a', method: 'TYPED', logged_at: loggedAt, calories: 150 });
  api.read.mockResolvedValue({ data: null, error: { message: 'Offline' } });
  const hook = await renderHook(() => useNutritionLogs('a', 50, day));
  expect(hook.current.error).toBe('Offline');
  expect(hook.current.entries).toHaveLength(1);
  expect(hook.current.entries[0].syncStatus).toBe('pending');
  api.read.mockResolvedValue({ data: [{ ...hook.current.entries[0], syncStatus: undefined }], error: null });
  await act(async () => hook.current.refresh());
  expect(hook.current.entries).toHaveLength(1);
  expect(hook.current.error).toBeNull();
});


it.each([
  '1e+3 kcal', '1e-3 kcal', '-1E+3 kcal', '1e309g protein',
  '-0.1 kcal', '-0,1 kcal', '1..2 kcal', '1,,2g protein', '1,2,3 kcal',
  '200 kcal, 1e+3g protein', '1.,2 kcal, 20g protein', '200 kcal, -0,1g fat',
])('rejects invalid nutrition input without persisting any part: %s', async (text) => {
  const driver = createMemoryOutboxDriver();
  __setOutboxDriver(driver);
  const hook = await renderHook(() => useNutritionLogs('a'));
  await act(async () => {
    const result = await hook.current.logEntry(text, 2);
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });
  expect(hook.current.entries).toEqual([]);
  expect(useOutboxStore.getState().items).toEqual([]);
  expect(await driver.getAll()).toEqual([]);
});

it.each(['12.5', '12,5'])('persists the actual decimal quantity %s through quick-entry validation', async (quantity) => {
  const hook = await renderHook(() => useNutritionLogs('a'));
  await act(async () => {
    expect(await hook.current.logEntry(`Yogurt,${quantity}g protein,150 kcal`, 2)).toEqual({ ok: true });
  });
  expect(useOutboxStore.getState().items).toHaveLength(1);
  expect(useOutboxStore.getState().items[0].payload).toMatchObject({
    user_id: 'a', meal_slot: 2, protein_g: 12.5, calories: 150,
  });
});


it.each(['g protein', 'g carbs', 'g fat', ' kcal'])(
  'rejects negative duplicate %s quantities before the real save action can enqueue them', async (suffix) => {
    const driver = createMemoryOutboxDriver();
    __setOutboxDriver(driver);
    const hook = await renderHook(() => useNutritionLogs('a'));
    for (const negative of ['-25', '-0.1', '-0,1']) {
      for (const text of [`20${suffix}, ${negative}${suffix}`, `${negative}${suffix}, 20${suffix}`]) {
        await act(async () => {
          const result = await hook.current.logEntry(text, 2);
          expect(result.ok, text).toBe(false);
          expect(result.error, text).toContain('non-negative');
        });
        expect(useOutboxStore.getState().items).toEqual([]);
        expect(await driver.getAll()).toEqual([]);
        expect(hook.current.entries).toEqual([]);
      }
    }
  },
);

it('persists first values for valid duplicate labels through the real save action', async () => {
  const hook = await renderHook(() => useNutritionLogs('a'));
  await act(async () => {
    const result = await hook.current.logEntry('20g protein, 25g protein, 30g carbs, 40g carbs, 5g fat, 6g fat, 200 kcal, 250 kcal');
    expect(result.ok).toBe(true);
  });
  expect(useOutboxStore.getState().items).toHaveLength(1);
  expect(useOutboxStore.getState().items[0].payload).toMatchObject({
    protein_g: 20, carbs_g: 30, fat_g: 5, calories: 200,
  });
});
