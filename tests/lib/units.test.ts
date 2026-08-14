import { describe, expect, it } from 'vitest';
import { formatWeightKg, kgToLbs, lbsToKg, parseWeightToKg } from '../../src/lib/units';

describe('formatWeightKg', () => {
  it('converts to pounds for the lbs preference', () => {
    expect(formatWeightKg(100, 'lbs')).toEqual({ value: kgToLbs(100), unit: 'lbs' });
  });

  it('passes through kilograms (rounded to 1 decimal) for the kg preference', () => {
    expect(formatWeightKg(100.36, 'kg')).toEqual({ value: 100.4, unit: 'kg' });
  });
});

describe('parseWeightToKg', () => {
  it('converts a pound entry to kilograms', () => {
    expect(parseWeightToKg(220, 'lbs')).toBe(lbsToKg(220));
  });

  it('passes through a kilogram entry unchanged (rounded to 2 decimals)', () => {
    expect(parseWeightToKg(100.456, 'kg')).toBe(100.46);
  });

  it('round-trips reasonably through format then parse', () => {
    const original = 102.5;
    const displayed = formatWeightKg(original, 'kg');
    expect(parseWeightToKg(displayed.value, 'kg')).toBeCloseTo(original, 0);
  });
});
