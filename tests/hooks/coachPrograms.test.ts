import {act} from 'react-test-renderer';
import {beforeEach,expect,it,vi} from 'vitest';
import {renderHook,deferred} from '../helpers/renderHook';
import {useCoachPrograms} from '../../src/hooks/useCoachPrograms';
const api=vi.hoisted(()=>({rpc:vi.fn(),offline:false,cache:new Map<string,string>()}));
vi.mock('expo-router',async()=>{const {useEffect}=await import('react');return {useFocusEffect:(fn:()=>void|(()=>void))=>useEffect(fn,[fn])};});
vi.mock('@react-native-community/netinfo',()=>({default:{fetch:async()=>({isConnected:!api.offline})}}));
vi.mock('@react-native-async-storage/async-storage',()=>({default:{getItem:async(k:string)=>api.cache.get(k)??null,setItem:async(k:string,v:string)=>{api.cache.set(k,v);}}}));
vi.mock('../../src/lib/supabase',()=>({supabase:{rpc:(...args:unknown[])=>api.rpc(...args)}}));
const day={program_id:'program',slot_id:'slot',anchor_date:'2026-11-08',scheduled_date:'2026-11-08',revision:1,program_name:'Strength',source:'Group',label:'Training',rest:false};
beforeEach(()=>{api.rpc.mockReset().mockResolvedValue({data:[day],error:null});api.offline=false;api.cache.clear();});
it('refreshes live revisions and keeps offline metadata explicitly account/coach/week scoped',async()=>{
  const hook=await renderHook(()=>useCoachPrograms('trainee','coach','2026-11-08','2026-11-14'));expect(hook.current.days[0].revision).toBe(1);
  api.rpc.mockResolvedValueOnce({data:[{...day,revision:2}],error:null});await act(async()=>hook.current.refresh());expect(hook.current.days[0].revision).toBe(2);
  api.offline=true;await act(async()=>hook.current.refresh());expect(hook.current.cached).toBe(true);expect(hook.current.days[0].revision).toBe(2);
});
it('discards an old-account read and fails visibly instead of treating malformed or failed reads as empty',async()=>{
  const wait=deferred<{data:unknown,error:null}>();api.rpc.mockReturnValueOnce(wait.promise);
  let user='old';const hook=await renderHook(()=>useCoachPrograms(user,'coach','2026-11-08','2026-11-14'));
  user='current';api.rpc.mockResolvedValueOnce({data:[],error:null});await hook.rerender();await act(async()=>wait.resolve({data:[day],error:null}));expect(hook.current.days).toEqual([]);
  expect([...api.cache.keys()].some(key=>key.includes('old'))).toBe(false);
  api.rpc.mockResolvedValueOnce({data:[{...day,revision:0}],error:null});await act(async()=>hook.current.refresh());expect(hook.current.error).toContain('Invalid');
});
