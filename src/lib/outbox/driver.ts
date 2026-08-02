// Storage-backend contract for the outbox. db.ts delegates to whichever
// driver is active — expo-sqlite on-device, an in-memory Map in tests (Node
// has no SQLite binding, and faking SQLite itself isn't worth it when the
// tests only need to exercise db.ts's contract).

import type { OutboxItem } from './types';

export interface OutboxDriver {
  put(item: OutboxItem): Promise<void>;
  getAll(): Promise<OutboxItem[]>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}
