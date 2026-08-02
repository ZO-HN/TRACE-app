// In-memory outbox driver — used by tests (see driver.ts for why).

import type { OutboxItem } from './types';
import type { OutboxDriver } from './driver';

export function createMemoryOutboxDriver(): OutboxDriver {
  const store = new Map<string, OutboxItem>();

  return {
    async put(item) {
      store.set(item.id, item);
    },
    async getAll() {
      return Array.from(store.values());
    },
    async delete(id) {
      store.delete(id);
    },
    async clear() {
      store.clear();
    },
  };
}
