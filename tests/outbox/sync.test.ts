import { describe, expect, it, vi } from 'vitest';
import { backoffMs, flushOutbox, MAX_ATTEMPTS, retryAt, type FlushDeps } from '../../src/lib/outbox/sync';
import { forUser } from '../../src/lib/outbox/ownership';
import type { OutboxItem } from '../../src/lib/outbox/types';

const now = '2026-01-01T00:00:00.000Z';
const session = (owner = 'a'): OutboxItem => ({ id: `session-${owner}`, owner_id: owner, table: 'workout_sessions', status: 'pending', attempts: 0, updated_at: now,
  payload: { id: `session-${owner}`, user_id: owner, session_name: 'Workout', duration_seconds: 120 } });
const set = (owner = 'a'): OutboxItem => ({ id: `set-${owner}`, owner_id: owner, table: 'set_logs', status: 'pending', attempts: 0, updated_at: now,
  payload: { id: `set-${owner}`, session_id: `session-${owner}`, exercise_id: 'exercise', set_number: 1, weight_kg: 60, reps: 5 } });
function setup(items: OutboxItem[]) {
  const store = new Map(items.map((i) => [i.id, i]));
  const upsert = vi.fn<(...args: unknown[]) => Promise<{error: {message: string} | null}>>().mockResolvedValue({error:null});
  const deps: FlushDeps = { userId: 'a', supabase: {from: () => ({upsert})}, getItems: async () => [...store.values()], saveItem: async (i) => {store.set(i.id,i);}, now: () => now };
  return { store, upsert, deps };
}

describe('durable authenticated delivery', () => {
  it('sends the parent before its sets and skips acknowledged records', async () => {
    const {store,upsert,deps} = setup([set(),session()]);
    expect((await flushOutbox(deps)).synced).toBe(2);
    expect(upsert.mock.calls.map(([p]) => (p as {id:string}).id)).toEqual(['session-a','set-a']);
    expect(store.get('set-a')?.status).toBe('synced');
    expect((await flushOutbox(deps)).synced).toBe(0);
  });
  it('defers children without consuming retries when a parent fails', async () => {
    const {store,upsert,deps} = setup([set(),session()]);
    upsert.mockResolvedValue({error:{message:'offline'}});
    expect(await flushOutbox(deps)).toEqual({synced:0,failed:1,remaining:2});
    expect(store.get('set-a')?.attempts).toBe(0);
    expect(upsert).toHaveBeenCalledTimes(1);
  });
  it('contains thrown network failures and schedules bounded retries', async () => {
    const {store,upsert,deps} = setup([session()]);
    upsert.mockRejectedValue(new Error('connection lost'));
    await flushOutbox(deps);
    expect(store.get('session-a')?.status).toBe('failed');
    await flushOutbox(deps);
    expect(upsert).toHaveBeenCalledTimes(1);
    deps.now = () => '2026-01-01T00:00:01.000Z';
    await flushOutbox(deps);
    expect(upsert).toHaveBeenCalledTimes(2);
    store.set('session-a',{...session(),status:'failed',attempts:MAX_ATTEMPTS});
    deps.now = () => '2026-01-02T00:00:00.000Z';
    await flushOutbox(deps);
    expect(upsert).toHaveBeenCalledTimes(2);
  });
  it('never sends another account or ownerless legacy orphan', async () => {
    const orphan = {...set(), id:'orphan', owner_id:undefined, payload:{...set().payload, session_id:'missing'}} as OutboxItem;
    const {upsert,deps} = setup([session('b'),set('b'),orphan,session()]);
    await flushOutbox(deps);
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0][0]).toEqual(session().payload);
  });
  it('resolves legacy set ownership from a durable parent', () => {
    const legacy = {...set(),owner_id:undefined};
    expect(forUser([session(),legacy], 'a')).toHaveLength(2);
    expect(forUser([session(),legacy], 'b')).toHaveLength(0);
  });
  it('stops before further requests after account switching', async () => {
    const {upsert,deps} = setup([session(),set()]);
    deps.isCurrentUser = vi.fn().mockResolvedValueOnce(true).mockResolvedValue(false);
    await flushOutbox(deps);
    expect(upsert).toHaveBeenCalledTimes(1);
  });
  it('defers a child whose parent has exhausted retries', async () => {
    const {upsert,deps} = setup([{...session(),status:'failed',attempts:MAX_ATTEMPTS},set()]);
    expect((await flushOutbox(deps)).remaining).toBe(2);
    expect(upsert).not.toHaveBeenCalled();
  });
});
it('backoff grows and caps at thirty seconds', () => {
  expect([0,1,2,20].map(backoffMs)).toEqual([1000,2000,4000,30000]);
  expect(retryAt({...session(),status:'synced'})).toBe(Infinity);
});
