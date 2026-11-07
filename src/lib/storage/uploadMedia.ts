// One bounded attempt against a stable operation. Unknown PUT outcomes and 412
// are verified at the same key, never replaced with a guessed fresh upload.
import type {MediaKind,PresignRequest,PresignResponse,UploadResult} from './types';
import {validateUpload} from './policy';
export interface RNFile {uri:string;name:string;type:string;size:number}
export interface UploadIdentity {ownerId:string;operationId:string;recordedDate:string;key?:string}
export interface UploadDeps {
  presign:(request:PresignRequest)=>Promise<PresignResponse>;
  put:(url:string,file:RNFile,headers:Record<string,string>)=>Promise<{ok:boolean;status:number}>;
  finalize:(key:string,ownerId:string)=>Promise<{key:string;ready:boolean}>;
  assertOwner:()=>Promise<void>;
  onPresigned:(key:string)=>Promise<void>;
}
export async function uploadMedia(file:RNFile,kind:MediaKind,deps:UploadDeps,identity:UploadIdentity):Promise<UploadResult>{
  const checked=validateUpload({kind,contentType:file.type,sizeBytes:file.size});
  if(!checked.ok)throw new Error(checked.reason);
  if(!Number.isSafeInteger(file.size)||!identity.ownerId||!identity.operationId)throw new Error('A captured owner, stable upload and whole-byte size are required.');
  const result=(key:string):UploadResult=>({key,contentType:file.type,sizeBytes:file.size,operationId:identity.operationId,recordedDate:identity.recordedDate});
  const verify=async(key:string)=>{await deps.assertOwner();const verified=await deps.finalize(key,identity.ownerId);await deps.assertOwner();if(!verified.ready||verified.key!==key)throw new Error('Unknown upload verification result. Retry the same upload.');return result(key);};
  await deps.assertOwner();
  if(identity.key){
    try{return await verify(identity.key);}catch{await deps.assertOwner();}
  }
  const signed=await deps.presign({kind,filename:file.name,contentType:file.type,sizeBytes:file.size,protocolVersion:2,ownerId:identity.ownerId,operationId:identity.operationId});
  if(signed.protocolVersion!==2||signed.key!==`${kind}/${identity.ownerId}/${identity.operationId}`
    ||signed.uploadHeaders?.['Content-Type']!==file.type||signed.uploadHeaders?.['If-None-Match']!=='*')throw new Error('Upload service needs the current verified-upload protocol.');
  await deps.onPresigned(signed.key);await deps.assertOwner();
  let putFailure:unknown;
  try{const sent=await deps.put(signed.uploadUrl,file,signed.uploadHeaders);if(!sent.ok&&sent.status!==412)putFailure=new Error(`R2 upload failed (HTTP ${sent.status}). Retry this upload.`);}
  catch(cause){putFailure=cause;}
  try{return await verify(signed.key);}catch(cause){await deps.assertOwner();throw putFailure??cause;}
}
