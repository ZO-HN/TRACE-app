import AsyncStorage from '@react-native-async-storage/async-storage';
import {randomUUID} from 'expo-crypto';
import {localDate} from '../localDate';
import type {MediaKind} from './types';
import type {RNFile} from './uploadMedia';
import {validateUpload} from './policy';
export interface UploadJob {ownerId:string;operationId:string;recordedDate:string;kind:MediaKind;file:RNFile;key?:string;ready:boolean;createdAt:string;
  attachment?:{kind:'form-check';exerciseId:string|null}}
const jobKey=(owner:string,id:string)=>`trace:media-upload:v2:${owner}:${id}`;
const indexKey=(owner:string)=>`trace:media-upload-index:v2:${owner}`;
let tail:Promise<unknown>=Promise.resolve();
function serialize<T>(fn:()=>Promise<T>):Promise<T>{const next=tail.then(fn);tail=next.catch(()=>undefined);return next;}
function parse(raw:string|null,owner:string,id:string):UploadJob{
  if(!raw)throw new Error('Upload recovery record is missing. Existing files are retained.');const job=JSON.parse(raw);
  if(job?.ownerId!==owner||job.operationId!==id||typeof job.file?.uri!=='string'||typeof job.file?.name!=='string'
    ||!/^\d{4}-\d{2}-\d{2}$/.test(job.recordedDate)||typeof job.createdAt!=='string'||typeof job.ready!=='boolean'
    ||!validateUpload({kind:job.kind,contentType:job.file?.type,sizeBytes:job.file?.size}).ok
    ||(job.key!==undefined&&job.key!==`${job.kind}/${owner}/${id}`)
    ||(job.attachment!==undefined&&(job.attachment.kind!=='form-check'||(job.attachment.exerciseId!==null&&typeof job.attachment.exerciseId!=='string'))))throw new Error('Upload recovery record is unreadable. It is retained; contact support.');
  return job;
}
export function readUploadJob(owner:string,id:string){return AsyncStorage.getItem(jobKey(owner,id)).then(raw=>parse(raw,owner,id));}
export async function createUploadJob(owner:string,file:RNFile,kind:MediaKind):Promise<UploadJob>{
  const check=validateUpload({kind,contentType:file.type,sizeBytes:file.size});if(!owner||!check.ok||!Number.isSafeInteger(file.size))throw new Error(!check.ok?check.reason:'A signed-in owner and valid file size are required.');
  const job:UploadJob={ownerId:owner,operationId:randomUUID(),recordedDate:localDate(),kind,file:{...file},ready:false,createdAt:new Date().toISOString()};
  return serialize(async()=>{
    const raw=await AsyncStorage.getItem(indexKey(owner));const index=raw?JSON.parse(raw):[];
    if(!Array.isArray(index)||index.some(id=>typeof id!=='string'))throw new Error('Upload index is unreadable. Existing records are retained.');
    await AsyncStorage.setItem(jobKey(owner,job.operationId),JSON.stringify(job));
    await AsyncStorage.setItem(indexKey(owner),JSON.stringify([...index,job.operationId]));return job;
  });
}
export function patchUploadJob(owner:string,id:string,patch:{key?:string;ready?:boolean}){return serialize(async()=>{
  const job=await readUploadJob(owner,id);const next={...job,...patch};
  parse(JSON.stringify(next),owner,id);await AsyncStorage.setItem(jobKey(owner,id),JSON.stringify(next));return next;
});}
export function bindFormCheckUpload(owner:string,id:string,exerciseId:string|null){return serialize(async()=>{
  const job=await readUploadJob(owner,id);if(!job.ready||job.kind!=='form-video'||!job.key)throw new Error('Verify the video before preparing its submission.');
  if(job.attachment){if(job.attachment.exerciseId!==exerciseId)throw new Error('Retry the original exercise selection for this pending submission.');return job;}
  const next:UploadJob={...job,attachment:{kind:'form-check',exerciseId}};
  await AsyncStorage.setItem(jobKey(owner,id),JSON.stringify(next));return next;
});}
export async function listUploadJobs(owner:string,offset=0,limit=20):Promise<{jobs:UploadJob[];more:boolean}>{
  const raw=await AsyncStorage.getItem(indexKey(owner));const ids=raw?JSON.parse(raw):[];
  if(!Array.isArray(ids)||ids.some(id=>typeof id!=='string'))throw new Error('Upload index is unreadable. Existing records are retained.');
  const recent=[...ids].reverse().slice(offset,offset+limit);
  const jobs=await Promise.all(recent.map(id=>readUploadJob(owner,id)));return {jobs,more:offset+limit<ids.length};
}
