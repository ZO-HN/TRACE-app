// Buckets the granular muscle_groups.name values (e.g. "Biceps Brachii Long
// Head (Biceps)") into a small set of body zones a simple front/back
// diagram can actually render. Matched by keyword, not an exhaustive
// lookup table, since the seeded muscle_groups list runs to 60+ rows.

export type BodyZone =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'hips';

export const BODY_ZONES: BodyZone[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'hips',
];

const ZONE_KEYWORDS: [BodyZone, RegExp][] = [
  ['forearms', /forearm|brachioradialis|wrist/i],
  ['biceps', /bicep/i],
  ['triceps', /tricep/i],
  ['shoulders', /delt|rotator cuff|rear delt/i],
  ['chest', /pec|chest/i],
  ['back', /lat|trap|rhomboid|upper back|lower back|erector|teres/i],
  ['abs', /abdominal|oblique|core|rectus abdominis/i],
  ['hips', /adductor|abductor|hip flexor/i],
  ['glutes', /glute/i],
  ['hamstrings', /hamstring|biceps femoris/i],
  ['quads', /quad|vastus|rectus femoris/i],
  ['calves', /calv|gastrocnemius|soleus/i],
];

export function zoneForMuscleName(name: string): BodyZone | null {
  for (const [zone, pattern] of ZONE_KEYWORDS) {
    if (pattern.test(name)) return zone;
  }
  return null;
}

export interface ZoneVolume {
  zone: BodyZone;
  totalVolumeKg: number;
  totalSets: number;
}

export function aggregateByZone(rows: { target_muscle_group: string; total_volume_kg: number; total_sets: number }[]): ZoneVolume[] {
  const byZone = new Map<BodyZone, { volume: number; sets: number }>();
  for (const row of rows) {
    const zone = zoneForMuscleName(row.target_muscle_group);
    if (!zone) continue;
    const entry = byZone.get(zone) ?? { volume: 0, sets: 0 };
    entry.volume += row.total_volume_kg;
    entry.sets += row.total_sets;
    byZone.set(zone, entry);
  }
  return BODY_ZONES.map((zone) => {
    const entry = byZone.get(zone);
    return { zone, totalVolumeKg: entry?.volume ?? 0, totalSets: entry?.sets ?? 0 };
  });
}

/** Discrete 0-5 intensity level relative to the zone with the most volume — a
 * simpler analog of Tracked's 1-11 color scale, same idea. */
export function intensityLevel(volumeKg: number, maxVolumeKg: number): number {
  if (maxVolumeKg <= 0 || volumeKg <= 0) return 0;
  return Math.max(1, Math.min(5, Math.ceil((volumeKg / maxVolumeKg) * 5)));
}
