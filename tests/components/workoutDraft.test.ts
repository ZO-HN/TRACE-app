import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Pressable, TextInput } from 'react-native';
import GymLogger from '../../src/components/GymLogger';
import { useOutboxStore } from '../../src/lib/outbox/outboxStore';
import { __setOutboxDriver, putOutboxItem } from '../../src/lib/outbox/db';
import { createMemoryOutboxDriver } from '../../src/lib/outbox/memoryDriver';
import { activeWorkoutKey, type ActiveWorkoutDraft } from '../../src/lib/workout/activeDraft';
import type { OutboxItem } from '../../src/lib/outbox/types';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const fake = vi.hoisted(() => ({ storage: new Map<string, string>(), failWrite: false, push: vi.fn(),
  exercises: [{ id: 'squat', name: 'Squat', sets: [{ id: 'set', weight: '100', reps: '8', rpe: '7', completed: false }] }],
  uploadNodes: [] as any[],
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
vi.mock('../../src/components/media/UploadRecovery', () => ({ default: (props: any) => { fake.uploadNodes.push(props); return 'UploadRecovery'; } }));
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
  fake.exercises = [{ id: 'squat', name: 'Squat', sets: [
    { id: 'set', weight: '100', reps: '8', rpe: '7', completed: false },
    { id: 'set2', weight: '90', reps: '10', rpe: '7', completed: false },
  ] }]; fake.uploadNodes = [];
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
function recovery() { return fake.uploadNodes[fake.uploadNodes.length - 1]; }
async function chooseClip() { await act(async () => { root!.root.findAllByType(Pressable).find(node => node.findAllByType('Text' as any).some(text => text.children.join('') === 'Form clip'))!.props.onPress(); }); }

it('restores unsaved weight and reps after leaving and reopening the workout', async () => {
  await mount();
  await act(async () => { await root!.root.findAllByType(TextInput)[0].props.onChangeText('135'); });
  await act(async () => { await root!.root.findAllByType(TextInput)[1].props.onChangeText('6'); });
  await act(async () => root!.unmount());
  await mount();
  expect(root!.root.findAllByType(TextInput).map((node) => node.props.value)).toEqual(['135', '6', '90', '10']);
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
  expect(fake.storage.has(activeWorkoutKey('a', 'template'))).toBe(false);
  // Navigation can leave this tab mounted behind History. A fresh edit on
  // return must start another durable session, without restoring the old one.
  await act(async () => root!.root.findAllByType(TextInput)[0].props.onChangeText('155'));
  expect(JSON.parse(fake.storage.get(activeWorkoutKey('a', 'template'))!).session.id).not.toBe(original.session.id);
  await act(async () => root!.unmount());
  await mount();
  expect(root!.root.findAllByType(TextInput)[0].props.value).toBe('155');
  expect(JSON.parse(fake.storage.get(activeWorkoutKey('a', 'template'))!).session.id).not.toBe(original.session.id);
});

it('does not queue a set when its recovery draft cannot be saved', async () => {
  await mount(); fake.failWrite = true;
  await act(async () => { await done().props.onPress(); });
  expect(useOutboxStore.getState().items).toEqual([]);
  expect(done().props.disabled).toBe(false);
  expect(JSON.stringify(root!.toJSON())).toContain('Could not save this set');
});

it('blocks logging when repeated legacy sets cannot be matched and retains the draft and queue', async () => {
  const cachedDraft: ActiveWorkoutDraft = { version: 1, templateId: 'template',
    session: { id: 'session', userId: 'a', sessionName: 'Leg day', startedAtMs: 1 },
    exercises: [
      { id: 'squat', name: 'Squat', sets: [{ id: 'same', weight: '100', reps: '8', rpe: '7', completed: false }] },
      { id: 'squat', name: 'Squat', sets: [{ id: 'same', weight: '200', reps: '12', rpe: '9', completed: false }] },
    ], logIds: [], videoKeys: {} };
  const queued: OutboxItem = { id: 'legacy', owner_id: 'a', table: 'set_logs', status: 'pending', attempts: 0,
    updated_at: new Date(0).toISOString(), payload: { id: 'legacy', session_id: 'session', exercise_id: 'squat',
      set_number: 1, weight_kg: 45.36, reps: 8, rpe: 7, is_completed: true } };
  const key = activeWorkoutKey('a', 'template');
  fake.storage.set(key, JSON.stringify(cachedDraft));
  useOutboxStore.setState({ items: [queued] });
  __setOutboxDriver(createMemoryOutboxDriver());
  await putOutboxItem(queued);

  await mount();

  const rendered = JSON.stringify(root!.toJSON());
  expect(rendered).toContain("Some saved sets couldn't be matched to this workout");
  expect(root!.root.findAllByType(Pressable).some((node) => node.props.accessibilityLabel === 'Complete set 1 of Squat')).toBe(false);
  expect(fake.storage.get(key)).toBe(JSON.stringify(cachedDraft));
  expect(useOutboxStore.getState().items).toEqual([queued]);
});

it('persists a recovered clip before queuing its set with that exact key', async () => {
  await mount(); await chooseClip(); const callbacks = recovery();
  await act(async () => callbacks.onStart());
  await act(async () => callbacks.onUse({ key: 'form-video/a/op' }));
  await act(async () => callbacks.onEnd());
  const saved = JSON.parse(fake.storage.get(activeWorkoutKey('a', 'template'))!);
  expect(saved.videoKeys.set).toBe('form-video/a/op');
  await act(async () => { await done().props.onPress(); });
  const queued = useOutboxStore.getState().items.find(item => item.table === 'set_logs');
  expect(queued?.payload).toMatchObject({ id: saved.logIds?.[0]?.[1] ?? expect.any(String), form_video_s3_key: 'form-video/a/op' });
  expect(useOutboxStore.getState().items.filter(item => item.table === 'set_logs')).toHaveLength(1);
});

it('blocks completing the target set and finishing while upload recovery is active', async () => {
  await mount(); await act(async () => { await root!.root.findAllByType(Pressable).find(node => node.props.accessibilityLabel === 'Complete set 2 of Squat')!.props.onPress(); }); await chooseClip(); const callbacks = recovery();
  await act(async () => callbacks.onStart());
  const finish = root!.root.findAllByType(Pressable).find(node => node.props.accessibilityLabel === 'Finish workout');
  expect(done().props.disabled).toBe(true); expect(finish?.props.disabled).toBe(true);
  const count = useOutboxStore.getState().items.length;
  await act(async () => { await done().props.onPress(); await finish!.props.onPress(); });
  expect(useOutboxStore.getState().items).toHaveLength(count); expect(fake.push).not.toHaveBeenCalled();
  await act(async () => callbacks.onEnd());
});

it('rejects stale recovery callbacks after finishing and starting a new session', async () => {
  await mount(); await chooseClip(); const callbacks = recovery(); const oldSession = JSON.parse(fake.storage.get(activeWorkoutKey('a', 'template'))!).session.id;
  await act(async () => { await done().props.onPress(); });
  const finish = root!.root.findAllByType(Pressable).find(node => node.props.accessibilityLabel === 'Finish workout')!;
  await act(async () => { await finish.props.onPress(); });
  await act(async () => { await root!.root.findAllByType(TextInput)[0].props.onChangeText('120'); });
  const newDraft = JSON.parse(fake.storage.get(activeWorkoutKey('a', 'template'))!);
  expect(newDraft.session.id).not.toBe(oldSession);
  expect(() => callbacks.onStart()).toThrow('Finish the current save and choose this set again.');
  await expect(callbacks.onUse({key: 'form-video/a/stale'})).rejects.toThrow('unfinished set');
  expect(JSON.parse(fake.storage.get(activeWorkoutKey('a', 'template'))!).videoKeys).toEqual({});
});

it('keeps a recovered clip unattached when durable draft write fails', async () => {
  await mount(); await chooseClip(); const callbacks = recovery(); fake.failWrite = true;
  await act(async () => callbacks.onStart());
  await expect(callbacks.onUse({ key: 'form-video/a/op' })).rejects.toThrow('Disk full');
  expect(JSON.parse(fake.storage.get(activeWorkoutKey('a', 'template'))!).videoKeys).toEqual({});
  expect(useOutboxStore.getState().items.filter(item => item.table === 'set_logs')).toEqual([]);
  await act(async () => callbacks.onEnd());
});
