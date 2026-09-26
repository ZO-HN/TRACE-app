import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { localDate } from '../../src/lib/localDate';

const originalTimeZone = process.env.TZ;

describe('localDate', () => {
  beforeAll(() => {
    process.env.TZ = 'Asia/Singapore';
  });

  afterAll(() => {
    if (originalTimeZone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimeZone;
  });

  it('uses the device calendar day when UTC is still on the previous day', () => {
    expect(localDate(new Date('2026-08-07T16:30:00Z'))).toBe('2026-08-08');
  });
});
