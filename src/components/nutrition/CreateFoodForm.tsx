import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import type { FoodMacros } from '../../lib/nutrition/types';
import Button from '../ui/Button';
import { useAsyncAction } from '../../hooks/useAsyncAction';

function num(text: string): number | null {
  return text.trim() ? Number(text) : null;
}

export default function CreateFoodForm({
  onCreate,
  submitLabel = 'Create Food',
}: {
  onCreate: (name: string, macros: FoodMacros) => Promise<{ ok: boolean; error?: string }>;
  submitLabel?: string;
}) {
  const [name, setName] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [calories, setCalories] = useState('');
  const action = useAsyncAction();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => action.run(async () => {
    setError(null);
    const values = [protein, carbs, fat, calories].map(num);
    if (values.some((value) => value !== null && (!Number.isFinite(value) || value < 0))) {
      setError('Enter non-negative numbers for macros and calories.');
      return;
    }
    const result = await onCreate(name, {
      protein_g: num(protein),
      carbs_g: num(carbs),
      fat_g: num(fat),
      calories: num(calories),
    });
    if (result.ok) {
      setName('');
      setProtein('');
      setCarbs('');
      setFat('');
      setCalories('');
    } else {
      setError(result.error ?? 'Could not save that.');
    }
  });

  return (
    <View className="gap-3 p-4 bg-surface border border-border rounded-2xl">
      <Text accessibilityRole="header" className="text-base font-semibold text-white">Create a reusable food</Text>
      <Text className="text-sm text-gray-400">Enter values for one portion. Creating foods requires a connection.</Text>
      <TextInput
        accessibilityLabel="Food name"
        editable={!action.pending}
        value={name}
        onChangeText={setName}
        placeholder="Food name"
        placeholderTextColor="#6B7280"
        className="h-11 bg-background border border-border rounded-xl px-3 text-white"
      />
      <View className="flex-row flex-wrap gap-2">
        {[
          { label: 'Protein g', value: protein, set: setProtein },
          { label: 'Carbs g', value: carbs, set: setCarbs },
          { label: 'Fat g', value: fat, set: setFat },
        ].map((field) => (
          <TextInput
            key={field.label}
            accessibilityLabel={field.label}
            editable={!action.pending}
            style={{ minWidth: 72 }}
            value={field.value}
            onChangeText={field.set}
            placeholder={field.label}
            placeholderTextColor="#6B7280"
            keyboardType="decimal-pad"
            className="flex-1 h-11 bg-background border border-border rounded-xl px-2 text-center text-white text-xs"
          />
        ))}
      </View>
      <TextInput
        accessibilityLabel="Calories in kilocalories"
        editable={!action.pending}
        value={calories}
        onChangeText={setCalories}
        placeholder="Calories"
        placeholderTextColor="#6B7280"
        keyboardType="decimal-pad"
        className="h-11 bg-background border border-border rounded-xl px-3 text-white"
      />
      {(error || action.error) && <Text className="text-xs text-red-400">{error ?? action.error}</Text>}
      <Button onPress={() => void handleSubmit()} loading={action.pending} disabled={!name.trim()} fullWidth>
        {submitLabel}
      </Button>
    </View>
  );
}
