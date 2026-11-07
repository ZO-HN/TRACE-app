import {useEffect,useRef,useState} from 'react';
import {Text,View} from 'react-native';
import type {UseMediaUpload} from '../../hooks/useMediaUpload';
import {listUploadJobs,type UploadJob} from '../../lib/storage/uploadJournal';
import type {MediaKind,UploadResult} from '../../lib/storage/types';
import {useAsyncAction} from '../../hooks/useAsyncAction';
import Button from '../ui/Button';
export default function UploadRecovery({media,kind,onUse,imagesOnly=false,disabled=false,onStart,onEnd}:{media:UseMediaUpload;kind:MediaKind;onUse:(result:UploadResult)=>void|Promise<void>;imagesOnly?:boolean;disabled?:boolean;onStart?:()=>void;onEnd?:()=>void}){
  const [open,setOpen]=useState(false),[offset,setOffset]=useState(0),[attempt,setAttempt]=useState(0);
  const [state,setState]=useState({owner:media.ownerId,loading:false,jobs:[] as UploadJob[],more:false,error:null as string|null});
  const lease=useRef({alive:false});const owner=useRef(media.ownerId);owner.current=media.ownerId;
  useEffect(()=>{const scope={alive:true};lease.current=scope;return()=>{scope.alive=false;};},[media.ownerId]);
  const action=useAsyncAction();
  useEffect(()=>{
    if(!open)return;let alive=true;setState({owner:media.ownerId,loading:true,jobs:[],more:false,error:null});
    void listUploadJobs(media.ownerId,offset).then(page=>{if(alive)setState({owner:media.ownerId,loading:false,...page,error:null});})
      .catch(cause=>{if(alive)setState({owner:media.ownerId,loading:false,jobs:[],more:false,error:cause instanceof Error?cause.message:'Could not load uploads.'});});
    return()=>{alive=false;};
  },[open,media.ownerId,media.status,offset,attempt]);
  const use=(job:UploadJob)=>action.run(async()=>{
    if(disabled)throw new Error('Wait for the current action before recovering another upload.');
    const scope=lease.current;const captured=media.ownerId;
    let started=false;
    try{onStart?.();started=true;const result=await media.resume(job.operationId);
      if(scope.alive&&owner.current===captured)await onUse(result);
    }finally{if(started)onEnd?.();}
  });
  const jobs=state.owner===media.ownerId?state.jobs.filter(job=>job.kind===kind&&(!imagesOnly||job.file.type.startsWith('image/'))):[];
  return <View className="gap-2">
    <Button variant="secondary" size="sm" onPress={()=>setOpen(value=>!value)}>Recover previous uploads</Button>
    {open&&<>
      <Text className="text-gray-400 text-xs">Uploads stay with their original account. Resume verifies the same file before using it here; nothing is attached automatically. Original local date is retained.</Text>
      {state.loading&&<Text className="text-gray-400">Loading upload records…</Text>}
      {state.error&&<Text accessibilityRole="alert" className="text-red-400">{state.error}</Text>}
      {!state.loading&&!state.error&&!jobs.length&&<Text className="text-gray-400">No matching uploads on this page.</Text>}
      {jobs.map(job=><View key={job.operationId} className="gap-1 border border-border rounded p-2">
        <Text className="text-white">{job.file.name} · {job.recordedDate} · {job.ready?'verified upload':'needs verification'}</Text>
        <Button variant="secondary" size="sm" disabled={disabled} loading={action.pending||media.status==='uploading'} onPress={()=>void use(job)}>Resume and use this upload</Button>
      </View>)}
      {action.error&&<Text accessibilityRole="alert" className="text-red-400">{action.error}</Text>}
      <View className="flex-row gap-2 flex-wrap">
        <Button variant="secondary" size="sm" onPress={()=>setAttempt(n=>n+1)}>Reload uploads</Button>
        {offset>0&&<Button variant="secondary" size="sm" onPress={()=>setOffset(n=>Math.max(0,n-20))}>Newer uploads</Button>}
        {state.more&&<Button variant="secondary" size="sm" onPress={()=>setOffset(n=>n+20)}>Older uploads</Button>}
      </View>
    </>}
  </View>;
}
