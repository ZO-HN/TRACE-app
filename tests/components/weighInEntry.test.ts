import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import WeighInEntryScreen from '../../app/bodyweight/entry';
import Button from '../../src/components/ui/Button';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const fake = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), replace: vi.fn() }));
vi.mock('react-native', () => ({ View: 'View', ScrollView: 'ScrollView', Text: 'Text', TextInput: 'TextInput' }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
vi.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
vi.mock('expo-crypto', () => ({ randomUUID: () => 'new-id' }));
vi.mock('expo-router', () => ({ router: { replace: fake.replace } }));
vi.mock('../../src/context/TraceUserContext', () => ({ useTraceUserContext: () => ({ profile: { id: 'owner' } }) }));
vi.mock('../../src/hooks/useUnitPreference', () => ({ useUnitPreference: () => ({ unit: 'kg', isLoaded: true }) }));
vi.mock('../../src/components/ui/Button', () => ({ default: 'Button' }));
vi.mock('../../src/components/ui/ScreenHeader', () => ({ default: 'Header' }));
vi.mock('../../src/lib/supabase', () => ({ supabase: { from: () => {
  const query = { select: () => query, eq: () => query, maybeSingle: fake.read, upsert: fake.write };
  return query;
} } }));
let root: ReactTestRenderer;
beforeEach(async () => {
  fake.read.mockReset().mockResolvedValue({ data: null, error: null });
  fake.write.mockReset().mockResolvedValue({ error: null }); fake.replace.mockReset();
  await act(async () => { root = create(createElement(WeighInEntryScreen)); });
  await edit('Weigh-in date', '2024-02-29');
  await edit('Weigh-in weight in kg', '70.25');
});
afterEach(async () => { await act(async () => root.unmount()); });
async function edit(label: string, value: string) {
  await act(async () => root.root.findByProps({ accessibilityLabel: label }).props.onChangeText(value));
}
async function save() { await act(async () => { await root.root.findByType(Button).props.onPress(); }); }

it('saves a past date with the selected unit and opens history only after success', async () => {
  await save();
  expect(fake.write).toHaveBeenCalledWith({ id: 'new-id', user_id: 'owner',
    recorded_date: '2024-02-29', weight_kg: 70.25, note: null }, { onConflict: 'user_id,recorded_date' });
  expect(fake.replace).toHaveBeenCalledWith('/bodyweight/history');
});
it('requires an explicit second tap to replace an existing day and resets consent on edits', async () => {
  fake.read.mockResolvedValue({ data: { id: 'existing' }, error: null });
  await save();
  expect(fake.write).not.toHaveBeenCalled();
  expect(root.root.findByType(Button).props.children).toBe('Replace existing weigh-in');
  await edit('Weigh-in weight in kg', '71');
  await save();
  expect(fake.write).not.toHaveBeenCalled();
  await save();
  expect(fake.write).toHaveBeenCalledTimes(1);
  expect(fake.write.mock.calls[0][0].id).toBe('existing');
});
it('preserves the form and exposes a recoverable backend failure', async () => {
  fake.write.mockRejectedValue(new Error('Connection lost'));
  await save();
  expect(fake.replace).not.toHaveBeenCalled();
  expect(root.root.findByProps({ accessibilityLabel: 'Weigh-in weight in kg' }).props.value).toBe('70.25');
  expect(root.root.findByProps({ accessibilityRole: 'alert' }).props.children).toBe('Connection lost');
  expect(root.root.findByType(Button).props.loading).toBe(false);
});
it('does not write or navigate after an invalid date', async () => {
  await edit('Weigh-in date', '2025-02-29'); await save();
  expect(fake.read).not.toHaveBeenCalled(); expect(fake.write).not.toHaveBeenCalled();
  expect(fake.replace).not.toHaveBeenCalled();
});
it('matches the database note limit and rejects oversized notes before a request', async () => {
  expect(root.root.findByProps({ accessibilityLabel: 'Weigh-in note' }).props.maxLength).toBe(280);
  await edit('Weigh-in note', 'x'.repeat(281)); await save();
  expect(fake.read).not.toHaveBeenCalled(); expect(fake.write).not.toHaveBeenCalled();
  expect(root.root.findByProps({ accessibilityRole: 'alert' }).props.children).toContain('280');
  await edit('Weigh-in note', 'x'.repeat(280)); await save();
  expect(fake.write.mock.calls[0][0].note).toHaveLength(280);
});
