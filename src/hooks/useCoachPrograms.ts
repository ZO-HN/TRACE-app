import {useCallback,useRef,useState} from 'react';
import {useFocusEffect} from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {supabase} from '../lib/supabase';
export interface CoachProgramDay {program_id:string;program_name:string;revision:number;anchor_date:string;slot_id:string;label:string;scheduled_date:string;rest:boolean;source:string}
export function parseCoachProgramDays(value:unknown):CoachProgramDay[]{
  if(!Array.isArray(value)||value.length>1000)throw new Error('Invalid program schedule. Reload online.');
  return value.map(row=>{
    if(!row||typeof row.program_id!=='string'||typeof row.program_name!=='string'||typeof row.slot_id!=='string'
      ||typeof row.label!=='string'||typeof row.source!=='string'||typeof row.rest!=='boolean'
      ||!Number.isInteger(row.revision)||row.revision<1||!/^\d{4}-\d{2}-\d{2}$/.test(row.anchor_date)||!/^\d{4}-\d{2}-\d{2}$/.test(row.scheduled_date))
      throw new Error('Invalid program schedule. Reload online.');
    return {program_id:row.program_id,program_name:row.program_name,revision:row.revision,anchor_date:row.anchor_date,slot_id:row.slot_id,label:row.label,scheduled_date:row.scheduled_date,rest:row.rest,source:row.source};
  });
}
export function useCoachPrograms(userId:string,coachId:string|null,from:string,to:string){
  const key=JSON.stringify([userId,coachId,from,to]);const owner=useRef(key);owner.current=key;
  const [attempt,setAttempt]=useState(0);
  const [state,setState]=useState({key,days:[] as CoachProgramDay[],loading:true,cached:false,error:null as string|null});
  useFocusEffect(useCallback(()=>{
    let alive=true;const current=()=>alive&&owner.current===key;const cacheKey=`trace:coach-program-days:v1:${key}`;
    setState({key,days:[],loading:true,cached:false,error:null});
    void(async()=>{try{
      if(!coachId){if(current())setState({key,days:[],loading:false,cached:false,error:null});return;}
      const network=await NetInfo.fetch();
      if(network.isConnected===false||network.isInternetReachable===false){
        const raw=await AsyncStorage.getItem(cacheKey);if(!raw)throw new Error('Connect to download the current program schedule.');
        const entry=JSON.parse(raw);if(entry.key!==key)throw new Error('Program schedule cache belongs to another selection.');
        const days=parseCoachProgramDays(entry.days);if(current())setState({key,days,loading:false,cached:true,error:null});return;
      }
      const result=await supabase.rpc('get_coach_program_schedule',{p_trainee_id:userId,p_from:from,p_to:to});
      if(result.error)throw new Error(result.error.message);const days=parseCoachProgramDays(result.data);
      if(!current())return;await AsyncStorage.setItem(cacheKey,JSON.stringify({key,days})).catch(()=>undefined);
      if(current())setState({key,days,loading:false,cached:false,error:null});
    }catch(cause){if(current())setState({key,days:[],loading:false,cached:false,error:cause instanceof Error?cause.message:'Could not load programs.'});}})();
    return()=>{alive=false;};
  },[key,userId,coachId,from,to,attempt]));
  return {...(state.key===key?state:{key,days:[],loading:true,cached:false,error:null}),refresh:()=>setAttempt(n=>n+1)};
}
