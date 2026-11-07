import {useCallback,useMemo,useRef,useState} from 'react';
import {useFocusEffect} from 'expo-router';
export interface MediaCursor {id:string;date:string|null}
export interface MediaPageSource<T> {page:(owner:string,cursor:MediaCursor|null)=>Promise<T[]>;cursor:(row:T)=>MediaCursor}
const message=(cause:unknown)=>cause&&typeof cause==='object'&&'message'in cause?String(cause.message):'Could not load media records.';
export function useOwnedMediaPages<T>(ownerId:string,source:MediaPageSource<T>){
  const owner=useRef(ownerId);owner.current=ownerId;
  const scope=useMemo(()=>({ownerId,alive:false,version:0,cursor:null as MediaCursor|null,more:false,moreFlight:false}),[ownerId]);
  const empty={ownerId,rows:[] as T[],loading:true,loadingMore:false,hasMore:false,persisted:true,error:null as string|null};
  const [state,setState]=useState(empty);
  const load=useCallback(async(append:boolean)=>{
    if(!scope.alive||owner.current!==ownerId||!ownerId||(append&&(scope.moreFlight||!scope.more)))return;
    if(!append){++scope.version;scope.cursor=null;scope.more=false;scope.moreFlight=false;}
    const version=scope.version;const current=()=>scope.alive&&owner.current===ownerId&&version===scope.version;
    const cursor=append?scope.cursor:null;if(append)scope.moreFlight=true;
    setState(s=>({...s,...(s.ownerId===ownerId?{}:{rows:[]}),...(!append?{hasMore:false}:{}),ownerId,loading:!append,loadingMore:append,error:null}));
    try{
      const rows=await source.page(ownerId,cursor);if(!current())return;
      const next=rows.length?source.cursor(rows[rows.length-1]):null;scope.cursor=next;scope.more=rows.length===50;
      setState(s=>{const map=new Map<string,T>();for(const row of append&&s.ownerId===ownerId?s.rows:[])map.set(source.cursor(row).id,row);for(const row of rows)map.set(source.cursor(row).id,row);
        return {ownerId,rows:[...map.values()],loading:false,loadingMore:false,hasMore:scope.more,persisted:true,error:null};});
    }catch(cause){if(current()){const code=cause&&typeof cause==='object'&&'code'in cause?String(cause.code):'';
      setState(s=>({...s,ownerId,loading:false,loadingMore:false,persisted:code!=='42P01'&&code!=='PGRST205',error:message(cause)}));}}
    finally{if(current())scope.moreFlight=false;}
  },[scope,ownerId,source]);
  useFocusEffect(useCallback(()=>{scope.alive=true;void load(false);return()=>{scope.alive=false;};},[scope,load]));
  return {...(state.ownerId===ownerId?state:empty),isCurrent:()=>scope.alive&&owner.current===ownerId,
    refresh:useCallback(()=>load(false),[load]),loadMore:useCallback(()=>load(true),[load])};
}
