import CatalogStatus from './CatalogStatus';
import { ScrollView, View } from 'react-native';
import { useCustomFoods } from '../../hooks/useCustomFoods';
import { useFavoriteFoods } from '../../hooks/useFavoriteFoods';
import { useLogFood } from '../../hooks/useLogFood';
import type { MealTemplateItem } from '../../lib/nutrition/types';
import FoodMacroRow from './FoodMacroRow';
import CreateFoodForm from './CreateFoodForm';
import EmptyTabState from './EmptyTabState';

export default function CustomFoodTab({
  userId,
  slot,
  onLogged,
}: {
  userId: string;
  slot?: number | null;
  onLogged: (item: MealTemplateItem) => void;
}) {
  const { foods, isLoading, error, refresh, createFood } = useCustomFoods(userId);
  const { addFavorite } = useFavoriteFoods(userId);
  const logFood = useLogFood(userId);

  if (isLoading || error) return <CatalogStatus loading={isLoading} error={error} onRetry={refresh} />;

  return (
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerClassName="p-4 gap-4">
      {!isLoading && foods.length === 0 ? (
        <EmptyTabState
          icon="restaurant-outline"
          title="No custom foods yet"
          description="Create a reusable food below. Use Quick Add to log calories or macros without saving a food."
        />
      ) : (
        <View className="gap-2">
          {foods.map((food) => (
            <FoodMacroRow
              key={food.id}
              name={food.name}
              macros={food}
              onLog={async () => {
                await logFood(food.name, food, slot);
                onLogged({
                  name: food.name,
                  protein_g: food.protein_g,
                  carbs_g: food.carbs_g,
                  fat_g: food.fat_g,
                  calories: food.calories,
                });
              }}
              longPressHint="Long press to add to favorites"
            onLongPress={async () => {
                const result = await addFavorite(food.name, food);
                if (!result.ok) throw new Error(result.error ?? 'Could not add favorite.');
              }}
            />
          ))}
        </View>
      )}
      <CreateFoodForm onCreate={createFood} />
    </ScrollView>
  );
}
