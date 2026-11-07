import {act} from 'react-test-renderer';
import {beforeEach,expect,it,vi} from 'vitest';
import {renderHook,deferred} from '../helpers/renderHook';
import {usePublishedMealPlan} from '../../src/hooks/usePublishedMealPlan';
import {parsePublishedPlan,planDayIndex} from '../../src/lib/nutrition/publishedPlan';
const api=vi.hoisted(()=>({rpc:vi.fn(),offline:false,cache:new Map<string,string>()}));
vi.mock('expo-router',async()=>{const {useEffect}=await import('react');return {useFocusEffect:(fn:()=>void|(()=>void))=>useEffect(fn,[fn])};});
vi.mock('@react-native-community/netinfo',()=>({default:{fetch:async()=>({isConnected:!api.offline})}}));
vi.mock('@react-native-async-storage/async-storage',()=>({default:{getItem:async(k:string)=>api.cache.get(k)??null,setItem:async(k:string,v:string)=>{api.cache.set(k,v);}}}));
vi.mock('../../src/lib/supabase',()=>({supabase:{rpc:(...args:unknown[])=>api.rpc(...args)}}));
const plan={id:'assignment',name:'Plan',start_date:'2026-11-07',published_at:'2026-11-07T00:00:00Z',snapshot:{version:1,target_calories:2000,days:[{label:'Day 1',calories:300,protein_g:10,carbs_g:50,fat_g:2,meals:[{name:'Lunch',items:[{food_id:'rice',name:'Rice',serving_size:'100g',servings:1,calories:300,protein_g:10,carbs_g:50,fat_g:2}]}]}]}};
beforeEach(()=>{api.rpc.mockReset().mockResolvedValue({data:plan,error:null});api.offline=false;api.cache.clear();});
it('reads the owned publication, caches the exact snapshot, and reopens it offline',async()=>{
  const hook=await renderHook(()=>usePublishedMealPlan('a'));expect(hook.current.plan?.id).toBe('assignment');
  expect(api.rpc.mock.calls[0][1].p_trainee_id).toBe('a');api.offline=true;
  await act(async()=>hook.current.refresh());expect(hook.current.cached).toBe(true);expect(hook.current.plan?.snapshot.days[0].calories).toBe(300);
});
it('discards old-account responses and does not substitute their cache or plan',async()=>{
  const wait=deferred<{data:unknown,error:null}>();api.rpc.mockReturnValueOnce(wait.promise);
  let user='a';const hook=await renderHook(()=>usePublishedMealPlan(user));user='b';api.rpc.mockResolvedValueOnce({data:null,error:null});await hook.rerender();
  await act(async()=>wait.resolve({data:plan,error:null}));expect(hook.current.plan).toBeNull();expect(api.cache.has('trace:published-meal-plan:v1:a')).toBe(false);
});
it('shows invalid/read failures separately from an empty publication and retries',async()=>{
  api.rpc.mockResolvedValueOnce({data:{id:'bad'},error:null});const hook=await renderHook(()=>usePublishedMealPlan('a'));expect(hook.current.error).toContain('invalid');
  await act(async()=>hook.current.refresh());expect(hook.current.plan?.id).toBe('assignment');
  expect(()=>parsePublishedPlan({...plan,snapshot:{...plan.snapshot,days:[]}})).toThrow();expect(planDayIndex('2026-03-07','2026-03-09')).toBe(2);
});
