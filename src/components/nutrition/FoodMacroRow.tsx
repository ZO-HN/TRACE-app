import { Pressable, Text, View } from 'react-native';
import type { FoodMacros } from '../../lib/nutrition/types';

export default function FoodMacroRow({
  name,
  macros,
  onLog,
  onLongPress,
}: {
  name: string;
  macros: FoodMacros;
  onLog: () => void;
  onLongPress?: () => void;
}) {
  const summary = [
    macros.calories != null && `${macros.calories} kcal`,
    macros.protein_g != null && `${macros.protein_g}g P`,
    macros.carbs_g != null && `${macros.carbs_g}g C`,
    macros.fat_g != null && `${macros.fat_g}g F`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={onLog}
      onLongPress={onLongPress}
      className="flex-row items-center justify-between bg-surface border border-border rounded-xl px-4 py-3"
    >
      <View className="flex-1 pr-2">
        <Text className="text-white font-medium">{name}</Text>
        {summary.length > 0 && <Text className="text-xs text-gray-500 mt-0.5">{summary}</Text>}
      </View>
      <Text className="text-primary text-xs font-semibold">Add</Text>
    </Pressable>
  );
}
