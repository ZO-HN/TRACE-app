// Per-exercise calibration multiplier for predictNextSet, adjusted by user
// thumbs up/down feedback. Stored entirely on-device (AsyncStorage) — no
// table, no sync, matching the "your training data never leaves your
// phone" shape of the feature this mirrors.

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'trace.autoRegulateCalibration.v1';
const STEP = 0.05;
const MIN_MULTIPLIER = 0.85;
const MAX_MULTIPLIER = 1.15;

type CalibrationMap = Record<string, number>;

async function readAll(): Promise<CalibrationMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CalibrationMap) : {};
  } catch {
    return {};
  }
}

async function writeAll(map: CalibrationMap): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Best-effort — a failed write just means calibration resets to neutral.
  }
}

export async function getCalibrationMap(): Promise<CalibrationMap> {
  return readAll();
}

export function clampMultiplier(value: number): number {
  return Math.round(Math.min(MAX_MULTIPLIER, Math.max(MIN_MULTIPLIER, value)) * 100) / 100;
}

/** Nudges an exercise's calibration multiplier up or down by one step and
 * persists it. Returns the new multiplier. */
export async function recordFeedback(exerciseId: string, direction: 'up' | 'down'): Promise<number> {
  const map = await readAll();
  const current = map[exerciseId] ?? 1;
  const next = clampMultiplier(current + (direction === 'up' ? STEP : -STEP));
  map[exerciseId] = next;
  await writeAll(map);
  return next;
}
