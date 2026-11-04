import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Pressable, TextInput } from 'react-native';
import GymLogger from '../../src/components/GymLogger';
import { useOutboxStore } from '../../src/lib/outbox/outboxStore';
import { __setOutboxDriver } from '../../src/lib/outbox/db';
import { createMemoryOutboxDriver } from '../../src/lib/outbox/memoryDriver';
import { activeWorkoutKey } from '../../src/lib/workout/activeDraft';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const fake = vi.hoisted(() => ({ storage: new Map<string, string>(), failWrite: false, push: vi.fn(),
  exercises: [{ id: 'squat', name: 'Squat', sets: [{ id: 'set', weight: '100', reps: '8', rpe: '7', completed: false }] }],
}));
vi.mock('react-native', () => ({ View: 'View', ScrollView: 'ScrollView', Text: 'Text',
  TextInput: 'TextInput', Pressable: 'Pressable', AppState: { addEventListener: () => ({ remove: vi.fn() }) } }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: {
  getItem: async (key: string) => fake.storage.get(key) ?? null,
  setItem: async (key: string, value: string) => { if (fake.failWrite) throw new Error('Disk full'); fake.storage.set(key, value); },
  removeItem: async (key: string) => { fake.storage.delete(key); },
} }));
vi.mock('expo-crypto', () => ({ randomUUID: () => crypto.randomUUID() }));
vi.mock('expo-haptics', () => ({ notificationAsync: async () => {}, impactAsync: async () => {},
  NotificationFeedbackType: { Success: 'success' }, ImpactFeedbackStyle: { Light: 'light' } }));
vi.mock('expo-image-picker', () => ({}));
vi.mock('expo-file-system/legacy', () => ({}));
vi.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
vi.mock('expo-router', () => ({ router: { push: fake.push } }));
vi.mock('moti', () => ({ AnimatePresence: 'AnimatePresence', MotiView: 'MotiView' }));
vi.mock('../../src/components/media/MediaViewer', () => ({ default: 'MediaViewer' }));
vi.mock('../../src/components/ui/Badge', () => ({ default: 'Badge' }));
vi.mock('../../src/components/ui/Card', () => ({ default: 'Card' }));
vi.mock('../../src/components/ui/FadeInView', () => ({ default: 'FadeInView' }));
vi.mock('../../src/hooks/useAssignedWorkout', () => ({ useAssignedWorkout: () => ({
  templateId: 'template', templateName: 'Leg day', exercises: fake.exercises, status: 'ready', error: null, retry: vi.fn(),
}) }));
vi.mock('../../src/hooks/useLastSetsForExercises', () => ({ useLastSetsForExercises: () => ({}) }));
vi.mock('../../src/hooks/useSetCalibration', () => ({ useSetCalibration: () => ({ multiplierFor: () => 1, feedback: vi.fn() }) }));
vi.mock('../../src/hooks/useMediaUpload', () => ({ useMediaUpload: () => ({ upload: vi.fn(), error: null }) }));
let root: ReactTestRenderer | undefined;
beforeEach(() => {
  fake.storage.clear(); fake.failWrite = false; fake.push.mockReset();
  __setOutboxDriver(createMemoryOutboxDriver());
  useOutboxStore.setState({ items: [] });
});
afterEach(async () => { await act(async () => root?.unmount()); root = undefined; });
async function mount(userId = 'a') {
  await act(async () => { root = create(createElement(GymLogger, { userId })); });
}
function done() {
  return root!.root.findAllByType(Pressable).find((node) => node.props.accessibilityLabel === 'Complete set 1 of Squat')!;
}

it('restores unsaved weight and reps after leaving and reopening the workout', async () => {
  await mount();
  await act(async () => { await root!.root.findAllByType(TextInput)[0].props.onChangeText('135'); });
  await act(async () => { await root!.root.findAllByType(TextInput)[1].props.onChangeText('6'); });
  await act(async () => root!.unmount());
  await mount();
  expect(root!.root.findAllByType(TextInput).map((node) => node.props.value)).toEqual(['135', '6']);
});

it('restores a saved set without duplicate logging and starts a new session after finish', async () => {
  await mount();
  const original = JSON.parse(fake.storage.get(activeWorkoutKey('a', 'template'))!);
  await act(async () => { await done().props.onPress(); });
  expect(useOutboxStore.getState().items.filter((item) => item.table === 'set_logs')).toHaveLength(1);
  await act(async () => root!.unmount());
  await mount();
  expect(done().props.disabled).toBe(true);
  await act(async () => { await done().props.onPress(); });
  expect(useOutboxStore.getState().items.filter((item) => item.table === 'set_logs')).toHaveLength(1);
  const finish = root!.root.findAllByType(Pressable).find((node) => node.props.accessibilityLabel === 'Finish workout');
  expect(finish).toBeDefined();
  await act(async () => { await finish!.props.onPress(); });
  expect(fake.push).toHaveBeenCalledWith('/history');
  expect(JSON.parse(fake.storage.get(activeWorkoutKey('a', 'template'))!).session.id).not.toBe(original.session.id);
});

it('does not queue a set when its recovery draft cannot be saved', async () => {
  await mount(); fake.failWrite = true;
  await act(async () => { await done().props.onPress(); });
  expect(useOutboxStore.getState().items).toEqual([]);
  expect(done().props.disabled).toBe(false);
  expect(JSON.stringify(root!.toJSON())).toContain('Could not save this set');
});
