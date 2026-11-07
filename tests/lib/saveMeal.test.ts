import { beforeEach,expect,it,vi } from 'vitest';
import { pendingMealSave,savePersonalMeal } from '../../src/lib/nutrition/saveMeal';
const fake=vi.hoisted(()=>({values:new Map<string,string>(),rpc:vi.fn(),user:'a',writeError:false}));
vi.mock('@react-native-async-storage/async-storage',()=>({default:{getItem:async(k:string)=>fake.values.get(k)??null,setItem:async(k:string,v:string)=>{if(fake.writeError)throw new Error('Disk full');fake.values.set(k,v);},removeItem:async(k:string)=>{fake.values.delete(k);}}}));
vi.mock('expo-crypto',()=>({randomUUID:()=>crypto.randomUUID()}));
vi.mock('../../src/lib/supabase',()=>({supabase:{auth:{getSession:async()=>({data:{session:{user:{id:fake.user}}},error:null})},rpc:(...args:unknown[])=>fake.rpc(...args)}}));
const foods=[{name:'Rice',protein_g:2.25,carbs_g:40,fat_g:null,calories:200}];
beforeEach(()=>{fake.values.clear();fake.user='a';fake.writeError=false;fake.rpc.mockReset().mockImplementation(async(_name,payload)=>({data:payload.p_template_id,error:null}));});
it('persists stable operation and item IDs before sending and resumes after an unknown response',async()=>{
  fake.rpc.mockRejectedValueOnce(new Error('Response lost'));
  await expect(savePersonalMeal('a','Lunch',foods)).rejects.toThrow('Response lost');
  expect(await pendingMealSave('a')).not.toBeNull();
  const sent=fake.rpc.mock.calls[0];
  await savePersonalMeal('a');expect(fake.rpc.mock.calls[1]).toEqual(sent);expect(await pendingMealSave('a')).toBeNull();
});
it('preserves previous request, rejects different content and does not write under another account',async()=>{
  fake.rpc.mockRejectedValueOnce(new Error('Offline'));await expect(savePersonalMeal('a','Lunch',foods)).rejects.toThrow();
  await expect(savePersonalMeal('a','Different',foods)).rejects.toThrow('previous meal');
  fake.user='b';await expect(savePersonalMeal('a')).rejects.toThrow('original account');expect(fake.rpc).toHaveBeenCalledTimes(1);
  expect(await pendingMealSave('a')).not.toBeNull();expect(await pendingMealSave('b')).toBeNull();
});
it('rejects invalid quantities and device save failures before any server operation',async()=>{
  await expect(savePersonalMeal('a','Lunch',[{...foods[0],protein_g:0.001}])).rejects.toThrow('two decimal');
  fake.writeError=true;await expect(savePersonalMeal('a','Lunch',foods)).rejects.toThrow('Disk full');expect(fake.rpc).not.toHaveBeenCalled();
});
