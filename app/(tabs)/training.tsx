import { ScrollView } from 'react-native';
import { useTraceUserContext } from '../../src/context/TraceUserContext';
import TrainingScreen from '../../src/components/TrainingScreen';

export default function TrainingTab() {
  const { profile } = useTraceUserContext();
  return (
    <ScrollView className="flex-1" contentContainerClassName="px-4 py-6">
      <TrainingScreen userId={profile!.id} />
    </ScrollView>
  );
}
