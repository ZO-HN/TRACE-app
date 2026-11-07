import {act} from 'react-test-renderer';
import {beforeEach,expect,it,vi} from 'vitest';
import {renderHook,deferred} from '../helpers/renderHook';
import {useCoachSchedule} from '../../src/hooks/useCoachSchedule';
const api=vi.hoisted(()=>({read:vi.fn(),offline:false,cache:new Map<string,string>(),filters:[] as unknown[][]}));
vi.mock('expo-router',async()=>{const {useEffect}=await import('react');return {useFocusEffect:(fn:()=>void|(()=>void))=>useEffect(fn,[fn])};});
vi.mock('@react-native-community/netinfo',()=>({default:{fetch:async()=>({isConnected:!api.offline})}}));
vi.mock('@react-native-async-storage/async-storage',()=>({default:{getItem:async(k:string)=>api.cache.get(k)??null,setItem:async(k:string,v:string)=>{api.cache.set(k,v);}}}));
vi.mock('../../src/lib/supabase',()=>({supabase:{from:()=>{
  const q={select:()=>q,eq:(...args:unknown[])=>{api.filters.push(args);return q;},gte:()=>q,lte:()=>q,order:()=>q,range:(...args:unknown[])=>api.read(...args)};return q;
}}}));
const event=(id:string)=>({id,template_id:`copy-${id}`,workout_name:'Workout',scheduled_date:'2026-11-07',revision:1});
beforeEach(()=>{api.read.mockReset().mockResolvedValue({data:[event('one')],error:null});api.offline=false;api.cache.clear();api.filters=[];});
it('loads only the current trainee/coach and exact copy, reopens explicit offline cache and hides online errors',async()=>{
  const hook=await renderHook(()=>useCoachSchedule('a','coach','2026-11-07','2026-11-13'));
  expect(hook.current.rows[0].template_id).toBe('copy-one');expect(api.filters).toContainEqual(['trainee_id','a']);expect(api.filters).toContainEqual(['coach_id','coach']);expect(api.filters).toContainEqual(['cancelled',false]);
  api.offline=true;await act(async()=>hook.current.refresh());expect(hook.current.cached).toBe(true);
  api.offline=false;api.read.mockRejectedValueOnce(new Error('Access revoked'));await act(async()=>hook.current.refresh());expect(hook.current.rows).toEqual([]);expect(hook.current.error).toBe('Access revoked');
});
it('paginates all rows and does not cache or show a previous account response',async()=>{
  api.read.mockResolvedValueOnce({data:Array.from({length:200},(_,i)=>event(String(i))),error:null}).mockResolvedValueOnce({data:[event('last')],error:null});
  let user='a';const hook=await renderHook(()=>useCoachSchedule(user,'coach','2026-11-07','2026-11-13'));expect(hook.current.rows).toHaveLength(201);
  const wait=deferred<{data:ReturnType<typeof event>[],error:null}>();api.read.mockReturnValueOnce(wait.promise);await act(async()=>hook.current.refresh());
  user='b';await hook.rerender();await act(async()=>wait.resolve({data:[event('secret')],error:null}));expect(hook.current.rows.map(row=>row.id)).toEqual(['one']);
  expect([...api.cache.values()].some(raw=>raw.includes('secret'))).toBe(false);
});
it('invalid cached rows fail visibly and another week never borrows a cached schedule',async()=>{
  let from='2026-11-07';const hook=await renderHook(()=>useCoachSchedule('a','coach',from,'2026-11-13'));
  api.offline=true;from='2026-11-14';await hook.rerender();expect(hook.current.error).toContain('Connect');expect(hook.current.rows).toEqual([]);
  const key=JSON.stringify(['a','coach',from,'2026-11-13']);api.cache.set(`trace:coach-calendar:v1:${key}`,JSON.stringify({key,rows:[{id:'bad'}]}));
  await act(async()=>hook.current.refresh());expect(hook.current.error).toContain('Invalid');
});
