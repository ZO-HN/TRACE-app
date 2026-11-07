import { create } from 'zustand';
import { nutritionEntryError } from '../nutrition/validation';
import { captureNutritionRecord } from '../nutrition/record';
import type { NutritionLogInsert, OutboxItem, SetLogInsert, WorkoutSessionInsert } from './types';
import { getAllOutboxItems, insertOutboxBatch, updateOutboxItem } from './db';

interface OutboxState {
  items: OutboxItem[];
  hydrate: () => Promise<void>;
  enqueueSetLog: (payload: SetLogInsert, userId: string) => Promise<OutboxItem>;
  enqueueNutritionLog: (payload: NutritionLogInsert) => Promise<OutboxItem>;
  enqueueNutritionBatch: (payloads: NutritionLogInsert[]) => Promise<void>;
  ensureSessionQueued: (payload: WorkoutSessionInsert) => Promise<void>;
  pendingCount: () => number;
}

async function enqueue(table: OutboxItem['table'], payload: OutboxItem['payload'], ownerId: string): Promise<OutboxItem> {
  let queued!: OutboxItem;
  await updateOutboxItem(payload.id, (existing) => {
    queued = { id: payload.id, table, payload, owner_id: ownerId, revision: (existing?.revision ?? 0) + 1,
      status: 'pending', attempts: 0, updated_at: new Date().toISOString() };
    return queued;
  });
  // Persistence has succeeded. A separate read failure must not report the
  // write as failed and cause the UI to enqueue the same set with another ID.
  useOutboxStore.setState((state) => ({ items: [...state.items.filter((item) => item.id !== queued.id), queued] }));
  return queued;
}

export const useOutboxStore = create<OutboxState>((set, get) => ({
  items: [],
  hydrate: async () => { set({ items: await getAllOutboxItems() }); },
  enqueueSetLog: (payload, userId) => enqueue('set_logs', payload, userId),
  enqueueNutritionLog: async (payload) => {
    const error = nutritionEntryError(payload);
    if (error) throw new Error(error);
    return enqueue('nutrition_logs', captureNutritionRecord(payload), payload.user_id);
  },
  enqueueNutritionBatch: async (payloads) => {
    if (!payloads.length || payloads.length > 100) throw new Error('Choose 1 to 100 foods.');
    const owner = payloads[0].user_id;
    if (!owner || payloads.some(p => p.user_id !== owner) || new Set(payloads.map(p => p.id)).size !== payloads.length) throw new Error('Invalid meal owner or identities.');
    const timestamp = new Date().toISOString();
    const items: OutboxItem[] = payloads.map(payload => {
      const error = nutritionEntryError(payload);
      if (error) throw new Error(error);
      return { id: payload.id, table: 'nutrition_logs', payload: captureNutritionRecord(payload, new Date(timestamp)), owner_id: owner, revision: 1, status: 'pending', attempts: 0, updated_at: timestamp };
    });
    const committed = await insertOutboxBatch(items);
    set(state => ({ items: [...state.items.filter(item => !committed.some(next => next.id === item.id)), ...committed] }));
  },
  ensureSessionQueued: async (payload) => { await enqueue('workout_sessions', payload, payload.user_id); },
  pendingCount: () => get().items.filter((i) => i.status !== 'synced').length,
}));
