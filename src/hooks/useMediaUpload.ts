import {useEffect,useMemo,useRef,useState} from 'react';
import {supabase} from '../lib/supabase';
import type {MediaKind,UploadResult} from '../lib/storage/types';
import {uploadMedia,type RNFile} from '../lib/storage/uploadMedia';
import {presignViaEdge,putToR2,finalizeViaEdge} from '../lib/storage/presign';
import {createUploadJob,patchUploadJob,readUploadJob,type UploadJob} from '../lib/storage/uploadJournal';
export type UploadStatus='idle'|'uploading'|'done'|'error';
export interface UseMediaUpload {
  ownerId:string;upload:(file:RNFile,kind:MediaKind)=>Promise<UploadResult>;resume:(id:string)=>Promise<UploadResult>;
  status:UploadStatus;error:string|null;result:UploadResult|null;reset:()=>void;
}
const operations=new Map<string,Promise<UploadResult>>();
export function useMediaUpload(ownerId:string):UseMediaUpload{
  const owner=useRef(ownerId);owner.current=ownerId;
  const scope=useMemo(()=>({ownerId,alive:false,intent:'',last:null as UploadJob|null,flight:null as Promise<UploadResult>|null}),[ownerId]);
  const [state,setState]=useState({ownerId,status:'idle' as UploadStatus,error:null as string|null,result:null as UploadResult|null});
  useEffect(()=>{scope.alive=true;return()=>{scope.alive=false;};},[scope]);
  const current=()=>scope.alive&&owner.current===ownerId&&Boolean(ownerId);
  const assertOwner=async()=>{
    if(!current())throw new Error('The active account changed. Reopen this screen.');
    const session=await supabase.auth.getSession();if(session.error)throw session.error;
    if(!current()||session.data.session?.user.id!==ownerId)throw new Error('The active account changed. Recover this upload from its original account.');
  };
  const execute=(intent:string,load:()=>Promise<UploadJob>):Promise<UploadResult>=>{
    if(!current())return Promise.reject(new Error('The active account changed. Reopen this screen.'));
    if(scope.flight)return scope.intent===intent?scope.flight:Promise.reject(new Error('Finish or recover the current upload before starting another.'));
    scope.intent=intent;setState({ownerId,status:'uploading',error:null,result:null});
    const flight=Promise.resolve().then(async()=>{try{
      await assertOwner();const job=await load();scope.last=job;await assertOwner();const key=`${ownerId}:${job.operationId}`;
      let active=operations.get(key);
      if(!active){
        active=(async()=>{
          const result=await uploadMedia(job.file,job.kind,{presign:presignViaEdge,put:putToR2,finalize:finalizeViaEdge,assertOwner,
            onPresigned:async key=>{await patchUploadJob(ownerId,job.operationId,{key});}},
            {ownerId,operationId:job.operationId,recordedDate:job.recordedDate,key:job.key});
          await patchUploadJob(ownerId,job.operationId,{key:result.key,ready:true});return result;
        })();operations.set(key,active);void active.finally(()=>{if(operations.get(key)===active)operations.delete(key);}).catch(()=>undefined);
      }
      const result=await active;await assertOwner();
      if(current())setState({ownerId,status:'done',error:null,result});return result;
    }catch(cause){if(current())setState({ownerId,status:'error',error:cause instanceof Error?cause.message:'Upload failed. Recover or retry the same upload.',result:null});throw cause;}});
    scope.flight=flight;void flight.finally(()=>{if(scope.flight===flight)scope.flight=null;}).catch(()=>undefined);return flight;
  };
  return {ownerId,...(state.ownerId===ownerId?state:{status:'idle' as UploadStatus,error:null,result:null}),
    upload:(file,kind)=>execute(JSON.stringify([file,kind]),async()=>{
      const last=scope.last;
      return last&&last.kind===kind&&JSON.stringify(last.file)===JSON.stringify(file)?readUploadJob(ownerId,last.operationId):createUploadJob(ownerId,file,kind);
    }),resume:id=>execute(`resume:${id}`,()=>readUploadJob(ownerId,id)),
    reset:()=>{if(!current()||scope.flight)return;scope.last=null;setState({ownerId,status:'idle',error:null,result:null});}};
}
