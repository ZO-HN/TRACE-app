import { Pressable, Text, View } from 'react-native';
import type { FoodMacros } from '../../lib/nutrition/types';
import { useAsyncAction } from '../../hooks/useAsyncAction';

export default function FoodMacroRow({
  name,
  macros,
  onLog,
  onLongPress,
  longPressHint,
}: {
  name: string;
  macros: FoodMacros;
  onLog: () => void | Promise<void>;
  onLongPress?: () => void | Promise<void>;
  longPressHint?: string;
}) {
  const action = useAsyncAction();
  const summary = [
    macros.calories != null && `${macros.calories} kcal`,
    macros.protein_g != null && `${macros.protein_g}g protein`,
    macros.carbs_g != null && `${macros.carbs_g}g carbs`,
    macros.fat_g != null && `${macros.fat_g}g fat`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Add ${name}${summary ? `, ${summary}` : ''}`}
      accessibilityHint={longPressHint}
      accessibilityActions={onLongPress ? [{ name: 'longpress', label: longPressHint }] : undefined}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'longpress' && onLongPress) void action.run(async () => { await onLongPress(); });
      }}
      accessibilityState={{ disabled: action.pending, busy: action.pending }}
      disabled={action.pending}
      onPress={() => void action.run(async () => { await onLog(); })}
      onLongPress={onLongPress ? () => void action.run(async () => { await onLongPress(); }) : undefined}
      className="flex-row items-center justify-between bg-surface border border-border rounded-xl px-4 py-3"
    >
      <View className="flex-1 pr-2">
        <Text className="text-white font-medium">{name}</Text>
        {summary.length > 0 && <Text className="text-xs text-gray-400 mt-0.5">{summary}</Text>}
      </View>
      <Text className="text-primary text-xs font-semibold">{action.pending ? 'Saving...' : 'Add'}</Text>
    </Pressable>
    {action.error && <Text className="text-xs text-red-400">{action.error}</Text>}
    </View>
  );
}
