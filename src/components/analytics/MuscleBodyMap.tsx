// Schematic front/back body diagram, colored by training-volume intensity
// per zone. Not anatomically precise artwork — a blocky schematic is enough
// to answer "what have I been neglecting" at a glance, which is the actual
// job of this screen.

import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Rect, Ellipse, Circle } from 'react-native-svg';
import { aggregateByZone, intensityLevel, type BodyZone, type ZoneVolume } from '../../lib/analytics/muscleZones';
import { kgToLbs } from '../../lib/units';

const INTENSITY_COLOR = ['#1F2937', '#14532D', '#166534', '#15803D', '#22C55E', '#4ADE80'];

const ZONE_LABEL: Record<BodyZone, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  abs: 'Abs',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  hips: 'Hips/Adductors',
};

const FRONT_ZONES: BodyZone[] = ['shoulders', 'chest', 'biceps', 'forearms', 'abs', 'hips', 'quads'];
const BACK_ZONES: BodyZone[] = ['shoulders', 'back', 'triceps', 'forearms', 'glutes', 'hamstrings', 'calves'];

interface ZoneShape {
  zone: BodyZone;
  x: number;
  y: number;
  w: number;
  h: number;
  rx?: number;
}

const FRONT_SHAPES: ZoneShape[] = [
  { zone: 'shoulders', x: 40, y: 48, w: 30, h: 18, rx: 8 },
  { zone: 'shoulders', x: 130, y: 48, w: 30, h: 18, rx: 8 },
  { zone: 'chest', x: 72, y: 50, w: 56, h: 34, rx: 6 },
  { zone: 'biceps', x: 34, y: 70, w: 20, h: 40, rx: 8 },
  { zone: 'biceps', x: 146, y: 70, w: 20, h: 40, rx: 8 },
  { zone: 'forearms', x: 32, y: 114, w: 18, h: 40, rx: 7 },
  { zone: 'forearms', x: 150, y: 114, w: 18, h: 40, rx: 7 },
  { zone: 'abs', x: 76, y: 88, w: 48, h: 44, rx: 6 },
  { zone: 'hips', x: 70, y: 134, w: 60, h: 20, rx: 6 },
  { zone: 'quads', x: 72, y: 158, w: 26, h: 62, rx: 8 },
  { zone: 'quads', x: 102, y: 158, w: 26, h: 62, rx: 8 },
];

const BACK_SHAPES: ZoneShape[] = [
  { zone: 'shoulders', x: 40, y: 48, w: 30, h: 18, rx: 8 },
  { zone: 'shoulders', x: 130, y: 48, w: 30, h: 18, rx: 8 },
  { zone: 'back', x: 70, y: 50, w: 60, h: 60, rx: 8 },
  { zone: 'triceps', x: 34, y: 70, w: 20, h: 40, rx: 8 },
  { zone: 'triceps', x: 146, y: 70, w: 20, h: 40, rx: 8 },
  { zone: 'forearms', x: 32, y: 114, w: 18, h: 40, rx: 7 },
  { zone: 'forearms', x: 150, y: 114, w: 18, h: 40, rx: 7 },
  { zone: 'glutes', x: 72, y: 112, w: 56, h: 26, rx: 10 },
  { zone: 'hamstrings', x: 72, y: 140, w: 26, h: 50, rx: 8 },
  { zone: 'hamstrings', x: 102, y: 140, w: 26, h: 50, rx: 8 },
  { zone: 'calves', x: 74, y: 194, w: 22, h: 40, rx: 8 },
  { zone: 'calves', x: 104, y: 194, w: 22, h: 40, rx: 8 },
];

export default function MuscleBodyMap({
  rows,
}: {
  rows: { target_muscle_group: string; total_volume_kg: number; total_sets: number }[];
}) {
  const [view, setView] = useState<'front' | 'back'>('front');
  const [selected, setSelected] = useState<BodyZone | null>(null);

  const zoneVolumes = useMemo(() => aggregateByZone(rows), [rows]);
  const byZone = useMemo(() => {
    const map = new Map<BodyZone, ZoneVolume>();
    for (const z of zoneVolumes) map.set(z.zone, z);
    return map;
  }, [zoneVolumes]);
  const maxVolume = useMemo(() => Math.max(0, ...zoneVolumes.map((z) => z.totalVolumeKg)), [zoneVolumes]);

  const shapes = view === 'front' ? FRONT_SHAPES : BACK_SHAPES;
  const visibleZones = view === 'front' ? FRONT_ZONES : BACK_ZONES;
  const selectedVolume = selected ? byZone.get(selected) : null;

  return (
    <View className="gap-3">
      <View className="flex-row bg-background border border-border rounded-full p-1 self-center">
        {(['front', 'back'] as const).map((v) => (
          <Pressable
            key={v}
            onPress={() => setView(v)}
            className={`px-4 py-1.5 rounded-full ${view === v ? 'bg-primary' : ''}`}
          >
            <Text className={`text-xs font-bold uppercase ${view === v ? 'text-black' : 'text-gray-400'}`}>{v}</Text>
          </Pressable>
        ))}
      </View>

      <Svg viewBox="0 0 200 250" width="100%" height={260}>
        <Circle cx="100" cy="28" r="20" fill="#1F2937" />
        <Rect x="82" y="45" width="36" height="10" rx="4" fill="#1F2937" />
        {shapes.map((s, i) => {
          const zv = byZone.get(s.zone);
          const level = intensityLevel(zv?.totalVolumeKg ?? 0, maxVolume);
          const isSelected = selected === s.zone;
          return (
            <Rect
              key={`${s.zone}-${i}`}
              x={s.x}
              y={s.y}
              width={s.w}
              height={s.h}
              rx={s.rx ?? 6}
              fill={INTENSITY_COLOR[level]}
              stroke={isSelected ? '#4ADE80' : '#0B0F0B'}
              strokeWidth={isSelected ? 2 : 1}
              onPress={() => setSelected(s.zone)}
            />
          );
        })}
        <Ellipse cx="100" cy="250" rx="1" ry="1" fill="transparent" />
      </Svg>

      {selected && (
        <View className="bg-surface border border-border rounded-xl px-4 py-3 flex-row items-center justify-between">
          <Text className="text-white font-semibold">{ZONE_LABEL[selected]}</Text>
          <Text className="text-sm text-gray-400">
            {selectedVolume && selectedVolume.totalVolumeKg > 0
              ? `${Math.round(kgToLbs(selectedVolume.totalVolumeKg)).toLocaleString()} lbs · ${selectedVolume.totalSets} sets`
              : 'Not trained recently'}
          </Text>
        </View>
      )}

      <View className="flex-row flex-wrap gap-x-4 gap-y-1.5 px-1">
        {visibleZones
          .filter((z, i) => visibleZones.indexOf(z) === i)
          .map((z) => (
            <Pressable key={z} onPress={() => setSelected(z)} className="flex-row items-center gap-1.5">
              <View
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: INTENSITY_COLOR[intensityLevel(byZone.get(z)?.totalVolumeKg ?? 0, maxVolume)] }}
              />
              <Text className="text-[11px] text-gray-500">{ZONE_LABEL[z]}</Text>
            </Pressable>
          ))}
      </View>
    </View>
  );
}
