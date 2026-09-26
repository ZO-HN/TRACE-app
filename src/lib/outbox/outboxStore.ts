import { create } from 'zustand';
import type { NutritionLogInsert, OutboxItem, SetLogInsert, WorkoutSessionInsert } from './types';
import { getAllOutboxItems, updateOutboxItem } from './db';

interface OutboxState {
  items: OutboxItem[];
  hydrate: () => Promise<void>;
  enqueueSetLog: (payload: SetLogInsert, userId: string) => Promise<OutboxItem>;
  enqueueNutritionLog: (payload: NutritionLogInsert) => Promise<OutboxItem>;
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
  enqueueNutritionLog: (payload) => enqueue('nutrition_logs', payload, payload.user_id),
  ensureSessionQueued: async (payload) => { await enqueue('workout_sessions', payload, payload.user_id); },
  pendingCount: () => get().items.filter((i) => i.status !== 'synced').length,
}));
