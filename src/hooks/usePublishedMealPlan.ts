import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';
import { localDate } from '../lib/localDate';
import { parsePublishedPlan, type PublishedPlan } from '../lib/nutrition/publishedPlan';

export function usePublishedMealPlan(userId: string) {
  const [attempt,setAttempt] = useState(0);
  const [state,setState] = useState<{owner:string;plan:PublishedPlan|null;loading:boolean;cached:boolean;error:string|null}>({owner:userId,plan:null,loading:true,cached:false,error:null});
  const owner=useRef(userId);owner.current=userId;
  const request=useRef(0);
  useFocusEffect(useCallback(()=>{
    let alive=true;const version=++request.current;
    const valid=()=>alive&&request.current===version&&owner.current===userId;
    const cacheKey=`trace:published-meal-plan:v1:${userId}`;
    setState({owner:userId,plan:null,loading:true,cached:false,error:null});
    void(async()=>{
      try {
        const connection=await NetInfo.fetch();
        if(connection.isConnected===false||connection.isInternetReachable===false){
          const raw=await AsyncStorage.getItem(cacheKey);
          if(!raw)throw new Error('Connect to download your coach meal plan.');
          const entry=JSON.parse(raw);if(entry.owner!==userId)throw new Error('Cached meal plan belongs to another account.');
          const plan=parsePublishedPlan(entry.plan);if(valid())setState({owner:userId,plan,loading:false,cached:true,error:null});return;
        }
        const {data,error}=await supabase.rpc('get_current_meal_plan',{p_trainee_id:userId,p_date:localDate()});
        if(error)throw new Error(error.message);
        const plan=parsePublishedPlan(data);
        if(!valid())return;
        await AsyncStorage.setItem(cacheKey,JSON.stringify({owner:userId,plan})).catch(()=>undefined);
        if(valid())setState({owner:userId,plan,loading:false,cached:false,error:null});
      }catch(error){if(valid())setState({owner:userId,plan:null,loading:false,cached:false,error:error instanceof Error?error.message:'Could not load your meal plan.'});}
    })();
    return()=>{alive=false;};
  },[userId,attempt]));
  return {...(state.owner===userId?state:{owner:userId,plan:null,loading:true,cached:false,error:null}),refresh:()=>setAttempt(n=>n+1)};
}
