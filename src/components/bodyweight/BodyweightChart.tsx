import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { weightRange } from '../../lib/bodyweight/dateRange';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { buildChartLayout, type WeightPoint } from '../../lib/bodyweight/chartPoints';
import { movingAverageAt, type MovingAverageWindow } from '../../lib/bodyweight/movingAverage';

const WIDTH = 320;
const HEIGHT = 160;

export default function BodyweightChart({
  entries,
  window,
  toDisplay,
  unit,
}: {
  /** Most-recent-first, matching useBodyweightLogs' order. */
  entries: WeightPoint[];
  window: MovingAverageWindow;
  toDisplay: (kg: number) => number;
  unit: string;
}) {
  const [days, setDays] = useState(30);
  const filtered = weightRange(entries, days);

  // Chart reads left-to-right chronologically — reverse the most-recent-first order.
  const chronological = [...filtered].reverse();
  const movingAverage = chronological.map((_, i) => {
    // movingAverageAt indexes into the original most-recent-first array —
    // map the chronological index back to it.
    const originalIndex = entries.indexOf(chronological[i]);
    return movingAverageAt(entries, originalIndex, window);
  });

  const layout = buildChartLayout(chronological, movingAverage, toDisplay, WIDTH, HEIGHT);
  const rawPoints = layout.raw.map((p) => `${p.x},${p.y}`).join(' ');
  const avgPoints = layout.average.map((p) => `${p.x},${p.y}`).join(' ');
  const change = filtered.length > 1 ? toDisplay(filtered[0].weight_kg) - toDisplay(filtered[filtered.length - 1].weight_kg) : null;

  return (
    <View className="gap-2">
      <View className="flex-row gap-2 mb-3">
        {[7, 30, 90, 365].map((value) => <Pressable key={value} accessibilityRole="radio"
          accessibilityLabel={`${value} days`} accessibilityState={{ checked: days === value }}
          onPress={() => setDays(value)}
          style={{ borderRadius: 16 }}
          className={`flex-1 h-11 rounded-lg border items-center justify-center ${days === value ? 'border-primary bg-surface' : 'border-border'}`}>
          <Text className={days === value ? 'text-primary font-bold' : 'text-gray-400'}>{value === 365 ? '1Y' : `${value}D`}</Text>
        </Pressable>)}
      </View>
      <Text className="text-white text-lg font-bold">{change === null ? 'Weight trend' : `${change > 0 ? '+' : ''}${change.toFixed(1)} ${unit}`}</Text>
      <Text className="text-gray-400 text-xs">{filtered.length} weigh-ins in the last {days} days</Text>
      {filtered.length === 0 ? <Text className="text-gray-500 py-8">No weigh-ins in this period</Text> : <>
      <View className="flex-row items-center justify-between px-1">
        <Text className="text-xs text-gray-500">
          {layout.maxValue.toFixed(1)} {unit}
        </Text>
        <Text className="text-xs text-gray-500">
          {layout.minValue.toFixed(1)} {unit}
        </Text>
      </View>
      <Svg viewBox={`-6 -6 ${WIDTH + 12} ${HEIGHT + 12}`} width="100%" height={180}>
        {rawPoints && <Polyline points={rawPoints} fill="none" stroke="#374151" strokeWidth={1.5} />}
        {layout.raw.map((point, index) => <Circle key={index} cx={point.x} cy={point.y} r={3} fill="#CBD5E1" />)}
        {avgPoints && <Polyline points={avgPoints} fill="none" stroke="#4ADE80" strokeWidth={2.5} />}
        {layout.average.length > 0 && (
          <Circle
            cx={layout.average[layout.average.length - 1].x}
            cy={layout.average[layout.average.length - 1].y}
            r={4}
            fill="#4ADE80"
          />
        )}
      </Svg>
      <View className="flex-row justify-between">
        <Text className="text-xs text-gray-400">{chronological[0].recorded_date}</Text>
        <Text className="text-xs text-gray-400">{chronological[chronological.length - 1].recorded_date}</Text>
      </View>
      <View className="flex-row items-center gap-4 px-1">
        <View className="flex-row items-center gap-1.5">
          <View className="w-3 h-0.5 bg-border" />
          <Text className="text-[11px] text-gray-500">Recorded</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="w-3 h-0.5 bg-primary" />
          <Text className="text-[11px] text-gray-500">{window}-day average</Text>
        </View>
      </View>
      </>}
    </View>
  );
}
