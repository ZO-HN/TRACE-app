import { expect, it } from 'vitest';
import { validateWeighInDate, weighInWeightKg } from '../../src/lib/bodyweight/entryInput';

it('accepts past dates and today without timezone shifts', () => {
  expect(validateWeighInDate('2024-02-29', '2026-10-14')).toBe('2024-02-29');
  expect(validateWeighInDate('2026-10-14', '2026-10-14')).toBe('2026-10-14');
});
it.each(['2025-02-29', '2026-02-30', '2026-13-01', '10/14/2026', '2026-10-15', '0000-01-01'])
  ('rejects invalid or future date %s', (value) => {
    expect(() => validateWeighInDate(value, '2026-10-14')).toThrow();
  });
it('converts the chosen unit to database kilograms', () => {
  expect(weighInWeightKg(' 70.25 ', 'kg')).toBe(70.25);
  expect(weighInWeightKg('154', 'lbs')).toBe(69.85);
  expect(weighInWeightKg('70,25', 'kg')).toBe(70.25);
  expect(weighInWeightKg('154,5', 'lbs')).toBe(70.08);
});
it.each(['', '0', '-1', 'NaN', 'Infinity', '1e2', '700', '0.001', '70abc', '70,2.5', '70,,25', '70,25 kg'])
  ('rejects invalid database weight %s', (value) => {
    expect(() => weighInWeightKg(value, 'kg')).toThrow();
  });
