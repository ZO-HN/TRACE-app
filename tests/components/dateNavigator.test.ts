import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import DateNavigator from '../../src/components/dashboard/DateNavigator';
import DayHistory from '../../src/components/dashboard/DayHistory';
import { localDate } from '../../src/lib/localDate';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
vi.mock('react-native', () => ({ View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView' }));
vi.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
vi.mock('expo-router', async () => {
  const { useEffect } = await import('react');
  return { useFocusEffect: (effect: () => void) => useEffect(effect, [effect]) };
});
vi.mock('../../src/hooks/useUnitPreference', () => ({ useUnitPreference: () => ({ unit: 'kg' }) }));
vi.mock('../../src/lib/outbox/outboxStore', () => ({ useOutboxStore: () => [] }));
const queries = vi.hoisted(() => ({ eq: vi.fn(), gte: vi.fn(), lt: vi.fn() }));
vi.mock('../../src/lib/supabase', () => ({ supabase: { from: () => {
  const query = {
    select: () => query,
    eq: (...args: unknown[]) => { queries.eq(...args); return query; },
    gte: (...args: unknown[]) => { queries.gte(...args); return query; },
    lt: (...args: unknown[]) => { queries.lt(...args); return query; },
    order: () => Promise.resolve({ data: [], error: null }),
  };
  return query;
} } }));
let root: ReactTestRenderer;
afterEach(async () => { await act(async () => root?.unmount()); vi.clearAllMocks(); });

it('selects past and future days and identifies the selected date', async () => {
  const onChange = vi.fn();
  await act(async () => { root = create(createElement(DateNavigator, { date: new Date(2026, 9, 8, 12), onChange })); });
  expect(root.root.findByProps({ accessibilityLabel: '2026-10-08' }).props.accessibilityState.selected).toBe(true);
  for (const date of ['2026-10-05', '2026-10-11']) {
    await act(async () => root.root.findByProps({ accessibilityLabel: date }).props.onPress());
    expect(localDate(onChange.mock.lastCall![0])).toBe(date);
  }
});

it('navigates weeks across year boundaries and returns to today', async () => {
  const onChange = vi.fn();
  await act(async () => { root = create(createElement(DateNavigator, { date: new Date(2026, 0, 2, 12), onChange })); });
  await act(async () => root.root.findByProps({ accessibilityLabel: 'Previous week' }).props.onPress());
  expect(localDate(onChange.mock.lastCall![0])).toBe('2025-12-26');
  await act(async () => root.root.findByProps({ accessibilityLabel: 'Next week' }).props.onPress());
  expect(localDate(onChange.mock.lastCall![0])).toBe('2026-01-09');
  await act(async () => root.root.findByProps({ accessibilityLabel: 'Go to today' }).props.onPress());
  expect(localDate(onChange.mock.lastCall![0])).toBe(localDate());
});

it('loads only the selected local day and shows empty states for future dates', async () => {
  await act(async () => { root = create(createElement(DayHistory, { userId: 'test-user', date: '2027-01-02' })); });
  expect(queries.eq).toHaveBeenCalledWith('user_id', 'test-user');
  expect(queries.eq).toHaveBeenCalledWith('recorded_date', '2027-01-02');
  expect(queries.gte).toHaveBeenCalledWith('logged_at', new Date('2027-01-02T00:00:00').toISOString());
  expect(queries.lt).toHaveBeenCalledWith('logged_at', new Date('2027-01-03T00:00:00').toISOString());
  expect(JSON.stringify(root.toJSON())).toContain('No entries for this date');
});
