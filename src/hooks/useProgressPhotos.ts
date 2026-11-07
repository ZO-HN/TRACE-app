import {useRef} from 'react';
import {randomUUID} from 'expo-crypto';
import {supabase} from '../lib/supabase';
import type {ProgressPhoto} from '../lib/progressPhotos/types';
import {useOwnedMediaPages,type MediaPageSource} from './useOwnedMediaPages';
const source:MediaPageSource<ProgressPhoto>={
  async page(owner,cursor){
    let query=supabase.from('progress_photos').select('id,taken_date,photo_s3_key,note,created_at').eq('user_id',owner);
    if(cursor)query=query.or(`taken_date.lt.${cursor.date},and(taken_date.eq.${cursor.date},id.lt.${cursor.id})`);
    const result=await query.order('taken_date',{ascending:false}).order('id',{ascending:false}).limit(50);
    if(result.error)throw result.error;return result.data as ProgressPhoto[];
  },cursor:row=>({id:row.id,date:row.taken_date}),
};
export function useProgressPhotos(userId:string){
  const pages=useOwnedMediaPages(userId,source);const owner=useRef(userId);owner.current=userId;
  const add=async(photoKey:string,date:string,note?:string,operationId=randomUUID())=>{
    if(owner.current!==userId||!pages.isCurrent())return {ok:false,error:'The active account changed. Reopen progress photos.'};
    try{
      const result=await supabase.rpc('save_progress_photo',{p_operation_id:operationId,p_owner_id:userId,p_key:photoKey,p_date:date,p_note:note});
      if(result.error)throw new Error(result.error.message);if(result.data!==operationId)throw new Error('Unknown photo save result. Recover the same upload to confirm.');
      if(owner.current!==userId||!pages.isCurrent())return {ok:false,error:'Photo belongs to the original screen/account. Reopen it to confirm.'};
      await pages.refresh();return {ok:true};
    }catch(cause){return {ok:false,error:cause instanceof Error?cause.message:'Could not save photo. Recover the same upload to retry.'};}
  };
  return {photos:pages.rows,isLoading:pages.loading,isPersisted:pages.persisted,error:pages.error,refresh:pages.refresh,
    loadMore:pages.loadMore,hasMore:pages.hasMore,loadingMore:pages.loadingMore,add};
}
