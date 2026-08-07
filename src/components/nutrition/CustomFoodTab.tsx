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
  onLogged,
}: {
  userId: string;
  onLogged: (item: MealTemplateItem) => void;
}) {
  const { foods, isLoading, createFood } = useCustomFoods(userId);
  const { addFavorite } = useFavoriteFoods(userId);
  const logFood = useLogFood(userId);

  return (
    <ScrollView contentContainerClassName="p-4 gap-4">
      {!isLoading && foods.length === 0 ? (
        <EmptyTabState
          icon="restaurant-outline"
          title="No custom foods yet"
          description="Create your first custom food by scanning a barcode or using the Quick Add feature"
        />
      ) : (
        <View className="gap-2">
          {foods.map((food) => (
            <FoodMacroRow
              key={food.id}
              name={food.name}
              macros={food}
              onLog={() => {
                void logFood(food.name, food);
                onLogged({
                  name: food.name,
                  protein_g: food.protein_g,
                  carbs_g: food.carbs_g,
                  fat_g: food.fat_g,
                  calories: food.calories,
                });
              }}
              onLongPress={() => void addFavorite(food.name, food)}
            />
          ))}
        </View>
      )}
      <CreateFoodForm onCreate={createFood} />
    </ScrollView>
  );
}
