import { useLocalSearchParams } from 'expo-router';
import { useTraceUserContext } from '../../src/context/TraceUserContext';
import GymLogger from '../../src/components/GymLogger';

// Reached from the Dashboard's Training card or "Start Workout" in My
// Workouts — not one of the bottom-tab destinations, so it isn't in
// (tabs)/_layout.tsx's TABS array, but living under (tabs) still lets it
// share TraceUserProvider/the tab bar chrome.
export default function SessionScreen() {
  const { profile } = useTraceUserContext();
  const { templateId } = useLocalSearchParams<{ templateId?: string }>();
  return <GymLogger userId={profile!.id} overrideTemplateId={templateId ?? null} />;
}
