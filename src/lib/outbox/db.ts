// Public outbox persistence API. Same 5-function contract the web version
// had over IndexedDB, so outboxStore.ts and sync.ts need no changes — only
// the backing driver differs (expo-sqlite here instead of idb).
//
// The real driver is loaded via a lazy dynamic import, not a static one:
// expo-sqlite transitively pulls in react-native's Flow-typed sources, which
// plain Node (Vitest) can't parse. As long as tests call __setOutboxDriver
// before any of the functions below run, ./sqliteDriver is never imported
// at all under test.

import type { OutboxItem } from './types';
import type { OutboxDriver } from './driver';

let overrideDriver: OutboxDriver | null = null;
let realDriverPromise: Promise<OutboxDriver> | null = null;

function getRealDriver(): Promise<OutboxDriver> {
  if (!realDriverPromise) {
    realDriverPromise = import('./sqliteDriver').then((m) => m.sqliteOutboxDriver);
  }
  return realDriverPromise;
}

async function getDriver(): Promise<OutboxDriver> {
  return overrideDriver ?? getRealDriver();
}

/** Test-only escape hatch — swap in the in-memory driver. */
export function __setOutboxDriver(next: OutboxDriver): void {
  overrideDriver = next;
}

export async function putOutboxItem(item: OutboxItem): Promise<void> {
  const driver = await getDriver();
  await driver.put(item);
}

export async function getAllOutboxItems(): Promise<OutboxItem[]> {
  const driver = await getDriver();
  return driver.getAll();
}

/** Items not yet confirmed synced (pending, syncing, or failed). */
export async function getUnsyncedItems(): Promise<OutboxItem[]> {
  const all = await getAllOutboxItems();
  return all.filter((i) => i.status !== 'synced');
}

export async function deleteOutboxItem(id: string): Promise<void> {
  const driver = await getDriver();
  await driver.delete(id);
}

export async function clearOutbox(): Promise<void> {
  const driver = await getDriver();
  await driver.clear();
}
