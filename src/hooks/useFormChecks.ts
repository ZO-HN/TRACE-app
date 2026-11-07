import {useRef} from 'react';
import {randomUUID} from 'expo-crypto';
import {supabase} from '../lib/supabase';
import type {FormCheck,FormCheckStatus} from '../lib/formChecks/types';
import {useOwnedMediaPages,type MediaPageSource} from './useOwnedMediaPages';
interface Row{id:string;exercise_id:string|null;video_key:string|null;status:FormCheckStatus;coach_notes:string|null;submitted_at:string|null;exercise:{name:string}|null}
const source:MediaPageSource<Row>={
  async page(owner,cursor){
    let query=supabase.from('form_checks').select('id,exercise_id,video_key,status,coach_notes,submitted_at,exercise:exercises(name)').eq('client_id',owner);
    if(cursor?.date===null)query=query.is('submitted_at',null).lt('id',cursor.id);
    else if(cursor)query=query.or(`submitted_at.lt.${cursor.date},and(submitted_at.eq.${cursor.date},id.lt.${cursor.id}),submitted_at.is.null`);
    const result=await query.order('submitted_at',{ascending:false,nullsFirst:false}).order('id',{ascending:false}).limit(50);
    if(result.error)throw result.error;return result.data as unknown as Row[];
  },cursor:row=>({id:row.id,date:row.submitted_at}),
};
export function useFormChecks(userId:string){
  const pages=useOwnedMediaPages(userId,source);const owner=useRef(userId);owner.current=userId;
  const submit=async(videoKey:string,exerciseId?:string|null,operationId=randomUUID())=>{
    if(owner.current!==userId||!pages.isCurrent())return {ok:false,error:'The active account changed. Reopen form checks.'};
    try{
      const result=await supabase.rpc('submit_form_check',{p_operation_id:operationId,p_owner_id:userId,p_key:videoKey,p_exercise_id:exerciseId??undefined});
      if(result.error)throw new Error(result.error.message);if(result.data!==operationId)throw new Error('Unknown submission result. Confirm using the same upload.');
      if(owner.current!==userId||!pages.isCurrent())return {ok:false,error:'Submission belongs to the original screen/account. Reopen it to confirm.'};
      await pages.refresh();return {ok:true};
    }catch(cause){return {ok:false,error:cause instanceof Error?cause.message:'Could not submit form check. Recover the same upload to retry.'};}
  };
  const formChecks:FormCheck[]=pages.rows.map(row=>({id:row.id,exerciseId:row.exercise_id,exerciseName:row.exercise?.name??null,videoKey:row.video_key??'',
    status:row.status,coachNotes:row.coach_notes,submittedAt:row.submitted_at??''}));
  return {formChecks,isLoading:pages.loading,error:pages.error,refresh:pages.refresh,loadMore:pages.loadMore,hasMore:pages.hasMore,loadingMore:pages.loadingMore,submit};
}
