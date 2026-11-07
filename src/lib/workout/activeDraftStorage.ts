import AsyncStorage from '@react-native-async-storage/async-storage';
import { activeWorkoutKey, parseActiveWorkout, type ActiveWorkoutDraft } from './activeDraft';

let writes: Promise<void> = Promise.resolve();
export async function listActiveDrafts(userId: string): Promise<ActiveWorkoutDraft[]> {
  await writes.catch(() => undefined);
  const prefix = activeWorkoutKey(userId, '');
  const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(prefix));
  const drafts = await Promise.all(keys.map(async (key) => {
    const templateId = key.slice(prefix.length);
    return parseActiveWorkout(await readActiveDraft(key), userId, templateId);
  }));
  return drafts.filter((draft): draft is ActiveWorkoutDraft => draft !== null)
    .sort((a, b) => b.session.startedAtMs - a.session.startedAtMs);
}
export async function readActiveDraft(key: string): Promise<string | null> {
  await writes.catch(() => undefined);
  return AsyncStorage.getItem(key);
}
export function writeActiveDraft(key: string, value: string | null): Promise<void> {
  const result = writes.catch(() => undefined).then(() => value === null
    ? AsyncStorage.removeItem(key) : AsyncStorage.setItem(key, value));
  writes = result;
  return result;
}
