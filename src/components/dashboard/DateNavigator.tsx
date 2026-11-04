import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { buildDateStrip } from '../../lib/dashboard/today';
import { localDate } from '../../lib/localDate';

export default function DateNavigator({ date, onChange }: { date: Date; onChange: (date: Date) => void }) {
  const move = (days: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    onChange(next);
  };
  return <View className="gap-3 px-4 pt-4">
    <View className="flex-row items-center justify-between">
      <Pressable accessibilityLabel="Previous week" onPress={() => move(-7)} className="p-3">
        <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
      </Pressable>
      <Text className="text-white font-bold">{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
      <Pressable accessibilityLabel="Next week" onPress={() => move(7)} className="p-3">
        <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
      </Pressable>
      <Pressable accessibilityLabel="Go to today" onPress={() => onChange(new Date())} className="p-2">
        <Text className="text-primary font-semibold">Today</Text>
      </Pressable>
    </View>
    <View className="flex-row justify-between">
      {buildDateStrip(date).map((day) => <Pressable key={day.date}
        accessibilityRole="button" accessibilityLabel={day.date}
        accessibilityState={{ selected: day.date === localDate(date) }}
        onPress={() => onChange(new Date(`${day.date}T12:00:00`))}
        style={{ borderRadius: 20 }}
        className={`w-10 h-12 items-center justify-center ${day.date === localDate(date) ? 'bg-surface border border-primary' : ''}`}>
        <Text className={day.date === localDate(date) ? 'text-white font-bold' : 'text-gray-400'}>{day.day}</Text>
      </Pressable>)}
    </View>
  </View>;
}
