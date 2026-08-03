import type { ReactNode } from 'react';
import { View } from 'react-native';

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 8,
  elevation: 3,
};

export default function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <View className={`bg-surface border border-border rounded-2xl ${className}`} style={SHADOW}>
      {children}
    </View>
  );
}
