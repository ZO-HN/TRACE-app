import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import QuickAddTab from '../../src/components/nutrition/QuickAddTab';
import { Text, TextInput } from 'react-native';
import Button from '../../src/components/ui/Button';
import { deferred } from '../helpers/renderHook';

const fake = vi.hoisted(() => ({ log: vi.fn() }));
vi.mock('react-native', () => ({ ScrollView: 'ScrollView', View: 'View', Text: 'Text', TextInput: 'TextInput' }));
vi.mock('expo-image-picker', () => ({}));
vi.mock('expo-file-system/legacy', () => ({}));
vi.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
vi.mock('expo-router', () => ({ router: { push: vi.fn() } }));
vi.mock('../../src/components/ui/Button', () => ({ default: 'Button' }));
vi.mock('../../src/components/ai/VoiceInputButton', () => ({ default: 'VoiceInputButton' }));
vi.mock('../../src/hooks/useNutritionLogs', () => ({ useNutritionLogs: () => ({ logEntry: fake.log }) }));
vi.mock('../../src/hooks/useAICopilotConfig', () => ({ useAICopilotConfig: () => ({ isConfigured: false }) }));
vi.mock('../../src/lib/ai/client', () => ({ chatCompletion: vi.fn() }));
let root: ReactTestRenderer;
beforeEach(() => fake.log.mockReset());
afterEach(async () => { await act(async () => root?.unmount()); });
const save = () => root.root.findAllByType(Button).find((button) => button.props.children === 'Save entry')!;

it('keeps recoverable input on storage failure and reports success only after durable save', async () => {
  const onLogged = vi.fn();
  const write = deferred<{ ok: boolean; error?: string }>();
  fake.log.mockReturnValueOnce(write.promise).mockResolvedValueOnce({ ok: true });
  await act(async () => { root = create(createElement(QuickAddTab, { userId: 'a', slot: 2, onLogged })); });
  await act(async () => root.root.findByType(TextInput).props.onChangeText('Yogurt, 150 kcal'));
  await act(async () => { save().props.onPress(); });
  expect(onLogged).not.toHaveBeenCalled();
  expect(root.root.findByType(TextInput).props.value).toBe('Yogurt, 150 kcal');
  await act(async () => write.resolve({ ok: false, error: 'Disk full' }));
  expect(root.root.findAllByType(Text).some((node) => node.props.children === 'Disk full')).toBe(true);
  expect(root.root.findByType(TextInput).props.value).toBe('Yogurt, 150 kcal');
  await act(async () => { save().props.onPress(); });
  expect(onLogged).toHaveBeenCalledTimes(1);
  expect(fake.log).toHaveBeenLastCalledWith('Yogurt, 150 kcal', 2);
  expect(root.root.findByType(TextInput).props.value).toBe('');
});

it('keeps invalid input visible and disables saving for unsupported or malformed quantities', async () => {
  await act(async () => { root = create(createElement(QuickAddTab, { userId: 'a', onLogged: vi.fn() })); });
  for (const text of ['Yogurt', '-25g protein, 150 kcal', '1e+3 kcal', '1e-3 kcal', '-0.1 kcal', '1,2,3 kcal', '200 kcal,1e+3g protein', '20g protein, -25g protein', '-25g protein, 20g protein', '20g carbs, -0.1g carbs', '20g fat, -0,1g fat', '200 kcal, -0.1 kcal']) {
    await act(async () => root.root.findByType(TextInput).props.onChangeText(text));
    expect(save().props.disabled).toBe(true);
    expect(root.root.findByType(TextInput).props.value).toBe(text);
    expect(fake.log).not.toHaveBeenCalled();
  }
});
