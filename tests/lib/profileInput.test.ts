import { describe, expect, it } from 'vitest';
import { profileUpdate } from '../../src/lib/account/profileInput';

const input = { first_name: ' Alex ', last_name: ' Doe ', experience_level: 'BEGINNER' as const,
  primary_goal: ' ', injury_notes: ' Knee ' };

describe('account profile updates', () => {
  it('normalizes fields and excludes protected fields even when supplied', () => {
    const result = profileUpdate({ ...input, role: 'coach', coach_id: 'other' } as typeof input);
    expect(result).toEqual({ first_name: 'Alex', last_name: 'Doe', experience_level: 'BEGINNER',
      primary_goal: null, injury_notes: 'Knee' });
  });
  it('rejects missing names and oversized notes', () => {
    expect(() => profileUpdate({ ...input, first_name: ' ' })).toThrow();
    expect(() => profileUpdate({ ...input, injury_notes: 'x'.repeat(2001) })).toThrow();
  });
});
