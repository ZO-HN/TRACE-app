import {createElement} from 'react';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import MediaViewer from '../../src/components/media/MediaViewer';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const api=vi.hoisted(()=>({type:'image/png',url:'https://fixture.test/a',retry:vi.fn(),status:null as null|((event:{status:string})=>void),remove:vi.fn(),player:null as any}));
vi.mock('react-native',()=>({Image:'Image',View:'View',Text:'Text',Pressable:'Pressable',Linking:{openURL:async()=>{}}}));
vi.mock('expo-video',()=>({VideoView:'VideoView',useVideoPlayer:()=>api.player}));
vi.mock('../../src/hooks/useMediaUrl',()=>({useMediaUrl:()=>({url:api.url,contentType:api.type,retry:api.retry,loading:false,error:null})}));
let root:ReactTestRenderer|undefined;
beforeEach(()=>{api.type='image/png';api.url='https://fixture.test/a';api.retry.mockReset();api.remove.mockReset();api.player={addListener:(_name:string,fn:typeof api.status)=>{api.status=fn;return {remove:api.remove};}};});
afterEach(async()=>{await act(async()=>root?.unmount());root=undefined;});
it('uses verified image type for extensionless file keys and exposes image reload',async()=>{
  await act(async()=>{root=create(createElement(MediaViewer,{objectKey:'file/a/op'}));});expect(root!.root.findByType('Image' as any).props.source.uri).toBe(api.url);
  await act(async()=>root!.root.findByType('Image' as any).props.onError());expect(JSON.stringify(root!.toJSON())).toContain('could not be displayed');
  await act(async()=>root!.root.findByType('Pressable' as any).props.onPress());expect(api.retry).toHaveBeenCalled();
});
it('surfaces native player errors and removes its listener when the player disappears',async()=>{
  api.type='video/mp4';await act(async()=>{root=create(createElement(MediaViewer,{objectKey:'form-video/a/op'}));});expect(root!.root.findByType('VideoView' as any)).toBeDefined();
  await act(async()=>api.status?.({status:'error'}));expect(JSON.stringify(root!.toJSON())).toContain('could not be displayed');expect(api.remove).toHaveBeenCalled();
});
