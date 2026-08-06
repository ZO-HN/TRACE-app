import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import type { FoodMacros } from '../../lib/nutrition/types';
import Button from '../ui/Button';

function num(text: string): number | null {
  const n = parseFloat(text);
  return Number.isFinite(n) ? n : null;
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const result = await onCreate(name, {
      protein_g: num(protein),
      carbs_g: num(carbs),
      fat_g: num(fat),
      calories: num(calories),
    });
    setSubmitting(false);
    if (result.ok) {
      setName('');
      setProtein('');
      setCarbs('');
      setFat('');
      setCalories('');
    } else {
      setError(result.error ?? 'Could not save that.');
    }
  };

  return (
    <View className="gap-3 p-4 bg-surface border border-border rounded-2xl">
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Food name"
        placeholderTextColor="#6B7280"
        className="h-11 bg-background border border-border rounded-xl px-3 text-white"
      />
      <View className="flex-row gap-2">
        {[
          { label: 'Protein g', value: protein, set: setProtein },
          { label: 'Carbs g', value: carbs, set: setCarbs },
          { label: 'Fat g', value: fat, set: setFat },
        ].map((field) => (
          <TextInput
            key={field.label}
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
        value={calories}
        onChangeText={setCalories}
        placeholder="Calories"
        placeholderTextColor="#6B7280"
        keyboardType="decimal-pad"
        className="h-11 bg-background border border-border rounded-xl px-3 text-white"
      />
      {error && <Text className="text-xs text-red-400">{error}</Text>}
      <Button onPress={() => void handleSubmit()} loading={submitting} disabled={!name.trim()} fullWidth>
        {submitLabel}
      </Button>
    </View>
  );
}
