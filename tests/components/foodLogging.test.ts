import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import FavoritesTab from '../../src/components/nutrition/FavoritesTab';
import MealTemplatesTab from '../../src/components/nutrition/MealTemplatesTab';
import { Pressable } from 'react-native';
import Button from '../../src/components/ui/Button';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const fake = vi.hoisted(() => ({ log: vi.fn() }));
vi.mock('react-native', () => ({ ScrollView: 'ScrollView', View: 'View', Text: 'Text', Pressable: 'Pressable' }));
vi.mock('../../src/components/ui/Button', () => ({ default: 'Button' }));
vi.mock('../../src/components/ui/Card', () => ({ default: 'Card' }));
vi.mock('../../src/components/nutrition/EmptyTabState', () => ({ default: 'EmptyState' }));
vi.mock('../../src/hooks/useLogFood', () => ({ useLogFood: () => fake.log }));
vi.mock('../../src/hooks/useFavoriteFoods', () => ({ useFavoriteFoods: () => ({
  favorites: [{ id: 'food', name: 'Rice', calories: 200 }], isLoading: false, removeFavorite: vi.fn(),
}) }));
vi.mock('../../src/hooks/useMealTemplates', () => ({ useMealTemplates: () => ({
  templates: [{ id: 'meal', name: 'Lunch', items: [{ name: 'Rice', calories: 200 }, { name: 'Chicken', calories: 300 }] }], isLoading: false,
}) }));
let root: ReactTestRenderer;
beforeEach(() => fake.log.mockReset().mockResolvedValue(undefined));
afterEach(async () => { await act(async () => root?.unmount()); });

it('does not report favorite food logged when storage fails and allows retry', async () => {
  const onLogged = vi.fn();
  fake.log.mockRejectedValueOnce(new Error('Disk full'));
  await act(async () => { root = create(createElement(FavoritesTab, { userId: 'a', onLogged })); });
  await act(async () => { root.root.findByType(Pressable).props.onPress(); });
  expect(onLogged).not.toHaveBeenCalled();
  expect(JSON.stringify(root.toJSON())).toContain('Disk full');
  await act(async () => { root.root.findByType(Pressable).props.onPress(); });
  expect(onLogged).toHaveBeenCalledTimes(1);
});

it('retries only remaining meal-template items after a partial save failure', async () => {
  const onLogged = vi.fn();
  fake.log.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Disk full'));
  await act(async () => { root = create(createElement(MealTemplatesTab, { userId: 'a', onLogged })); });
  await act(async () => { root.root.findByType(Button).props.onPress(); });
  expect(onLogged).toHaveBeenCalledTimes(1);
  await act(async () => { root.root.findByType(Button).props.onPress(); });
  expect(fake.log.mock.calls.map((call) => call[0])).toEqual(['Rice', 'Chicken', 'Chicken']);
  expect(onLogged).toHaveBeenCalledTimes(2);
});
