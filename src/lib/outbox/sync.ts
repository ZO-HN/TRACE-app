// Durable delivery, authenticated ownership and bounded automatic retries.
import type { OutboxItem } from './types';
import { getAllOutboxItems, putOutboxItem, updateOutboxItem } from './db';
import { forUser } from './ownership';

export const MAX_ATTEMPTS = 5;
export function backoffMs(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, 30_000);
}
export interface OutboxSupabase {
  from(table: string): {
    upsert(values: unknown, options?: { onConflict?: string }): PromiseLike<{ error: { message: string } | null }>;
  };
}
export interface FlushDeps {
  userId: string;
  supabase: OutboxSupabase;
  getItems: () => Promise<OutboxItem[]>;
  saveItem: (item: OutboxItem) => Promise<void>;
  now?: () => string;
  isCurrentUser?: () => Promise<boolean>;
  acknowledge?: (original: OutboxItem, next: OutboxItem) => Promise<void>;
}
export interface FlushResult { synced: number; failed: number; remaining: number; paused?: boolean }

export function retryAt(item: OutboxItem): number {
  if (item.status === 'synced' || item.status === 'syncing' || item.attempts >= MAX_ATTEMPTS) return Infinity;
  return item.status === 'pending' ? 0 : Date.parse(item.updated_at) + backoffMs(Math.max(0, item.attempts - 1));
}

export async function flushOutbox(deps: FlushDeps): Promise<FlushResult> {
  const now = deps.now ?? (() => new Date().toISOString());
  const items = forUser(await deps.getItems(), deps.userId);
  const pending = items.filter((i) => retryAt(i) <= Date.parse(now()))
    .sort((a, b) => Number((b.table ?? 'set_logs') === 'workout_sessions') - Number((a.table ?? 'set_logs') === 'workout_sessions'));
  const sessions = new Map(items.filter((i) => i.table === 'workout_sessions').map((i) => [i.id, i.status]));
  let synced = 0;
  let failed = 0;
  let paused = false;
  const save = deps.acknowledge ?? (async (_original: OutboxItem, next: OutboxItem) => deps.saveItem(next));
  for (const item of pending) {
    if (deps.isCurrentUser && !await deps.isCurrentUser()) { paused = true; break; }
    if ('session_id' in item.payload && sessions.get(item.payload.session_id) !== 'synced') continue;
    await save(item, { ...item, status: 'syncing', updated_at: now() });
    let error: { message: string } | null;
    try {
      ({ error } = await deps.supabase.from(item.table ?? 'set_logs').upsert(item.payload, { onConflict: 'id' }));
    } catch (cause) {
      error = { message: cause instanceof Error ? cause.message : 'Delivery failed' };
    }
    const status = error ? 'failed' : 'synced';
    await save(item, { ...item, status, attempts: error ? item.attempts + 1 : 0, updated_at: now(), last_error: error?.message });
    if (item.table === 'workout_sessions') sessions.set(item.id, status);
    if (error) failed++; else synced++;
  }
  return { synced, failed, remaining: forUser(await deps.getItems(), deps.userId).filter((i) => i.status !== 'synced').length, ...(paused ? { paused: true } : {}) };
}

// One live worker, including across React unmounts/account switches.
let active: Promise<FlushResult> | null = null;
export async function flushOutboxLive(userId: string): Promise<FlushResult> {
  if (active) { await active; return flushOutboxLive(userId); }
  active = (async () => {
    const { supabase } = await import('../supabase');
    // Bind the request client to this session's token. An auth switch while a
    // request is in flight must never send A's payload with B's credentials.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || session.user.id !== userId) return { synced: 0, failed: 0, remaining: 0, paused: true };
    const { createClient } = await import('@supabase/supabase-js');
    const { supabaseUrl, supabaseAnonKey } = await import('../supabase');
    const scoped = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        headers: { Authorization: `Bearer ${session.access_token}` },
        fetch: async (input, init) => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 30_000);
          try { return await fetch(input, { ...init, signal: controller.signal }); }
          finally { clearTimeout(timeout); }
        },
      },
    });
    // Recovery runs only after the previous live worker has finished.
    for (const item of forUser(await getAllOutboxItems(), userId)) {
      if (item.status === 'syncing') await updateOutboxItem(item.id, (current) => current?.status === 'syncing' ? { ...current, status: 'pending' } : undefined);
    }
    return flushOutbox({
      userId,
      supabase: {
        from: (table) => ({ upsert: (payload, options) => table === 'workout_sessions'
          ? scoped.rpc('sync_workout_session', { p_session: payload })
          : scoped.from(table).upsert(payload as Record<string, unknown>, options) }),
      },
      getItems: getAllOutboxItems,
      saveItem: putOutboxItem,
      isCurrentUser: async () => (await supabase.auth.getSession()).data.session?.user.id === userId,
      acknowledge: (original, next) => updateOutboxItem(original.id, (current) =>
        current && (current.revision ?? 0) === (original.revision ?? 0) ? next : undefined),
    });
  })();
  try { return await active; } finally { active = null; }
}

export async function resetRetries(userId: string): Promise<void> {
  if (active) await active;
  for (const item of forUser(await getAllOutboxItems(), userId)) {
    if (item.status !== 'synced') await updateOutboxItem(item.id, (current) => current ? {
      ...current, status: 'pending', attempts: 0, last_error: undefined,
    } : undefined);
  }
}
