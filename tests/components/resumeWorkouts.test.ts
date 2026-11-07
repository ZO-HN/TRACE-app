import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ResumeWorkouts from '../../src/components/ResumeWorkouts';
import { deferred } from '../helpers/renderHook';

const fake = vi.hoisted(() => ({ list: vi.fn(), push: vi.fn() }));
vi.mock('react-native', () => ({ View: 'View', Text: 'Text' }));
vi.mock('expo-router', async () => {
  const { useEffect } = await import('react');
  return { router: { push: fake.push }, useFocusEffect: (callback: () => void) => useEffect(callback, [callback]) };
});
vi.mock('../../src/lib/workout/activeDraftStorage', () => ({ listActiveDrafts: (...args: unknown[]) => fake.list(...args) }));
vi.mock('../../src/components/ui/Button', () => ({ default: 'Button' }));
let root: ReactTestRenderer;
beforeEach(() => { fake.list.mockReset(); fake.push.mockReset(); });
afterEach(async () => { await act(async () => root?.unmount()); });
const draft = { templateId: 'offline-selection', session: { sessionName: 'Saved leg day' } };
it('opens the exact stored selection and offers recovery when local reads fail', async () => {
  fake.list.mockRejectedValueOnce(new Error('Disk unavailable')).mockResolvedValue([draft]);
  await act(async () => { root = create(createElement(ResumeWorkouts, { userId: 'a' })); });
  expect(JSON.stringify(root.toJSON())).toContain('Could not load saved workouts');
  await act(async () => root.root.findByProps({ children: 'Retry saved workouts' }).props.onPress());
  await act(async () => root.root.findByProps({ children: 'Resume Saved leg day' }).props.onPress());
  expect(fake.push).toHaveBeenCalledWith({ pathname: '/(tabs)/session', params: { templateId: 'offline-selection' } });
});
it('hides old owner rows immediately and ignores late results after switching accounts', async () => {
  const late = deferred<unknown[]>();
  fake.list.mockReturnValueOnce(late.promise).mockResolvedValue([]);
  await act(async () => { root = create(createElement(ResumeWorkouts, { userId: 'a' })); });
  await act(async () => root.update(createElement(ResumeWorkouts, { userId: 'b' })));
  await act(async () => late.resolve([draft]));
  expect(JSON.stringify(root.toJSON())).not.toContain('Saved leg day');
  expect(fake.push).not.toHaveBeenCalled();
});
