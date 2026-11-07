import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  onPress: () => void;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
}

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-3 py-2',
  md: 'min-h-11 px-4 py-2',
  lg: 'min-h-14 px-6 py-3',
};

const TEXT_SIZE: Record<ButtonSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

const VARIANT_STYLES: Record<Exclude<ButtonVariant, 'primary'>, string> = {
  secondary: 'bg-surface border border-border',
  outline: 'bg-transparent border border-primary',
  ghost: 'bg-transparent',
  danger: 'bg-red-500/15 border border-red-500/30',
};

const TEXT_COLOR: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-gray-200',
  outline: 'text-primary',
  ghost: 'text-gray-400',
  danger: 'text-red-400',
};

const SPRING = { damping: 15, stiffness: 300 } as const;

/**
 * Shared button primitive — spring press-scale animation everywhere,
 * gradient fill for the primary variant, consistent sizing/typography so
 * every screen's buttons feel like the same app instead of one-off styling.
 */
export default function Button({
  onPress,
  children,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  fullWidth,
  icon,
}: ButtonProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const isDisabled = disabled || loading;

  const pressHandlers = {
    onPressIn: () => {
      scale.value = withSpring(0.96, SPRING);
    },
    onPressOut: () => {
      scale.value = withSpring(1, SPRING);
    },
  };

  const label = loading ? (
    <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : '#818CF8'} />
  ) : (
    <>
      {icon}
      <Text style={{ flexShrink: 1, textAlign: 'center' }} className={`${TEXT_SIZE[size]} font-semibold ${TEXT_COLOR[variant]}`}>{children}</Text>
    </>
  );

  if (variant === 'primary') {
    return (
      <AnimatedPressable
        onPress={onPress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: Boolean(isDisabled), busy: Boolean(loading) }}
        {...pressHandlers}
        style={[{ borderRadius: 16, overflow: 'hidden', minHeight: size === 'lg' ? 56 : 44 }, animatedStyle]}
        className={`${fullWidth ? 'w-full' : ''} ${isDisabled ? 'opacity-50' : ''} rounded-xl overflow-hidden`}
      >
        <LinearGradient
          colors={['#4F46E5', '#4338CA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ minHeight: size === 'lg' ? 56 : 44, paddingHorizontal: size === 'lg' ? 24 : 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16 }}
          className={`${SIZE_STYLES[size]} flex-row items-center justify-center gap-2`}
        >
          {label}
        </LinearGradient>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(isDisabled), busy: Boolean(loading) }}
      {...pressHandlers}
      style={[{ borderRadius: 16, minHeight: size === 'lg' ? 56 : 44 }, animatedStyle]}
      className={`${SIZE_STYLES[size]} ${VARIANT_STYLES[variant]} rounded-xl flex-row items-center justify-center gap-2 ${fullWidth ? 'w-full' : ''} ${isDisabled ? 'opacity-50' : ''}`}
    >
      {label}
    </AnimatedPressable>
  );
}
