import { ScrollView, View } from 'react-native';
import { useFavoriteFoods } from '../../hooks/useFavoriteFoods';
import { useLogFood } from '../../hooks/useLogFood';
import FoodMacroRow from './FoodMacroRow';
import EmptyTabState from './EmptyTabState';

export default function FavoritesTab({ userId, onLogged }: { userId: string; onLogged: () => void }) {
  const { favorites, isLoading, removeFavorite } = useFavoriteFoods(userId);
  const logFood = useLogFood(userId);

  if (!isLoading && favorites.length === 0) {
    return (
      <EmptyTabState
        icon="heart-outline"
        title="No favorites yet"
        description="Favorite a food from Custom or a past log to find it here quickly."
      />
    );
  }

  return (
    <ScrollView contentContainerClassName="p-4 gap-2">
      <View className="gap-2">
        {favorites.map((food) => (
          <FoodMacroRow
            key={food.id}
            name={food.name}
            macros={food}
            onLog={() => {
              void logFood(food.name, food);
              onLogged();
            }}
            onLongPress={() => void removeFavorite(food.id)}
          />
        ))}
      </View>
    </ScrollView>
  );
}
