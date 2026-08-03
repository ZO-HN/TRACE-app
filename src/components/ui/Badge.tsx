import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

export type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

const TONE_STYLES: Record<BadgeTone, string> = {
  primary: 'bg-primary/10',
  success: 'bg-green-500/15',
  warning: 'bg-yellow-500/15',
  danger: 'bg-red-500/15',
  neutral: 'bg-border/40',
};

const TONE_TEXT: Record<BadgeTone, string> = {
  primary: 'text-primary',
  success: 'text-green-400',
  warning: 'text-yellow-400',
  danger: 'text-red-400',
  neutral: 'text-gray-400',
};

// NativeWind statically analyzes className strings at build time, so the
// dot's color can't be derived by string-manipulating TONE_TEXT at runtime —
// it needs its own literal class per tone.
const TONE_DOT: Record<BadgeTone, string> = {
  primary: 'bg-primary',
  success: 'bg-green-400',
  warning: 'bg-yellow-400',
  danger: 'bg-red-400',
  neutral: 'bg-gray-400',
};

export default function Badge({
  children,
  tone = 'primary',
  pulse = false,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  pulse?: boolean;
}) {
  return (
    <View className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-full ${TONE_STYLES[tone]}`}>
      {pulse && <View className={`w-1.5 h-1.5 rounded-full ${TONE_DOT[tone]}`} />}
      <Text className={`text-xs font-semibold ${TONE_TEXT[tone]}`}>{children}</Text>
    </View>
  );
}
