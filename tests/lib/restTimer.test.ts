import { describe, expect, it } from 'vitest';
import { extendRestDeadline, restSecondsRemaining } from '../../src/lib/workout/restTimer';

describe('wall-clock rest timer', () => {
  it('accounts for elapsed time while the app is suspended', () => {
    expect(restSecondsRemaining(90_000, 0)).toBe(90);
    expect(restSecondsRemaining(90_000, 65_000)).toBe(25);
    expect(restSecondsRemaining(90_000, 120_000)).toBe(0);
  });
  it('rounds up incomplete seconds and handles cancellation', () => {
    expect(restSecondsRemaining(1000, 1)).toBe(1);
    expect(restSecondsRemaining(null, 1)).toBe(0);
  });
  it('extends an active timer and starts from now when already expired', () => {
    expect(extendRestDeadline(90_000, 10_000, 30)).toBe(120_000);
    expect(extendRestDeadline(90_000, 100_000, 30)).toBe(130_000);
  });
});
