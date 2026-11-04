import { act } from 'react-test-renderer';
import { beforeEach, expect, it, vi } from 'vitest';
import { renderHook } from '../helpers/renderHook';
import { useUnitPreference } from '../../src/hooks/useUnitPreference';

const storage = vi.hoisted(() => ({ getItem: vi.fn(), setItem: vi.fn() }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: storage }));
beforeEach(() => {
  storage.getItem.mockReset().mockResolvedValue('lbs');
  storage.setItem.mockReset().mockResolvedValue(undefined);
});

it('saves units and updates screens that are already mounted', async () => {
  const settings = await renderHook(useUnitPreference);
  const dashboard = await renderHook(useUnitPreference);
  await act(async () => settings.current.setUnit('kg'));
  expect(storage.setItem).toHaveBeenCalledWith('trace.weightUnitPreference.v1', 'kg');
  expect(settings.current.unit).toBe('kg');
  expect(dashboard.current.unit).toBe('kg');
  storage.getItem.mockResolvedValue('kg');
  expect((await renderHook(useUnitPreference)).current.unit).toBe('kg');
  await act(async () => settings.current.setUnit('lbs'));
  expect(dashboard.current.unit).toBe('lbs');
});

it('keeps the previous unit and reports a storage failure', async () => {
  const settings = await renderHook(useUnitPreference);
  storage.setItem.mockRejectedValueOnce(new Error('Disk full'));
  await act(async () => {
    await expect(settings.current.setUnit('kg')).rejects.toThrow('Disk full');
  });
  expect(settings.current.unit).toBe('lbs');
});
