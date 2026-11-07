import {createElement,useEffect} from 'react';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {useMediaUpload} from '../../src/hooks/useMediaUpload';
import {useOwnedMediaPages,type MediaCursor} from '../../src/hooks/useOwnedMediaPages';
import {createUploadJob,listUploadJobs,patchUploadJob,readUploadJob,bindFormCheckUpload} from '../../src/lib/storage/uploadJournal';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const fake=vi.hoisted(()=>({storage:new Map<string,string>(),session:'a',put:vi.fn(),presign:vi.fn(),finalize:vi.fn(),fail:false}));
vi.mock('@react-native-async-storage/async-storage',()=>({default:{getItem:async(k:string)=>fake.storage.get(k)??null,setItem:async(k:string,v:string)=>{if(fake.fail)throw new Error('Disk full');fake.storage.set(k,v);}}}));
vi.mock('expo-crypto',()=>({randomUUID:()=>crypto.randomUUID()}));
vi.mock('expo-router',()=>({useFocusEffect:(callback:()=>void|(()=>void))=>useEffect(callback,[callback])}));
vi.mock('../../src/lib/supabase',()=>({supabase:{auth:{getSession:async()=>({data:{session:{user:{id:fake.session}}},error:null})}}}));
vi.mock('../../src/lib/storage/presign',()=>({presignViaEdge:(...a:unknown[])=>fake.presign(...a),putToR2:(...a:unknown[])=>fake.put(...a),finalizeViaEdge:(...a:unknown[])=>fake.finalize(...a)}));
const file={uri:'file:///clip.mp4',name:'clip.mp4',type:'video/mp4',size:100};
let root:ReactTestRenderer|undefined;
async function render(hook:()=>void){function Probe(){hook();return null;}await act(async()=>{root=create(createElement(Probe));});return Probe;}
function deferred<T>(){let resolve!:(x:T)=>void;const promise=new Promise<T>(r=>{resolve=r;});return {promise,resolve};}
beforeEach(()=>{fake.storage.clear();fake.session='a';fake.fail=false;fake.put.mockReset().mockResolvedValue({ok:true,status:200});
  fake.presign.mockReset().mockImplementation(async p=>({protocolVersion:2,key:`${p.kind}/${p.ownerId}/${p.operationId}`,uploadUrl:'https://fixture.test',uploadHeaders:{'Content-Type':p.contentType,'If-None-Match':'*'}}));
  fake.finalize.mockReset().mockImplementation(async key=>({key,ready:true}));});
afterEach(async()=>{await act(async()=>root?.unmount());root=undefined;});
it('journals before bytes, coalesces taps and reuses exact identity after a lost verification reply',async()=>{
  let media!:ReturnType<typeof useMediaUpload>;await render(()=>{media=useMediaUpload('a');});
  const wait=deferred<{ok:boolean;status:number}>();fake.put.mockReturnValueOnce(wait.promise);
  let first!:ReturnType<typeof media.upload>;await act(async()=>{first=media.upload(file,'form-video');expect(media.upload(file,'form-video')).toBe(first);await Promise.resolve();});
  const jobs=await listUploadJobs('a');expect(jobs.jobs).toHaveLength(1);expect(jobs.jobs[0].key).toContain(jobs.jobs[0].operationId);
  fake.finalize.mockRejectedValueOnce(new Error('Verification reply lost'));
  await act(async()=>{wait.resolve({ok:true,status:200});await expect(first).rejects.toThrow('Verification reply lost');});
  await act(async()=>{await media.upload(file,'form-video');});
  expect(fake.presign).toHaveBeenCalledTimes(1);expect(fake.put).toHaveBeenCalledTimes(1);
  expect((await readUploadJob('a',jobs.jobs[0].operationId)).ready).toBe(true);
});
it('stops old-account completion and leaves its recoverable record out of the next account',async()=>{
  let owner='a',media!:ReturnType<typeof useMediaUpload>;const Probe=await render(()=>{media=useMediaUpload(owner);});
  const wait=deferred<{ok:boolean;status:number}>();fake.put.mockReturnValueOnce(wait.promise);let first!:ReturnType<typeof media.upload>;
  await act(async()=>{first=media.upload(file,'form-video');void first.catch(()=>undefined);await Promise.resolve();});
  owner='b';fake.session='b';await act(async()=>{root!.update(createElement(Probe));});
  await act(async()=>{wait.resolve({ok:true,status:200});await expect(first).rejects.toThrow('account changed');});
  expect(fake.finalize).not.toHaveBeenCalled();expect(media.result).toBeNull();expect((await listUploadJobs('a')).jobs).toHaveLength(1);expect((await listUploadJobs('b')).jobs).toEqual([]);
});
it('retains metadata through storage failures, pages recovery and locks original form exercise',async()=>{
  for(let i=0;i<22;i++)await createUploadJob('a',{...file,name:`clip-${i}.mp4`},'form-video');
  const page=await listUploadJobs('a');expect(page.jobs).toHaveLength(20);expect(page.more).toBe(true);expect((await listUploadJobs('a',20)).jobs).toHaveLength(2);
  const job=page.jobs[0];await patchUploadJob('a',job.operationId,{key:`form-video/a/${job.operationId}`,ready:true});
  await bindFormCheckUpload('a',job.operationId,'exercise');await expect(bindFormCheckUpload('a',job.operationId,'different')).rejects.toThrow('original exercise');
  fake.fail=true;await expect(createUploadJob('a',file,'form-video')).rejects.toThrow('Disk full');expect((await listUploadJobs('a')).jobs).toHaveLength(20);
  fake.fail=false;const key=`trace:media-upload:v2:a:${job.operationId}`;fake.storage.set(key,'broken');await expect(readUploadJob('a',job.operationId)).rejects.toThrow();expect(fake.storage.get(key)).toBe('broken');
});
it('paginates beyond the first fifty and guards owner changes, refresh failures and canceled old pages',async()=>{
  type Row={id:string;date:string|null};const fifty=Array.from({length:50},(_,i)=>({id:String(i),date:'2026-11-08'}));
  const page=vi.fn<(owner:string,cursor:MediaCursor|null)=>Promise<Row[]>>().mockResolvedValueOnce(fifty).mockResolvedValueOnce([{id:'older',date:null}]);
  const source={page,cursor:(row:Row)=>row};let owner='a',state!:ReturnType<typeof useOwnedMediaPages<Row>>;
  const Probe=await render(()=>{state=useOwnedMediaPages(owner,source);});expect(state.rows).toHaveLength(50);expect(state.hasMore).toBe(true);
  await act(async()=>{await state.loadMore();});expect(state.rows).toHaveLength(51);expect(page.mock.calls[1]).toEqual(['a',fifty[49]]);
  page.mockRejectedValueOnce({message:'No network',code:'network'});await act(async()=>{await state.refresh();});expect(state.rows).toHaveLength(51);expect(state.error).toBe('No network');expect(state.hasMore).toBe(false);
  const old=deferred<Row[]>();page.mockReturnValueOnce(old.promise);await act(async()=>{void state.refresh();});
  page.mockResolvedValueOnce([]);owner='b';await act(async()=>{root!.update(createElement(Probe));});expect(state.rows).toEqual([]);
  await act(async()=>{old.resolve([{id:'stale',date:null}]);});expect(state.rows).toEqual([]);
  page.mockRejectedValueOnce({code:'42P01',message:'Table missing'});await act(async()=>{await state.refresh();});expect(state.persisted).toBe(false);expect(state.error).toBe('Table missing');
});
