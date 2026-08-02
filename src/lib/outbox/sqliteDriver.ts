// expo-sqlite-backed outbox storage. Durable across app restarts, same as
// the coach dashboard's old IndexedDB outbox was on web.

import * as SQLite from 'expo-sqlite';
import type { OutboxItem } from './types';
import type { OutboxDriver } from './driver';

const DB_NAME = 'trace-outbox.db';

let dbPromise: ReturnType<typeof SQLite.openDatabaseAsync> | null = null;

async function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await db.execAsync(
        'CREATE TABLE IF NOT EXISTS outbox (id TEXT PRIMARY KEY NOT NULL, json TEXT NOT NULL);',
      );
      return db;
    });
  }
  return dbPromise;
}

export const sqliteOutboxDriver: OutboxDriver = {
  async put(item) {
    const db = await getDb();
    await db.runAsync(
      'INSERT OR REPLACE INTO outbox (id, json) VALUES (?, ?);',
      item.id,
      JSON.stringify(item),
    );
  },

  async getAll() {
    const db = await getDb();
    const rows = await db.getAllAsync<{ id: string; json: string }>(
      'SELECT id, json FROM outbox;',
    );
    return rows.map((row) => JSON.parse(row.json) as OutboxItem);
  },

  async delete(id) {
    const db = await getDb();
    await db.runAsync('DELETE FROM outbox WHERE id = ?;', id);
  },

  async clear() {
    const db = await getDb();
    await db.execAsync('DELETE FROM outbox;');
  },
};
