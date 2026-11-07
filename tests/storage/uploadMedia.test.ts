import {expect,it,vi} from 'vitest';
import {uploadMedia,type RNFile,type UploadDeps} from '../../src/lib/storage/uploadMedia';
const file:RNFile={uri:'file:///clip.mp4',name:'clip.mp4',type:'video/mp4',size:100};
const identity={ownerId:'owner',operationId:'operation',recordedDate:'2026-11-08'};
const key='form-video/owner/operation';
function deps(){return {
  presign:vi.fn<UploadDeps['presign']>().mockResolvedValue({uploadUrl:'https://fixture.test/put',key,expiresIn:600,protocolVersion:2,uploadHeaders:{'Content-Type':'video/mp4','If-None-Match':'*'}}),
  put:vi.fn<UploadDeps['put']>().mockResolvedValue({ok:true,status:200}),finalize:vi.fn<UploadDeps['finalize']>().mockResolvedValue({key,ready:true}),
  assertOwner:vi.fn<UploadDeps['assertOwner']>().mockResolvedValue(undefined),onPresigned:vi.fn<UploadDeps['onPresigned']>().mockResolvedValue(undefined),
};}
it('persists the issued key, sends exact signed headers and returns only after verification',async()=>{
  const h=deps();const result=await uploadMedia(file,'form-video',h,identity);
  expect(result).toEqual({key,contentType:'video/mp4',sizeBytes:100,operationId:'operation',recordedDate:'2026-11-08'});
  expect(h.presign).toHaveBeenCalledWith({kind:'form-video',filename:'clip.mp4',contentType:'video/mp4',sizeBytes:100,protocolVersion:2,ownerId:'owner',operationId:'operation'});
  expect(h.onPresigned.mock.invocationCallOrder[0]).toBeLessThan(h.put.mock.invocationCallOrder[0]);
  expect(h.put).toHaveBeenCalledWith('https://fixture.test/put',file,{'Content-Type':'video/mp4','If-None-Match':'*'});expect(h.finalize).toHaveBeenCalledWith(key,'owner');
});
it.each(['lost','precondition','server'] as const)('verifies the same key after an uncertain/duplicate PUT: %s',async(outcome)=>{
  const h=deps();if(outcome==='lost')h.put.mockRejectedValueOnce(new Error('Reply lost'));
  else h.put.mockResolvedValueOnce({ok:false,status:outcome==='precondition'?412:500});
  expect((await uploadMedia(file,'form-video',h,identity)).key).toBe(key);expect(h.presign).toHaveBeenCalledTimes(1);expect(h.finalize).toHaveBeenCalledWith(key,'owner');
});
it('resumes a known verified key without rereading or reuploading an expired local file',async()=>{
  const h=deps();expect((await uploadMedia(file,'form-video',h,{...identity,key})).key).toBe(key);expect(h.presign).not.toHaveBeenCalled();expect(h.put).not.toHaveBeenCalled();
});
it('never fabricates success after finalization fails and retains the exact issued identity',async()=>{
  const h=deps();h.finalize.mockRejectedValueOnce(new Error('Not verified'));
  await expect(uploadMedia(file,'form-video',h,identity)).rejects.toThrow('Not verified');expect(h.onPresigned).toHaveBeenCalledWith(key);
  h.finalize.mockRejectedValueOnce(new Error('Still pending'));h.put.mockResolvedValueOnce({ok:false,status:500});h.finalize.mockRejectedValueOnce(new Error('Still pending'));
  await expect(uploadMedia(file,'form-video',h,{...identity,key})).rejects.toThrow('HTTP 500');expect(h.presign.mock.calls[1][0].operationId).toBe('operation');
});
it('rejects invalid sizes, old protocol responses and local journal failures before PUT',async()=>{
  const h=deps();await expect(uploadMedia({...file,size:60*1024*1024},'form-video',h,identity)).rejects.toThrow('50MB');expect(h.presign).not.toHaveBeenCalled();
  h.presign.mockResolvedValueOnce({uploadUrl:'https://fixture.test',key,expiresIn:600} as any);await expect(uploadMedia(file,'form-video',h,identity)).rejects.toThrow('protocol');expect(h.put).not.toHaveBeenCalled();
  h.onPresigned.mockRejectedValueOnce(new Error('Disk full'));await expect(uploadMedia(file,'form-video',h,identity)).rejects.toThrow('Disk full');expect(h.put).not.toHaveBeenCalled();
});
it('checks captured account ownership again after PUT, before any verification or attachment result',async()=>{
  const h=deps();let changed=false;h.put.mockImplementationOnce(async()=>{changed=true;return {ok:true,status:200};});h.assertOwner.mockImplementation(async()=>{if(changed)throw new Error('Account changed');});
  await expect(uploadMedia(file,'form-video',h,identity)).rejects.toThrow('Account changed');expect(h.finalize).not.toHaveBeenCalled();
});
