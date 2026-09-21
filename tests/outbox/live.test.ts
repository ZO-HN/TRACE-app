import { beforeEach, expect, it, vi } from 'vitest';
import { __setOutboxDriver, getAllOutboxItems, putOutboxItem } from '../../src/lib/outbox/db';
import { createMemoryOutboxDriver } from '../../src/lib/outbox/memoryDriver';
import { flushOutboxLive, resetRetries } from '../../src/lib/outbox/sync';
import { useOutboxStore } from '../../src/lib/outbox/outboxStore';
import type { OutboxItem } from '../../src/lib/outbox/types';

const fake = vi.hoisted(() => ({ user: 'a', tokens: [] as string[], requests: vi.fn() }));
vi.mock('../../src/lib/supabase', () => ({
  supabaseUrl: 'https://example.invalid', supabaseAnonKey: 'test',
  supabase: { auth: { getSession: async () => ({data:{session:fake.user ? {user:{id:fake.user},access_token:`token-${fake.user}`} : null}}) } },
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: (_url: string, _key: string, options: {global:{headers:{Authorization:string}}}) => {
  const token = options.global.headers.Authorization;
  return { rpc: async (_name: string, args: unknown) => { fake.tokens.push(token); return fake.requests(args); },
    from: () => ({ upsert: async (args: unknown) => { fake.tokens.push(token); return fake.requests(args); } }) };
} }));
const item = (user = 'a'): OutboxItem => ({id:`session-${user}`,table:'workout_sessions',owner_id:user,status:'syncing',revision:1,attempts:0,updated_at:new Date().toISOString(),payload:{id:`session-${user}`,user_id:user,session_name:'Workout',duration_seconds:120}});
beforeEach(() => {
  __setOutboxDriver(createMemoryOutboxDriver());
  useOutboxStore.setState({items:[]});
  fake.user='a'; fake.tokens=[]; fake.requests.mockReset().mockResolvedValue({error:null});
});
it('recovers an interrupted syncing row after restarting the worker', async () => {
  await putOutboxItem(item());
  await flushOutboxLive('a');
  expect((await getAllOutboxItems())[0].status).toBe('synced');
});
it('serializes concurrent workers and binds requests to the captured account token', async () => {
  await putOutboxItem(item());
  await putOutboxItem(item('b'));
  let inFlight=0, peak=0;
  fake.requests.mockImplementation(async () => { inFlight++; peak=Math.max(peak,inFlight); await Promise.resolve(); inFlight--; return {error:null}; });
  await Promise.all([flushOutboxLive('a'),flushOutboxLive('a')]);
  expect(peak).toBe(1);
  expect(fake.tokens).toEqual(['Bearer token-a']);
  fake.user='b';
  await flushOutboxLive('b');
  expect(fake.tokens).toEqual(['Bearer token-a','Bearer token-b']);
});
it('does not acknowledge a newer session revision with an older response', async () => {
  await putOutboxItem({...item(),status:'pending'});
  fake.requests.mockImplementationOnce(async () => {
    await useOutboxStore.getState().ensureSessionQueued({id:'session-a',user_id:'a',session_name:'Workout',duration_seconds:300});
    return {error:null};
  });
  await flushOutboxLive('a');
  const [newer] = await getAllOutboxItems();
  expect(newer.status).toBe('pending');
  expect(newer.revision).toBe(2);
  await flushOutboxLive('a');
  expect((await getAllOutboxItems())[0].status).toBe('synced');
});
it('manual retry resets only the active owner and replays a lost response', async () => {
  await putOutboxItem({...item(),status:'failed',attempts:5});
  await putOutboxItem({...item('b'),status:'failed',attempts:5});
  await resetRetries('a');
  await flushOutboxLive('a');
  const records=await getAllOutboxItems();
  expect(records.find((i)=>i.owner_id==='a')?.status).toBe('synced');
  expect(records.find((i)=>i.owner_id==='b')?.attempts).toBe(5);
});
