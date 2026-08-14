// Nutrition × training on one timeline — Tracked's pitch is "the only app
// that connects your macros with your progressive overload"; this is
// TRACE's answer, built from data already logged elsewhere (nutrition_logs,
// workout_sessions, bodyweight_logs) rather than a new feed.

import { useMemo } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg';
import { buildCorrelationSeries, compareTrainingVsRestCalories } from '../../lib/nutrition/correlation';

const WIDTH = 320;
const HEIGHT = 120;
const BAR_GAP = 3;

export default function TrainingCorrelation({
  nutritionEntries,
  trainingDates,
  bodyweightEntries,
  days = 14,
}: {
  nutritionEntries: { logged_at: string; calories: number | null }[];
  trainingDates: string[];
  bodyweightEntries: { recorded_date: string; weight_kg: number }[];
  days?: number;
}) {
  const series = useMemo(
    () => buildCorrelationSeries(nutritionEntries, trainingDates, bodyweightEntries, days),
    [nutritionEntries, trainingDates, bodyweightEntries, days],
  );
  const insight = useMemo(() => compareTrainingVsRestCalories(series), [series]);

  const hasAnyData = series.some((p) => p.calories > 0 || p.trained || p.bodyweightKg != null);
  if (!hasAnyData) return null;

  const maxCalories = Math.max(1, ...series.map((p) => p.calories));
  const barWidth = WIDTH / series.length - BAR_GAP;

  const bwPoints = series
    .map((p, i) => (p.bodyweightKg == null ? null : { x: i, kg: p.bodyweightKg }))
    .filter((p): p is { x: number; kg: number } => p !== null);
  const bwValues = bwPoints.map((p) => p.kg);
  const bwMin = Math.min(...bwValues, Infinity);
  const bwMax = Math.max(...bwValues, -Infinity);
  const bwRange = bwMax - bwMin || 1;
  const bwLine = bwPoints
    .map((p) => {
      const x = p.x * (WIDTH / series.length) + WIDTH / series.length / 2;
      const y = HEIGHT - ((p.kg - bwMin) / bwRange) * (HEIGHT - 20) - 10;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <View className="bg-surface border border-border rounded-2xl px-4 py-3 gap-2">
      <View className="flex-row items-center justify-between px-1">
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Nutrition × Training — last {days} days
        </Text>
      </View>

      <Svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={130}>
        {series.map((p, i) => {
          const barHeight = (p.calories / maxCalories) * (HEIGHT - 16);
          const x = i * (WIDTH / series.length) + BAR_GAP / 2;
          return (
            <Rect
              key={p.date}
              x={x}
              y={HEIGHT - barHeight}
              width={barWidth}
              height={barHeight}
              rx={2}
              fill={p.trained ? '#4ADE80' : '#374151'}
            />
          );
        })}
        {series.map((p, i) =>
          p.trained ? (
            <Line
              key={`marker-${p.date}`}
              x1={i * (WIDTH / series.length) + WIDTH / series.length / 2}
              y1={HEIGHT - 2}
              x2={i * (WIDTH / series.length) + WIDTH / series.length / 2}
              y2={HEIGHT}
              stroke="#4ADE80"
              strokeWidth={2}
            />
          ) : null,
        )}
        {bwPoints.length > 1 && <Polyline points={bwLine} fill="none" stroke="#60A5FA" strokeWidth={1.5} />}
        {bwPoints.map((p) => {
          const x = p.x * (WIDTH / series.length) + WIDTH / series.length / 2;
          const y = HEIGHT - ((p.kg - bwMin) / bwRange) * (HEIGHT - 20) - 10;
          return <Circle key={`bw-${p.x}`} cx={x} cy={y} r={2.5} fill="#60A5FA" />;
        })}
      </Svg>

      <View className="flex-row items-center gap-4 px-1">
        <View className="flex-row items-center gap-1.5">
          <View className="w-2.5 h-2.5 rounded-sm bg-primary" />
          <Text className="text-[11px] text-gray-500">Training day</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="w-2.5 h-2.5 rounded-sm bg-border" />
          <Text className="text-[11px] text-gray-500">Rest day</Text>
        </View>
        {bwPoints.length > 1 && (
          <View className="flex-row items-center gap-1.5">
            <View className="w-2.5 h-0.5" style={{ backgroundColor: '#60A5FA' }} />
            <Text className="text-[11px] text-gray-500">Bodyweight</Text>
          </View>
        )}
      </View>

      {(insight.avgCaloriesTrainingDays != null || insight.avgCaloriesRestDays != null) && (
        <View className="flex-row gap-4 px-1 pt-1">
          {insight.avgCaloriesTrainingDays != null && (
            <Text className="text-xs text-gray-400">
              <Text className="text-primary font-semibold">{insight.avgCaloriesTrainingDays}</Text> kcal avg on
              training days
            </Text>
          )}
          {insight.avgCaloriesRestDays != null && (
            <Text className="text-xs text-gray-400">
              <Text className="text-gray-300 font-semibold">{insight.avgCaloriesRestDays}</Text> kcal avg on rest
              days
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
