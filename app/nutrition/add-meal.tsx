import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTraceUserContext } from '../../src/context/TraceUserContext';
import { useMealTemplates } from '../../src/hooks/useMealTemplates';
import type { MealTemplateItem } from '../../src/lib/nutrition/types';
import QuickAddTab from '../../src/components/nutrition/QuickAddTab';
import FavoritesTab from '../../src/components/nutrition/FavoritesTab';
import CustomFoodTab from '../../src/components/nutrition/CustomFoodTab';
import SupplementsTab from '../../src/components/nutrition/SupplementsTab';
import MealTemplatesTab from '../../src/components/nutrition/MealTemplatesTab';
import Button from '../../src/components/ui/Button';
import ScreenHeader from '../../src/components/ui/ScreenHeader';
import { useAsyncAction } from '../../src/hooks/useAsyncAction';

type MealTab = 'quick' | 'favorites' | 'custom' | 'supplements' | 'meals';

const TABS: { key: MealTab; label: string }[] = [
  { key: 'quick', label: 'Quick Add' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'custom', label: 'My foods' },
  { key: 'supplements', label: 'Supplements' },
  { key: 'meals', label: 'Saved meals' },
];

export default function AddMealModal() {
  const { profile } = useTraceUserContext();
  const { slot: slotParam } = useLocalSearchParams<{ slot?: string }>();
  const parsedSlot = Number(slotParam);
  const slot = Number.isInteger(parsedSlot) && parsedSlot > 0 ? parsedSlot : null;
  const [tab, setTab] = useState<MealTab>('quick');
  const userId = profile!.id;
  const { saveTemplate } = useMealTemplates(userId);

  // Items logged during this visit — kept around only so "Save as Meal" has
  // something to bundle. The actual nutrition_logs write already happened
  // (via the outbox) the moment each item was tapped; this is a template
  // convenience, not the source of truth for what got logged.
  const [loggedItems, setLoggedItems] = useState<MealTemplateItem[]>([]);
  const [savingName, setSavingName] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const action = useAsyncAction();

  const onLogged = (item: MealTemplateItem) => setLoggedItems((cur) => [...cur, item]);

  const handleSaveTemplate = () => action.run(async () => {
    if (savingName === null) {
      setSavingName('');
      return;
    }
    if (!savingName.trim()) return;
    const result = await saveTemplate(savingName, loggedItems);
    if (result.ok) {
      setSavingName(null);
      setSaveError(null);
    } else {
      setSaveError(result.error ?? 'Could not save that meal.');
    }
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScreenHeader
        title={slot ? `Add to meal ${slot}` : 'Add food'}
        onClose={() => router.back()}
        right={
          <Pressable accessibilityRole="button" accessibilityLabel="Done adding food" className="min-h-11 min-w-11 items-center justify-center" onPress={() => router.back()}>
            <Text className="text-primary font-semibold text-sm">Done</Text>
          </Pressable>
        }
      />

      <Text className="px-4 pb-3 text-sm text-gray-400">Enter calories and macros, or choose a saved food.</Text>
      {loggedItems.length > 0 && <Text accessibilityLiveRegion="polite" className="px-4 pb-3 text-sm text-primary">{loggedItems.length} {loggedItems.length === 1 ? 'entry saved' : 'entries saved'} on this device · sync status in Nutrition</Text>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} className="border-b border-border">
        <View className="flex-row px-4">
          {TABS.map((t) => (
            <Pressable
              key={t.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t.key }}
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
        {tab === 'quick' && <QuickAddTab userId={userId} slot={slot} onLogged={onLogged} />}
        {tab === 'favorites' && <FavoritesTab userId={userId} slot={slot} onLogged={onLogged} />}
        {tab === 'custom' && <CustomFoodTab userId={userId} slot={slot} onLogged={onLogged} />}
        {tab === 'supplements' && <SupplementsTab userId={userId} slot={slot} onLogged={onLogged} />}
        {tab === 'meals' && <MealTemplatesTab userId={userId} slot={slot} onLogged={onLogged} />}
      </View>

      {loggedItems.length > 0 && (
        <View className="p-4 border-t border-border gap-2">
          {savingName !== null && (
            <TextInput
              value={savingName}
              onChangeText={setSavingName}
              accessibilityLabel="Meal template name"
              placeholder="Meal name"
              placeholderTextColor="#6B7280"
              autoFocus
              className="h-11 bg-surface border border-border rounded-xl px-3 text-white"
            />
          )}
          {(saveError || action.error) && <Text className="text-xs text-red-400">{saveError ?? action.error}</Text>}
          <Button variant="secondary" size="sm" loading={action.pending} onPress={() => void handleSaveTemplate()}>
            {savingName === null
              ? 'Save these as a meal template'
              : savingName.trim()
                ? `Save "${savingName.trim()}"`
                : 'Enter a name above'}
          </Button>
        </View>
      )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
