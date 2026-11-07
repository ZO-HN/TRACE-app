import {createElement,useEffect} from 'react';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {useMediaUrl} from '../../src/hooks/useMediaUrl';
import {useFormChecks} from '../../src/hooks/useFormChecks';
import {useProgressPhotos} from '../../src/hooks/useProgressPhotos';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const fake=vi.hoisted(()=>({owner:'a',auth:null as null|((event:string,session:{user:{id:string}}|null)=>void),url:vi.fn(),read:vi.fn(),rpc:vi.fn(),calls:[] as unknown[][]}));
vi.mock('expo-router',()=>({useFocusEffect:(fn:()=>void|(()=>void))=>useEffect(fn,[fn])}));
vi.mock('expo-crypto',()=>({randomUUID:()=>crypto.randomUUID()}));
vi.mock('../../src/lib/storage/getUrl',()=>({getMediaUrl:(key:string)=>fake.url(key)}));
vi.mock('../../src/lib/supabase',()=>({supabase:{auth:{getSession:async()=>({data:{session:{user:{id:fake.owner}}}}),onAuthStateChange:(callback:typeof fake.auth)=>{fake.auth=callback;return {data:{subscription:{unsubscribe:vi.fn()}}};}},
  rpc:(...a:unknown[])=>fake.rpc(...a),from:(table:string)=>{const q={select:()=>q,eq:(...a:unknown[])=>{fake.calls.push([table,'eq',...a]);return q;},is:(...a:unknown[])=>{fake.calls.push([table,'is',...a]);return q;},lt:()=>q,or:(value:string)=>{fake.calls.push([table,'or',value]);return q;},order:()=>q,limit:()=>fake.read(table)};return q;}}}));
let root:ReactTestRenderer|undefined;
async function mount(hook:()=>void){function Probe(){hook();return null;}await act(async()=>{root=create(createElement(Probe));});return Probe;}
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(r=>{resolve=r;});return {promise,resolve};}
beforeEach(()=>{fake.owner='a';fake.calls=[];fake.url.mockReset().mockResolvedValue({url:'https://fixture.test/image',expiresIn:600,contentType:'image/png'});
  fake.read.mockReset().mockResolvedValue({data:[],error:null});fake.rpc.mockReset().mockImplementation(async(_name,p)=>({data:p.p_operation_id,error:null}));});
afterEach(async()=>{await act(async()=>root?.unmount());root=undefined;});
it('signed URL follows auth events, discards an old pending link and clears on null media',async()=>{
  let key:string|null='first',media!:ReturnType<typeof useMediaUrl>;const Probe=await mount(()=>{media=useMediaUrl(key);});expect(media.url).toBe('https://fixture.test/image');expect(media.contentType).toBe('image/png');
  const wait=deferred<{url:string;expiresIn:number}>();fake.url.mockReturnValueOnce(wait.promise);key='second';await act(async()=>root!.update(createElement(Probe)));
  await act(async()=>{fake.owner='b';fake.auth?.('SIGNED_IN',{user:{id:'b'}});});
  await act(async()=>wait.resolve({url:'https://fixture.test/stale',expiresIn:600}));expect(media.url).not.toBe('https://fixture.test/stale');
  key=null;await act(async()=>root!.update(createElement(Probe)));expect(media).toMatchObject({url:null,loading:false,error:null});
  key='again';await act(async()=>{fake.auth?.('SIGNED_OUT',null);root!.update(createElement(Probe));});expect(media.url).toBeNull();expect(media.error).toContain('Sign in');
});
it('form history pages nullable legacy dates and submits an exact held operation rather than an upsert',async()=>{
  const legacy={id:'legacy',exercise_id:null,video_key:null,status:'unreviewed',coach_notes:null,submitted_at:null,exercise:null};
  fake.read.mockResolvedValueOnce({data:Array.from({length:50},(_,i)=>({...legacy,id:`${i}`})),error:null}).mockResolvedValueOnce({data:[{...legacy,id:'older'}],error:null});
  let forms!:ReturnType<typeof useFormChecks>;await mount(()=>{forms=useFormChecks('a');});expect(forms.formChecks).toHaveLength(50);expect(forms.formChecks[0].videoKey).toBe('');
  await act(async()=>{await forms.loadMore();});expect(fake.calls).toContainEqual(['form_checks','is','submitted_at',null]);expect(forms.formChecks).toHaveLength(51);
  await act(async()=>{expect(await forms.submit('form-video/a/op','exercise','op')).toEqual({ok:true});});
  expect(fake.rpc).toHaveBeenCalledWith('submit_form_check',{p_operation_id:'op',p_owner_id:'a',p_key:'form-video/a/op',p_exercise_id:'exercise'});
});
it('photos keep captured local day/op, expose receipt uncertainty and reject a stale account submitter',async()=>{
  let owner='a',photos!:ReturnType<typeof useProgressPhotos>;const Probe=await mount(()=>{photos=useProgressPhotos(owner);});const stale=photos.add;
  fake.rpc.mockResolvedValueOnce({data:'wrong',error:null});await act(async()=>{const result=await photos.add('progress-photo/a/op','2026-11-07',undefined,'op');expect(result.ok).toBe(false);expect(result.error).toContain('Unknown');});
  await act(async()=>{await photos.add('progress-photo/a/op','2026-11-07',undefined,'op');});expect(fake.rpc.mock.calls[1]).toEqual(fake.rpc.mock.calls[0]);
  owner='b';await act(async()=>root!.update(createElement(Probe)));const count=fake.rpc.mock.calls.length;
  expect((await stale('key','2026-11-08',undefined,'old')).ok).toBe(false);expect(fake.rpc).toHaveBeenCalledTimes(count);expect(photos.photos).toEqual([]);
});
