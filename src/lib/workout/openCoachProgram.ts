import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {randomUUID} from 'expo-crypto';
import {supabase} from '../supabase';
import type {CoachProgramDay} from '../../hooks/useCoachPrograms';
type Request={p_operation_id:string;p_trainee_id:string;p_program_id:string;p_slot_id:string;p_anchor_date:string;p_expected_revision:number};
const active=new Set<string>();
const pendingKey=(user:string)=>`trace:program-open-pending:v1:${user}`;
const openedKey=(user:string,req:Request)=>`trace:program-opened:v1:${user}:${req.p_program_id}:${req.p_slot_id}:${req.p_anchor_date}`;
export async function pendingProgramOpen(user:string):Promise<Request|null>{
  const raw=await AsyncStorage.getItem(pendingKey(user));if(!raw)return null;const req=JSON.parse(raw);
  if(req?.p_trainee_id!==user||typeof req.p_operation_id!=='string'||typeof req.p_program_id!=='string'||typeof req.p_slot_id!=='string'
    ||!/^\d{4}-\d{2}-\d{2}$/.test(req.p_anchor_date)||!Number.isInteger(req.p_expected_revision)||req.p_expected_revision<1)
    throw new Error('Previous program open is unreadable. It is retained; contact support.');
  return req;
}
export async function openCoachProgram(user:string,day?:CoachProgramDay):Promise<string>{
  if(active.has(user))throw new Error('A program open is already pending.');active.add(user);
  try{
    const previous=await pendingProgramOpen(user);
    const req:Request=day?{p_operation_id:previous?.p_operation_id??randomUUID(),p_trainee_id:user,p_program_id:day.program_id,p_slot_id:day.slot_id,p_anchor_date:day.anchor_date,p_expected_revision:day.revision}:previous!;
    if(!req)throw new Error('There is no pending program open to confirm.');
    if(day?.rest)throw new Error('This is a rest day.');
    if(previous&&JSON.stringify(previous)!==JSON.stringify(req))throw new Error('Confirm the previous program open before choosing another day.');
    const network=await NetInfo.fetch();
    if(network.isConnected===false||network.isInternetReachable===false){
      const raw=await AsyncStorage.getItem(openedKey(user,req));const saved=raw?JSON.parse(raw):null;
      if(saved?.owner!==user||saved.revision!==req.p_expected_revision||typeof saved.templateId!=='string')
        throw new Error('Connect once to open this program day. Resume existing drafts from Training.');
      return saved.templateId;
    }
    const session=await supabase.auth.getSession();if(session.error)throw session.error;
    if(session.data.session?.user.id!==user)throw new Error('The active account changed. Reopen Training.');
    // Stable identity is durable before any server mutation, including restarts.
    await AsyncStorage.setItem(pendingKey(user),JSON.stringify(req));
    const result=await supabase.rpc('open_coach_program_workout',req);
    if(result.error){if(/^[0-9A-Z]{5}$/.test(result.error.code??''))await AsyncStorage.removeItem(pendingKey(user));throw new Error(result.error.message);}
    if(typeof result.data!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result.data))throw new Error('Unknown program open outcome. Confirm the previous open.');
    await AsyncStorage.setItem(openedKey(user,req),JSON.stringify({owner:user,revision:req.p_expected_revision,templateId:result.data})).catch(()=>undefined);
    await AsyncStorage.removeItem(pendingKey(user)).catch(()=>undefined);
    return result.data;
  }finally{active.delete(user);}
}
