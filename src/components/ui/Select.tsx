import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export default function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between bg-surface border border-border rounded-xl px-4 py-3"
      >
        <Text className="text-white font-medium">{selected?.label ?? value}</Text>
        <Ionicons name="chevron-down" size={18} color="#6B7280" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          className="flex-1 bg-black/60 items-center justify-center px-8"
          onPress={() => setOpen(false)}
        >
          <View className="w-full bg-surface border border-border rounded-2xl overflow-hidden">
            {options.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className="flex-row items-center justify-between px-4 py-3.5 border-b border-border"
              >
                <Text className={`font-medium ${option.value === value ? 'text-primary' : 'text-white'}`}>
                  {option.label}
                </Text>
                {option.value === value && <Ionicons name="checkmark" size={18} color="#4ADE80" />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
