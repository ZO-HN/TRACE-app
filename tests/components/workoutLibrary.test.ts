import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MyWorkouts } from '../../src/components/TrainingScreen';
import { deferred } from '../helpers/renderHook';

const fake = vi.hoisted(() => ({ move: vi.fn(), remove: vi.fn(), refresh: vi.fn(), push: vi.fn() }));
vi.mock('react-native', () => ({ View: 'View', Text: 'Text', Pressable: 'Pressable', TextInput: 'TextInput' }));
vi.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
vi.mock('expo-router', () => ({ router: { push: fake.push }, useFocusEffect: () => {} }));
vi.mock('moti', () => ({ MotiView: 'View' }));
vi.mock('expo-crypto', () => ({ randomUUID: () => 'uuid' }));
vi.mock('../../src/lib/supabase', () => ({ supabase: {} }));
vi.mock('../../src/components/WorkoutGenerator', () => ({ default: 'Generator' }));
vi.mock('../../src/components/analytics/MuscleBodyMap', () => ({ default: 'BodyMap' }));
vi.mock('../../src/components/ui/Card', () => ({ default: 'Card' }));
vi.mock('../../src/components/ui/Button', () => ({ default: 'Button' }));
vi.mock('../../src/components/ui/Select', () => ({ default: 'Select' }));
vi.mock('../../src/components/ui/FadeInView', () => ({ default: 'Fade' }));
vi.mock('../../src/components/ui/Skeleton', () => ({ default: 'Skeleton' }));
vi.mock('../../src/hooks/useWorkoutFolders', () => ({ useWorkoutFolders: () => ({
  folders: [{ id: 'f', name: 'Strength' }, { id: 'empty', name: 'Empty' }],
  refresh: fake.refresh, deleteFolder: fake.remove,
}) }));
vi.mock('../../src/hooks/useWorkoutTemplates', () => ({ useWorkoutTemplates: () => ({
  templates: [{ id: 'push', name: 'Push Day', scope: 'PRIVATE', folderId: 'f', exerciseCount: 3 },
    { id: 'pull', name: 'Pull Day', scope: 'ASSIGNED', folderId: null, exerciseCount: 4 }],
  isLoading: false, refresh: fake.refresh, moveToFolder: fake.move,
}) }));
let root: ReactTestRenderer;
beforeEach(async () => {
  fake.move.mockReset().mockResolvedValue({ ok: true });
  fake.remove.mockReset().mockResolvedValue({ ok: true });
  fake.refresh.mockReset().mockResolvedValue(undefined); fake.push.mockReset();
  await act(async () => { root = create(createElement(MyWorkouts, { userId: 'a' })); });
});
afterEach(async () => { await act(async () => root.unmount()); });
function label(name: string) { return root.root.findByProps({ accessibilityLabel: name }); }
function button(text: string) { return root.root.findAll((node) => String(node.type) === 'Button').find((node) => node.props.children === text)!; }
function names() { return root.root.findAll((node) => String(node.type) === 'Text').map((node) => node.props.children); }

it('searches collapsed folders without losing the original collapse state', async () => {
  await act(async () => { label('Strength workouts').props.onPress(); });
  expect(names()).not.toContain('Push Day');
  await act(async () => { label('Search workouts').props.onChangeText(' PUSH '); });
  expect(names()).toContain('Push Day'); expect(names()).not.toContain('Pull Day');
  await act(async () => { label('Search workouts').props.onChangeText(''); });
  expect(names()).not.toContain('Push Day'); expect(names()).toContain('Pull Day');
});

it('shows no-match feedback and provides rename controls for empty folders', async () => {
  await act(async () => { label('Rename Empty').props.onPress(); });
  expect(fake.push).toHaveBeenCalledWith({ pathname: '/workouts/folders/new', params: { id: 'empty', name: 'Empty' } });
  await act(async () => { label('Search workouts').props.onChangeText('missing'); });
  expect(names()).toContain('No matching workouts.');
});

it('requires confirmation, retains failures, and supports retrying folder deletion', async () => {
  await act(async () => { label('Delete Empty').props.onPress(); });
  expect(fake.remove).not.toHaveBeenCalled();
  fake.remove.mockResolvedValueOnce({ ok: false, error: 'Offline' });
  await act(async () => { await button('Delete folder').props.onPress(); });
  expect(root.root.findByProps({ accessibilityRole: 'alert' }).props.children).toBe('Offline');
  await act(async () => { await button('Delete folder').props.onPress(); });
  expect(fake.remove).toHaveBeenCalledTimes(2);
  expect(button('Delete folder')).toBeUndefined();
});

it('blocks duplicate moves while pending and surfaces rejected writes', async () => {
  const request = deferred<{ ok: boolean }>(); fake.move.mockReturnValueOnce(request.promise);
  const select = () => root.root.findAll((node) => String(node.type) === 'Select')[0];
  let pending!: Promise<void>;
  await act(async () => {
    pending = select().props.onChange('none');
    await select().props.onChange('empty');
  });
  expect(fake.move).toHaveBeenCalledTimes(1); expect(select().props.disabled).toBe(true);
  await act(async () => { request.resolve({ ok: true }); await pending; });
  fake.move.mockRejectedValueOnce(new Error('Disconnected'));
  await act(async () => { await select().props.onChange('empty'); });
  expect(root.root.findByProps({ accessibilityRole: 'alert' }).props.children).toBe('Disconnected');
  expect(select().props.disabled).toBe(false);
});
