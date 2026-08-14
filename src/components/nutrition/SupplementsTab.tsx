import { ScrollView, View } from 'react-native';
import { useSupplements } from '../../hooks/useSupplements';
import { useLogFood } from '../../hooks/useLogFood';
import type { MealTemplateItem } from '../../lib/nutrition/types';
import FoodMacroRow from './FoodMacroRow';
import EmptyTabState from './EmptyTabState';

export default function SupplementsTab({
  userId,
  slot,
  onLogged,
}: {
  userId: string;
  slot?: number | null;
  onLogged: (item: MealTemplateItem) => void;
}) {
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
              void logFood(s.name, s, slot);
              onLogged({
                name: s.name,
                protein_g: s.protein_g,
                carbs_g: s.carbs_g,
                fat_g: s.fat_g,
                calories: s.calories,
              });
            }}
          />
        ))}
      </View>
    </ScrollView>
  );
}
