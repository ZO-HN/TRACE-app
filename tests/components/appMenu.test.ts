import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AppMenu from '../../src/components/ui/AppMenu';
import { deferred } from '../helpers/renderHook';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const fake = vi.hoisted(() => ({ signOut: vi.fn(), close: vi.fn() }));
vi.mock('react-native', () => ({ View: 'View', Text: 'Text', Pressable: 'Pressable',
  Modal: 'Modal', ScrollView: 'ScrollView', Alert: { alert: vi.fn() } }));
vi.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
vi.mock('expo-router', () => ({ router: { push: vi.fn() } }));
vi.mock('../../src/lib/supabase', () => ({ supabase: { auth: { signOut: fake.signOut } } }));
let root: ReactTestRenderer;
beforeEach(async () => {
  fake.close.mockReset(); fake.signOut.mockReset().mockResolvedValue({ error: null });
  await act(async () => { root = create(createElement(AppMenu, { visible: true, onClose: fake.close })); });
});
afterEach(async () => { await act(async () => root.unmount()); });
function button() { return root.root.findByProps({ accessibilityLabel: 'Sign out' }); }

it('keeps the menu open and permits retry after an auth error', async () => {
  fake.signOut.mockResolvedValueOnce({ error: new Error('Network unavailable') });
  await act(async () => { await button().props.onPress(); });
  expect(fake.close).not.toHaveBeenCalled();
  expect(root.root.findByProps({ accessibilityRole: 'alert' }).props.children).toBe('Network unavailable');
  expect(button().props.disabled).toBe(false);
  await act(async () => { await button().props.onPress(); });
  expect(fake.close).toHaveBeenCalledTimes(1);
  expect(root.root.findAllByProps({ accessibilityRole: 'alert' })).toHaveLength(0);
});
it('blocks duplicate requests and closes only after confirmed success', async () => {
  const request = deferred<{ error: null }>(); fake.signOut.mockReturnValue(request.promise);
  let pending!: Promise<void>;
  await act(async () => { pending = button().props.onPress(); await button().props.onPress(); });
  expect(fake.signOut).toHaveBeenCalledTimes(1);
  expect(fake.close).not.toHaveBeenCalled(); expect(button().props.disabled).toBe(true);
  await act(async () => { request.resolve({ error: null }); await pending; });
  expect(fake.close).toHaveBeenCalledTimes(1);
});
it('recovers from a rejected auth request without closing the menu', async () => {
  fake.signOut.mockRejectedValue(new Error('Connection lost'));
  await act(async () => { await button().props.onPress(); });
  expect(fake.close).not.toHaveBeenCalled(); expect(button().props.disabled).toBe(false);
  expect(root.root.findByProps({ accessibilityRole: 'alert' }).props.children).toBe('Connection lost');
});
