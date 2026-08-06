import { ScrollView } from 'react-native';
import { useTraceUserContext } from '../../src/context/TraceUserContext';
import BodyweightLogger from '../../src/components/BodyweightLogger';
import SessionSummaries from '../../src/components/SessionSummaries';

export default function ProgressTab() {
  const { profile } = useTraceUserContext();
  return (
    <ScrollView className="flex-1" contentContainerClassName="px-4 py-6 gap-8">
      <BodyweightLogger userId={profile!.id} />
      <SessionSummaries userId={profile!.id} />
    </ScrollView>
  );
}
