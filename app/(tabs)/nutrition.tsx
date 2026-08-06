import { ScrollView } from 'react-native';
import { useTraceUserContext } from '../../src/context/TraceUserContext';
import NutritionLogger from '../../src/components/NutritionLogger';

export default function NutritionTab() {
  const { profile } = useTraceUserContext();
  return (
    <ScrollView className="flex-1" contentContainerClassName="px-4 py-6">
      <NutritionLogger userId={profile!.id} />
    </ScrollView>
  );
}
