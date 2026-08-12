import { Text, TextInput, View } from 'react-native';

/** Shared numeric-input row for calculator screens under app/tools/. */
export default function ToolField({
  label,
  value,
  onChange,
  suffix,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <View className="gap-2">
      <Text className="text-sm text-gray-400">{label}</Text>
      <View className="flex-row items-center bg-surface border border-border rounded-xl px-4">
        <TextInput
          className="flex-1 py-3 text-white"
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor="#6B7280"
          value={value}
          onChangeText={onChange}
        />
        {suffix && <Text className="text-sm text-gray-500">{suffix}</Text>}
      </View>
    </View>
  );
}

export function ToolResult({ label, value }: { label: string; value: string }) {
  return (
    <View className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-3.5 flex-row items-center justify-between">
      <Text className="text-sm text-gray-300">{label}</Text>
      <Text className="text-lg font-bold text-primary">{value}</Text>
    </View>
  );
}

export function toNumber(v: string): number | null {
  const n = Number(v);
  return v.trim() === '' || Number.isNaN(n) ? null : n;
}
