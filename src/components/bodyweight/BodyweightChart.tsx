import { Text, View } from 'react-native';
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
  if (entries.length === 0) return null;

  // Chart reads left-to-right chronologically — reverse the most-recent-first order.
  const chronological = [...entries].reverse();
  const movingAverage = chronological.map((_, i) => {
    // movingAverageAt indexes into the original most-recent-first array —
    // map the chronological index back to it.
    const originalIndex = entries.length - 1 - i;
    return movingAverageAt(entries, originalIndex, window);
  });

  const layout = buildChartLayout(chronological, movingAverage, toDisplay, WIDTH, HEIGHT);
  const rawPoints = layout.raw.map((p) => `${p.x},${p.y}`).join(' ');
  const avgPoints = layout.average.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between px-1">
        <Text className="text-xs text-gray-500">
          {layout.maxValue.toFixed(1)} {unit}
        </Text>
        <Text className="text-xs text-gray-500">
          {layout.minValue.toFixed(1)} {unit}
        </Text>
      </View>
      <Svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={180}>
        {rawPoints && <Polyline points={rawPoints} fill="none" stroke="#374151" strokeWidth={1.5} />}
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
    </View>
  );
}
