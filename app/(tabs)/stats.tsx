import { ScrollView } from 'react-native';
import { useTraceUserContext } from '../../src/context/TraceUserContext';
import StatsScreen from '../../src/components/StatsScreen';

export default function StatsTab() {
  const { profile } = useTraceUserContext();
  return (
    <ScrollView className="flex-1" contentContainerClassName="px-4 py-6">
      <StatsScreen userId={profile!.id} />
    </ScrollView>
  );
}
