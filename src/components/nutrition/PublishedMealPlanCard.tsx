import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { usePublishedMealPlan } from '../../hooks/usePublishedMealPlan';
import { useOutboxStore } from '../../lib/outbox/outboxStore';
import { localDate } from '../../lib/localDate';
import { planDayIndex, type PlannedMeal } from '../../lib/nutrition/publishedPlan';
import type { NutritionLogInsert } from '../../lib/nutrition/types';
import Button from '../ui/Button';

export default function PublishedMealPlanCard({userId,actualCalories}:{userId:string;actualCalories:number}) {
  const {plan,loading,cached,error,refresh}=usePublishedMealPlan(userId);
  const batch=useOutboxStore(s=>s.enqueueNutritionBatch);
  const [selection,setSelection]=useState<number|null>(null);
  const [busy,setBusy]=useState(false);
  const [logError,setLogError]=useState<string|null>(null);
  const [success,setSuccess]=useState<string|null>(null);
  const lock=useRef(false);
  const owner=useRef(userId);owner.current=userId;
  const pending=useRef<{key:string;payloads:NutritionLogInsert[]}|null>(null);
  if(loading)return <View className="p-4 border border-border rounded-xl"><Text className="text-gray-400">Loading your coach meal plan…</Text></View>;
  if(error)return <View className="p-4 border border-border rounded-xl gap-2"><Text className="text-red-400">{error}</Text><Button variant="secondary" onPress={refresh}>Retry meal plan</Button></View>;
  if(!plan)return <View className="p-4 border border-border rounded-xl gap-2"><Text className="text-gray-400">No active meal plan for today from your current coach. You can keep logging food manually.</Text><Button variant="secondary" onPress={refresh}>Check for meal plan</Button></View>;
  const todayIndex=planDayIndex(plan.start_date,localDate());
  const ended=todayIndex>=plan.snapshot.days.length;
  const index=selection!==null&&selection<plan.snapshot.days.length?selection:Math.max(0,Math.min(todayIndex,plan.snapshot.days.length-1));
  const day=plan.snapshot.days[index];
  const logMeal=async(meal:PlannedMeal,slot:number)=>{
    if(lock.current||owner.current!==userId)return;
    lock.current=true;setBusy(true);setLogError(null);setSuccess(null);
    try{
      const key=`${plan.id}:${index}:${slot}`;
      if(pending.current&&pending.current.key!==key)throw new Error('Retry the previous planned meal first.');
      pending.current??={key,payloads:meal.items.map(food=>({id:randomUUID(),user_id:userId,method:'TYPED',description:food.name,protein_g:food.protein_g,carbs_g:food.carbs_g,fat_g:food.fat_g,calories:food.calories,meal_slot:slot,logged_at:new Date().toISOString(),recorded_date:localDate()}))};
      await batch(pending.current.payloads);
      pending.current=null;
      if(owner.current===userId)setSuccess(`${meal.name} saved on this device for today. Cloud delivery is shown in the sync banner.`);
    }catch(error){if(owner.current===userId)setLogError(error instanceof Error?error.message:'Could not save planned meal.');}
    finally{lock.current=false;if(owner.current===userId)setBusy(false);}
  };
  return <View className="border border-primary/30 rounded-2xl p-4 gap-3">
    <Text accessibilityRole="header" className="text-lg font-bold text-white">Coach meal plan · {plan.name}</Text>
    <Text className="text-xs text-gray-400">Published {new Date(plan.published_at).toLocaleDateString()} · starts {plan.start_date} · fixed copy {plan.id.slice(0,8)}</Text>
    {cached&&<Text className="text-amber-300 text-sm">Saved copy. Connect and refresh to check for updates.</Text>}
    {ended?<Text className="text-amber-300">This plan has ended. Ask your coach to publish the next plan. Previous days remain available below.</Text>:<Text className="text-sm text-gray-300">Today's logged energy: {Math.round(actualCalories)} kcal · coach target: {plan.snapshot.target_calories} kcal. Planned foods and actual intake are separate.</Text>}
    <View className="flex-row flex-wrap gap-2">{plan.snapshot.days.map((d,i)=><Pressable key={i} accessibilityRole="button" accessibilityState={{selected:index===i}} onPress={()=>setSelection(i)} className="border border-border rounded-lg px-3 py-2"><Text className={index===i?'text-primary':'text-gray-400'}>{d.label}</Text></Pressable>)}</View>
    <Text className="text-sm text-white">{day.label}: {day.calories} kcal · {day.protein_g}g protein · {day.carbs_g}g carbs · {day.fat_g}g fat</Text>
    {day.meals.map((meal,i)=><View key={i} className="border-t border-border pt-3 gap-2">
      <Text className="font-semibold text-white">{meal.name}</Text>
      {meal.items.map((food,n)=><Text key={n} className="text-sm text-gray-400">{food.name} · {food.servings} × {food.serving_size||'catalogue serving'} · {food.calories} kcal · P {food.protein_g} / C {food.carbs_g} / F {food.fat_g} g</Text>)}
      {!ended&&<Button size="sm" variant="secondary" disabled={busy} onPress={()=>void logMeal(meal,i+1)}>Log {meal.name} as eaten today</Button>}
    </View>)}
    {logError&&<Text accessibilityRole="alert" className="text-red-400">{logError}</Text>}
    {success&&<Text accessibilityLiveRegion="polite" className="text-primary">{success}</Text>}
    <Button size="sm" variant="secondary" disabled={busy} onPress={()=>{setSelection(null);refresh();}}>Refresh coach plan</Button>
  </View>;
}
