import { Text, View } from 'react-native';

const BAR_COLOR: Record<string, string> = {
  Energy: '#FBBF24',
  Protein: '#3B82F6',
  Carbs: '#4ADE80',
  'Net Carbs': '#4ADE80',
  Fat: '#F87171',
};

export default function MacroProgressBar({
  label,
  value,
  goal,
  unit,
}: {
  label: 'Energy' | 'Protein' | 'Carbs' | 'Net Carbs' | 'Fat';
  value: number;
  goal: number;
  unit: string;
}) {
  // No goal set (0) -> 0%, not NaN/Infinity from a divide-by-zero.
  const percent = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;

  return (
    <View className="gap-1">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-white">
          <Text className="font-semibold">{label}</Text>{' '}
          <Text className="text-gray-400">
            {value.toFixed(1)} / {goal.toFixed(1)} {unit}
          </Text>
        </Text>
        <Text className="text-xs text-gray-500">{percent}%</Text>
      </View>
      <View className="h-1.5 bg-border rounded-full overflow-hidden">
        <View
          className="h-full rounded-full"
          style={{ width: `${percent}%`, backgroundColor: BAR_COLOR[label] }}
        />
      </View>
    </View>
  );
}
