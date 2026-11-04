import AsyncStorage from '@react-native-async-storage/async-storage';

let writes: Promise<void> = Promise.resolve();
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
