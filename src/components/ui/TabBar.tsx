import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export interface TabDef<T extends string> {
  key: T;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
}

function TabButton<T extends string>({
  tab,
  active,
  onPress,
}: {
  tab: TabDef<T>;
  active: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: withTiming(active ? 1 : 0.85, { duration: 150 }),
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: active }}
      onPress={() => {
        scale.value = withSpring(1.15, { damping: 8, stiffness: 300 }, () => {
          scale.value = withSpring(1, { damping: 10, stiffness: 300 });
        });
        onPress();
      }}
      className="flex-1 min-w-0 min-h-[56px] py-2.5 items-center gap-0.5"
    >
      <Animated.View style={style}>
        <Ionicons
          name={active ? tab.activeIcon : tab.icon}
          size={22}
          color={active ? '#818CF8' : '#9CA3AF'}
        />
      </Animated.View>
      <Animated.View style={labelStyle}>
      <Text numberOfLines={1} style={{ color: active ? '#818CF8' : '#9CA3AF',
        fontSize: tab.label.length > 10 ? 10 : 11, fontWeight: '500', textAlign: 'center' }}>
        {tab.label}
      </Text>
      </Animated.View>
    </Pressable>
  );
}

export default function TabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef<T>[];
  // A plain string, not T — the caller may be on a screen that isn't any
  // tab at all (e.g. the active-workout session, or messages reached via
  // the top bar's chat icon instead of a bottom tab); in that case nothing
  // should highlight, which `active === tab.key` already handles safely.
  active: string;
  onChange: (tab: T) => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-row border-t border-border bg-surface"
      style={{
        paddingBottom: insets.bottom,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 8,
      }}
    >
      {tabs.map((tab) => (
        <TabButton
          key={tab.key}
          tab={tab}
          active={active === tab.key}
          onPress={() => onChange(tab.key)}
        />
      ))}
    </View>
  );
}
