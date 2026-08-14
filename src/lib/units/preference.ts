// Device-level weight-unit preference (lbs/kg). Local only, not synced to
// the account — bodyweight/lbs displays throughout the app assumed lbs
// with no real setting behind it; this is that setting. Deliberately a
// device preference (AsyncStorage), not a profiles column, so it ships
// without needing a migration.

import AsyncStorage from '@react-native-async-storage/async-storage';

export type WeightUnit = 'lbs' | 'kg';

const STORAGE_KEY = 'trace.weightUnitPreference.v1';
const DEFAULT_UNIT: WeightUnit = 'lbs';

export async function getWeightUnitPreference(): Promise<WeightUnit> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw === 'kg' ? 'kg' : DEFAULT_UNIT;
  } catch {
    return DEFAULT_UNIT;
  }
}

export async function setWeightUnitPreference(unit: WeightUnit): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, unit);
  } catch {
    // Best-effort — a failed write just means the preference resets to lbs.
  }
}
