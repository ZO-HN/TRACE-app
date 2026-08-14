import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { MealSlotEntry } from '../../lib/nutrition/mealSlots';
import Card from '../ui/Card';

export default function MealSlotCard({
  slotNumber,
  entries,
}: {
  slotNumber: number;
  entries: MealSlotEntry[];
}) {
  const [expanded, setExpanded] = useState(true);
  const hasEntries = entries.length > 0;

  const totals = entries.reduce(
    (sum, e) => ({
      calories: sum.calories + (e.calories ?? 0),
      protein_g: sum.protein_g + (e.protein_g ?? 0),
      carbs_g: sum.carbs_g + (e.carbs_g ?? 0),
      fat_g: sum.fat_g + (e.fat_g ?? 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );

  return (
    <Card className="overflow-hidden">
      <View className="flex-row items-center gap-2 px-3 py-3">
        {hasEntries && (
          <Pressable onPress={() => setExpanded((v) => !v)}>
            <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={16} color="#9CA3AF" />
          </Pressable>
        )}
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <View className={`px-2.5 py-1 rounded-lg ${hasEntries ? 'bg-primary/20' : 'bg-border/60'}`}>
              <Text className={`text-xs font-bold ${hasEntries ? 'text-primary' : 'text-gray-400'}`}>
                Meal {slotNumber}
              </Text>
            </View>
          </View>
          {hasEntries && (
            <Text className="text-xs text-gray-500 mt-1">
              {totals.calories} kcal · {totals.protein_g}P · {totals.carbs_g}C · {totals.fat_g}F
            </Text>
          )}
        </View>
        <Pressable
          onPress={() => router.push({ pathname: '/nutrition/add-meal', params: { slot: String(slotNumber) } })}
        >
          <Ionicons name="add" size={20} color="#E5E7EB" />
        </Pressable>
        <Pressable
          onPress={() =>
            Alert.alert('Coming soon', 'Renaming/deleting individual entries isn’t available yet.')
          }
        >
          <Ionicons name="ellipsis-vertical" size={16} color="#6B7280" />
        </Pressable>
      </View>

      {expanded && hasEntries && (
        <View className="border-t border-border">
          {entries.map((e, i) => (
            <View
              key={e.id}
              className={`flex-row items-center gap-3 px-3 py-2.5 ${i < entries.length - 1 ? 'border-b border-border/50' : ''}`}
            >
              <View className="w-8 h-8 rounded-full bg-background border border-border items-center justify-center">
                <Ionicons name="restaurant-outline" size={14} color="#9CA3AF" />
              </View>
              <Text className="flex-1 text-sm text-white">{e.description ?? 'Entry'}</Text>
              <Text className="text-sm text-gray-400">{e.calories ?? 0} kcal</Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}
