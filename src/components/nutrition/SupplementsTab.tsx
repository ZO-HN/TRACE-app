import { ScrollView, View } from 'react-native';
import { useSupplements } from '../../hooks/useSupplements';
import { useLogFood } from '../../hooks/useLogFood';
import FoodMacroRow from './FoodMacroRow';
import EmptyTabState from './EmptyTabState';

export default function SupplementsTab({ userId, onLogged }: { userId: string; onLogged: () => void }) {
  const { supplements, isLoading } = useSupplements();
  const logFood = useLogFood(userId);

  if (!isLoading && supplements.length === 0) {
    return (
      <EmptyTabState
        icon="fitness-outline"
        title="No supplements yet"
        description="Your coach hasn't added any reference supplements yet."
      />
    );
  }

  return (
    <ScrollView contentContainerClassName="p-4 gap-2">
      <View className="gap-2">
        {supplements.map((s) => (
          <FoodMacroRow
            key={s.id}
            name={s.name}
            macros={s}
            onLog={() => {
              void logFood(s.name, s);
              onLogged();
            }}
          />
        ))}
      </View>
    </ScrollView>
  );
}
