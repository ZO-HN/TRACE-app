import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTraceUserContext } from '../context/TraceUserContext';
import { useCoachSchedule } from '../hooks/useCoachSchedule';
import {useCoachPrograms,type CoachProgramDay} from '../hooks/useCoachPrograms';
import {openCoachProgram,pendingProgramOpen} from '../lib/workout/openCoachProgram';
import {useAsyncAction} from '../hooks/useAsyncAction';
import { localDate } from '../lib/localDate';
import Card from './ui/Card';
import Button from './ui/Button';

export default function CoachSchedule({ userId }: { userId: string }) {
  const { profile } = useTraceUserContext();
  return <Schedule key={`${userId}:${profile?.coach_id ?? ''}`} userId={userId} coachId={profile?.coach_id ?? null} />;
}
function Schedule({ userId, coachId }: { userId: string; coachId: string | null }) {
  const [from, setFrom] = useState(() => localDate());
  const day = new Date(`${from}T12:00:00`);
  const end = new Date(day); end.setDate(day.getDate() + 6);
  const to = localDate(end);
  const schedule = useCoachSchedule(userId, coachId, from, to);
  const programs=useCoachPrograms(userId,coachId,from,to);
  const action=useAsyncAction();
  const [previous,setPrevious]=useState(false);const [recoveryError,setRecoveryError]=useState<string|null>(null);
  const owner=useRef(userId);owner.current=userId;
  const lease=useRef({alive:false});
  useEffect(()=>{const current={alive:true};lease.current=current;void pendingProgramOpen(userId).then(req=>{if(current.alive)setPrevious(Boolean(req));}).catch(cause=>{if(current.alive)setRecoveryError(cause instanceof Error?cause.message:'Could not load previous open.');});return()=>{current.alive=false;};},[userId]);
  const open=(day?:CoachProgramDay)=>action.run(async()=>{
    const current=lease.current;
    if(!current.alive||owner.current!==userId)return;
    try{const id=await openCoachProgram(userId,day);if(current.alive&&owner.current===userId){setPrevious(false);setRecoveryError(null);router.push({pathname:'/(tabs)/session',params:{templateId:id}});}}
    catch(cause){if(current.alive&&owner.current===userId){const request=await pendingProgramOpen(userId);if(current.alive&&owner.current===userId)setPrevious(Boolean(request));throw cause;}}
  });
  const shift = (days: number) => { const next = new Date(day); next.setDate(next.getDate() + days); setFrom(localDate(next)); };
  return <Card className="p-4 gap-3">
    <Text className="text-white font-bold">Coach schedule</Text>
    <Text className="text-gray-400">{from} – {to}</Text>
    <View className="flex-row gap-2 flex-wrap">
      <Button variant="secondary" size="sm" onPress={() => shift(-7)}>Previous week</Button>
      <Button variant="secondary" size="sm" onPress={() => shift(7)}>Next week</Button>
      <Button variant="secondary" size="sm" onPress={()=>{schedule.refresh();programs.refresh();}}>Reload schedule</Button>
    </View>
    {schedule.loading && <Text accessibilityLiveRegion="polite" className="text-gray-400">Loading schedule…</Text>}
    {schedule.cached && <Text className="text-amber-300">Downloaded schedule; dates and cancellations may have changed. Reconnect to refresh.</Text>}
    {schedule.error && <Text accessibilityRole="alert" className="text-red-400">{schedule.error}</Text>}
    {!schedule.loading && !schedule.error && !schedule.rows.length && <Text className="text-gray-400">No one-off assignments for this week.</Text>}
    {schedule.rows.map(event => <View key={event.id} className="border-t border-border pt-3 gap-2">
      <Text className="text-white">{event.scheduled_date} · {event.workout_name}</Text>
      <Button variant="secondary" onPress={() => router.push({ pathname: '/(tabs)/session', params: { templateId: event.template_id } })}>Open {event.workout_name}</Button>
    </View>)}
    <Text className="text-white font-bold">Live programs and groups</Text>
    {programs.loading&&<Text className="text-gray-400">Loading programs…</Text>}
    {programs.cached&&<Text className="text-amber-300">Downloaded program schedule; changes and membership may be newer online. Resume saved drafts before opening another version.</Text>}
    {programs.error&&<Text accessibilityRole="alert" className="text-red-400">{programs.error}</Text>}
    {!programs.loading&&!programs.error&&!programs.days.length&&<Text className="text-gray-400">No program days for this week.</Text>}
    {programs.days.map(day=><View key={`${day.program_id}:${day.anchor_date}:${day.slot_id}`} className="border-t border-border pt-3 gap-2">
      <Text className="text-white">{day.scheduled_date} · {day.program_name} · {day.label}{day.rest?' · Rest':''}</Text>
      <Text className="text-gray-400">{day.source} · revision {day.revision}</Text>
      {!day.rest&&<Button variant="secondary" loading={action.pending} onPress={()=>void open(day)}>Open program workout</Button>}
    </View>)}
    {previous&&<Button variant="secondary" loading={action.pending} onPress={()=>void open()}>Confirm previous program open</Button>}
    {(action.error||recoveryError)&&<Text accessibilityRole="alert" className="text-red-400">{action.error??recoveryError}</Text>}
    <Text className="text-gray-500 text-xs">One-off assignments use fixed prescriptions. Program/group changes appear on refresh; opening captures the current prescription. Opening requires a connection until the exact workout has been downloaded. Use Resume above for saved drafts; rescheduling never changes recorded sets.</Text>
  </Card>;
}
