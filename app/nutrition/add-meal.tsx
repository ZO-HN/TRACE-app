import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTraceUserContext } from '../../src/context/TraceUserContext';
import QuickAddTab from '../../src/components/nutrition/QuickAddTab';
import FavoritesTab from '../../src/components/nutrition/FavoritesTab';
import CustomFoodTab from '../../src/components/nutrition/CustomFoodTab';
import SupplementsTab from '../../src/components/nutrition/SupplementsTab';
import MealTemplatesTab from '../../src/components/nutrition/MealTemplatesTab';

type MealTab = 'quick' | 'favorites' | 'custom' | 'supplements' | 'meals';

const TABS: { key: MealTab; label: string }[] = [
  { key: 'quick', label: 'Quick Add' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'custom', label: 'Custom' },
  { key: 'supplements', label: 'Supplements' },
  { key: 'meals', label: 'Meals' },
];

export default function AddMealModal() {
  const { profile } = useTraceUserContext();
  const [tab, setTab] = useState<MealTab>('quick');
  const userId = profile!.id;
  const onLogged = () => router.back();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </Pressable>
        <Text className="text-lg font-bold text-white">Meal</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="border-b border-border">
        <View className="flex-row px-4">
          {TABS.map((t) => (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              className={`px-3 py-3 border-b-2 ${tab === t.key ? 'border-primary' : 'border-transparent'}`}
            >
              <Text className={`text-sm font-semibold ${tab === t.key ? 'text-white' : 'text-gray-500'}`}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View className="flex-1">
        {tab === 'quick' && <QuickAddTab userId={userId} onLogged={onLogged} />}
        {tab === 'favorites' && <FavoritesTab userId={userId} onLogged={onLogged} />}
        {tab === 'custom' && <CustomFoodTab userId={userId} onLogged={onLogged} />}
        {tab === 'supplements' && <SupplementsTab userId={userId} onLogged={onLogged} />}
        {tab === 'meals' && <MealTemplatesTab userId={userId} onLogged={onLogged} />}
      </View>
    </SafeAreaView>
  );
}
