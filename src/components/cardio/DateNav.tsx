import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

function addDays(dateKey: string, delta: number): string {
  const d = new Date(`${dateKey}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

export default function DateNav({
  date,
  onChange,
}: {
  date: string; // YYYY-MM-DD
  onChange: (date: string) => void;
}) {
  const label = new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
      <Pressable
        onPress={() => onChange(addDays(date, -1))}
        className="w-9 h-9 rounded-lg bg-surface items-center justify-center"
      >
        <Ionicons name="chevron-back" size={18} color="#E5E7EB" />
      </Pressable>
      <View className="flex-row items-center gap-2">
        <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
        <Text className="text-white font-bold">{label}</Text>
      </View>
      <Pressable
        onPress={() => onChange(addDays(date, 1))}
        className="w-9 h-9 rounded-lg bg-surface items-center justify-center"
      >
        <Ionicons name="chevron-forward" size={18} color="#E5E7EB" />
      </Pressable>
    </View>
  );
}
