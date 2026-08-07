import { useLocalSearchParams } from 'expo-router';
import { useTraceUserContext } from '../../src/context/TraceUserContext';
import GymLogger from '../../src/components/GymLogger';

export default function LogTab() {
  const { profile } = useTraceUserContext();
  const { templateId } = useLocalSearchParams<{ templateId?: string }>();
  return <GymLogger userId={profile!.id} overrideTemplateId={templateId ?? null} />;
}
