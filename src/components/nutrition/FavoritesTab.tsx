import CatalogStatus from './CatalogStatus';
import { ScrollView, View } from 'react-native';
import { useFavoriteFoods } from '../../hooks/useFavoriteFoods';
import { useLogFood } from '../../hooks/useLogFood';
import type { MealTemplateItem } from '../../lib/nutrition/types';
import FoodMacroRow from './FoodMacroRow';
import EmptyTabState from './EmptyTabState';

export default function FavoritesTab({
  userId,
  slot,
  onLogged,
}: {
  userId: string;
  slot?: number | null;
  onLogged: (item: MealTemplateItem) => void;
}) {
  const { favorites, isLoading, error, refresh, removeFavorite } = useFavoriteFoods(userId);
  const logFood = useLogFood(userId);

  if (isLoading || error) return <CatalogStatus loading={isLoading} error={error} onRetry={refresh} />;

  if (!isLoading && favorites.length === 0) {
    return (
      <EmptyTabState
        icon="heart-outline"
        title="No favorites yet"
        description="Long press a food in My foods to save it here."
      />
    );
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerClassName="p-4 gap-2">
      <View className="gap-2">
        {favorites.map((food) => (
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
            longPressHint="Long press to remove from favorites"
            onLongPress={async () => {
              const result = await removeFavorite(food.id);
              if (!result.ok) throw new Error(result.error ?? 'Could not remove favorite.');
            }}
          />
        ))}
      </View>
    </ScrollView>
  );
}
