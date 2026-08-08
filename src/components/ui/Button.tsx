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
  sm: 'h-9 px-3',
  md: 'h-11 px-4',
  lg: 'h-14 px-6',
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
    <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : '#4ADE80'} />
  ) : (
    <>
      {icon}
      <Text className={`${TEXT_SIZE[size]} font-semibold ${TEXT_COLOR[variant]}`}>{children}</Text>
    </>
  );

  if (variant === 'primary') {
    return (
      <AnimatedPressable
        onPress={onPress}
        disabled={isDisabled}
        {...pressHandlers}
        style={animatedStyle}
        className={`${fullWidth ? 'w-full' : ''} ${isDisabled ? 'opacity-50' : ''} rounded-xl overflow-hidden`}
      >
        <LinearGradient
          colors={['#4ADE80', '#22C55E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
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
      {...pressHandlers}
      style={animatedStyle}
      className={`${SIZE_STYLES[size]} ${VARIANT_STYLES[variant]} rounded-xl flex-row items-center justify-center gap-2 ${fullWidth ? 'w-full' : ''} ${isDisabled ? 'opacity-50' : ''}`}
    >
      {label}
    </AnimatedPressable>
  );
}
