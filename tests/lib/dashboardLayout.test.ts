import { expect, it } from 'vitest';
import { defaultDashboardLayout, parseDashboardLayout } from '../../src/lib/dashboard/layout';
it('defaults all groups to visible and recovers malformed storage', () => {
  expect(parseDashboardLayout(null)).toEqual(defaultDashboardLayout);
  expect(parseDashboardLayout('{')).toEqual(defaultDashboardLayout);
});
it('preserves saved visibility and adds new groups with defaults', () => {
  expect(parseDashboardLayout('{"training":false,"water":false}')).toEqual({ ...defaultDashboardLayout, training: false, water: false });
});
it('rejects non-boolean values and ignores unknown keys', () => {
  expect(parseDashboardLayout('{"training":"false","unknown":true}')).toEqual(defaultDashboardLayout);
});
