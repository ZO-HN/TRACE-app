import { beforeEach, expect, it } from 'vitest';
import { useOutboxStore } from '../../src/lib/outbox/outboxStore';
import { __setOutboxDriver, getAllOutboxItems } from '../../src/lib/outbox/db';
import { createMemoryOutboxDriver } from '../../src/lib/outbox/memoryDriver';
import { parseQuickEntry, hasAnyMacro } from '../../src/lib/nutrition/parseQuickEntry';
import type { NutritionLogInsert } from '../../src/lib/nutrition/types';

beforeEach(() => {
  __setOutboxDriver(createMemoryOutboxDriver());
  useOutboxStore.setState({ items: [] });
});
it('rejects unsendable nutrition before creating a durable queue row, then allows correction', async () => {
  const base: NutritionLogInsert = { id: 'log', user_id: 'a', method: 'TYPED', calories: 150 };
  for (const override of [{ description: 'a'.repeat(281) }, { protein_g: 100000 },
    { calories: 2147483648 }, { calories: 1.5 }, { protein_g: Infinity },
    { carbs_g: -1 }, { meal_slot: 32768 }, { meal_slot: 0 }, { meal_slot: 1.5 }]) {
    await expect(useOutboxStore.getState().enqueueNutritionLog({ ...base, ...override })).rejects.toThrow();
  }
  expect(await getAllOutboxItems()).toEqual([]);
  expect(useOutboxStore.getState().items).toEqual([]);
  await useOutboxStore.getState().enqueueNutritionLog({ ...base, description: '🥣'.repeat(280), protein_g: 99999.9, meal_slot: 32767 });
  expect(await getAllOutboxItems()).toHaveLength(1);
});
it('rejects every out-of-range token including a later duplicate', () => {
  for (const text of ['20g protein, 100000g protein', '150 kcal, 2147483648 kcal', '99999.95g carbs']) {
    expect(hasAnyMacro(parseQuickEntry(text))).toBe(false);
  }
});
it('validates the whole meal before committing, then replays identical IDs without duplicate queue rows', async () => {
  const first: NutritionLogInsert = { id: 'a', user_id: 'owner', method: 'TYPED', calories: 100, logged_at: '2026-11-07T10:00:00Z' };
  await expect(useOutboxStore.getState().enqueueNutritionBatch([first, { ...first, id: 'b', calories: -1 }])).rejects.toThrow();
  expect(await getAllOutboxItems()).toEqual([]);
  const batch = [first, { ...first, id: 'b', calories: 200 }];
  await useOutboxStore.getState().enqueueNutritionBatch(batch);
  await useOutboxStore.getState().enqueueNutritionBatch(batch);
  expect(await getAllOutboxItems()).toHaveLength(2); expect(useOutboxStore.getState().items).toHaveLength(2);
  await expect(useOutboxStore.getState().enqueueNutritionBatch([{ ...first, calories: 99 }, batch[1]])).rejects.toThrow('conflict');
  expect((await getAllOutboxItems())[0].payload).toMatchObject({ calories: 100 });
});
it('does not update the UI mirror or partially save a meal after storage failure', async () => {
  const driver = createMemoryOutboxDriver();
  __setOutboxDriver({ ...driver, putNewBatch: async () => { throw new Error('Disk full'); } });
  await expect(useOutboxStore.getState().enqueueNutritionBatch([{ id: 'a', user_id: 'owner', method: 'TYPED', calories: 100 }])).rejects.toThrow('Disk full');
  expect(await getAllOutboxItems()).toEqual([]); expect(useOutboxStore.getState().items).toEqual([]);
});
