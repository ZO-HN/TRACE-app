import {beforeEach,expect,it,vi} from 'vitest';
import {openCoachProgram,pendingProgramOpen} from '../../src/lib/workout/openCoachProgram';
const api=vi.hoisted(()=>({values:new Map<string,string>(),rpc:vi.fn(),user:'trainee',offline:false,writeError:false}));
vi.mock('@react-native-async-storage/async-storage',()=>({default:{getItem:async(k:string)=>api.values.get(k)??null,setItem:async(k:string,v:string)=>{if(api.writeError)throw new Error('Disk full');api.values.set(k,v);},removeItem:async(k:string)=>{api.values.delete(k);}}}));
vi.mock('expo-crypto',()=>({randomUUID:()=>crypto.randomUUID()}));
vi.mock('@react-native-community/netinfo',()=>({default:{fetch:async()=>({isConnected:!api.offline})}}));
vi.mock('../../src/lib/supabase',()=>({supabase:{auth:{getSession:async()=>({data:{session:{user:{id:api.user}}},error:null})},rpc:(...args:unknown[])=>api.rpc(...args)}}));
const day={program_id:'program',slot_id:'slot',anchor_date:'2026-11-08',scheduled_date:'2026-11-08',revision:1,program_name:'Strength',source:'Group',label:'Training',rest:false};
const copy='82000000-0000-4000-8000-000000000001';
beforeEach(()=>{api.values.clear();api.user='trainee';api.offline=false;api.writeError=false;api.rpc.mockReset().mockResolvedValue({data:copy,error:null});});
it('persists identity before send, retries the exact request after response loss, and reopens its cached grant offline',async()=>{
  api.rpc.mockImplementationOnce(async()=>{expect(await pendingProgramOpen('trainee')).not.toBeNull();throw new Error('Reply lost');});
  await expect(openCoachProgram('trainee',day)).rejects.toThrow('Reply lost');
  await expect(openCoachProgram('trainee',{...day,revision:2})).rejects.toThrow('previous program');
  expect(await openCoachProgram('trainee')).toBe(copy);expect(api.rpc.mock.calls[1]).toEqual(api.rpc.mock.calls[0]);expect(await pendingProgramOpen('trainee')).toBeNull();
  api.offline=true;expect(await openCoachProgram('trainee',day)).toBe(copy);expect(api.rpc).toHaveBeenCalledTimes(2);
  await expect(openCoachProgram('trainee',{...day,revision:2})).rejects.toThrow('Connect once');
});
it('does not write under a new account or send before durable storage and rejects unsupported rest opens',async()=>{
  api.user='other';await expect(openCoachProgram('trainee',day)).rejects.toThrow('account changed');
  api.user='trainee';api.writeError=true;await expect(openCoachProgram('trainee',day)).rejects.toThrow('Disk full');
  await expect(openCoachProgram('trainee',{...day,rest:true})).rejects.toThrow('rest day');expect(api.rpc).not.toHaveBeenCalled();
});
it('clears only definitively rolled-back server failures and retains unknown outcomes for recovery',async()=>{
  api.rpc.mockResolvedValueOnce({data:null,error:{code:'40001',message:'Program changed'}});
  await expect(openCoachProgram('trainee',day)).rejects.toThrow('Program changed');expect(await pendingProgramOpen('trainee')).toBeNull();
  api.rpc.mockResolvedValueOnce({data:'invalid',error:null});await expect(openCoachProgram('trainee',day)).rejects.toThrow('Unknown');expect(await pendingProgramOpen('trainee')).not.toBeNull();
});
