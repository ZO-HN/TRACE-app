import { describe, expect, it } from 'vitest';
import {
  isValidBodyweightLbs,
  toBodyweightLogInsert,
} from '../../src/lib/bodyweight/mapBodyweight';

describe('isValidBodyweightLbs', () => {
  it('accepts a realistic bodyweight', () => {
    expect(isValidBodyweightLbs(185)).toBe(true);
  });

  it('rejects zero, negative, non-finite, and absurd values', () => {
    expect(isValidBodyweightLbs(0)).toBe(false);
    expect(isValidBodyweightLbs(-10)).toBe(false);
    expect(isValidBodyweightLbs(NaN)).toBe(false);
    expect(isValidBodyweightLbs(Infinity)).toBe(false);
    expect(isValidBodyweightLbs(5000)).toBe(false);
  });
});

describe('toBodyweightLogInsert', () => {
  it('converts lbs to kg and carries the date through', () => {
    const payload = toBodyweightLogInsert('bw-1', 'user-1', 185, '2026-08-03');
    expect(payload).toEqual({
      id: 'bw-1',
      user_id: 'user-1',
      recorded_date: '2026-08-03',
      weight_kg: 83.91,
      note: null,
    });
  });

  it('trims a note and stores blank as null', () => {
    expect(
      toBodyweightLogInsert('bw-2', 'user-1', 185, '2026-08-03', '  post-cut  ').note,
    ).toBe('post-cut');
    expect(toBodyweightLogInsert('bw-3', 'user-1', 185, '2026-08-03', '   ').note).toBeNull();
  });
});
