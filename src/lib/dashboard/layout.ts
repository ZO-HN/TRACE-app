export const dashboardGroups = [
  { key: 'training', label: 'Training' }, { key: 'nutrition', label: 'Calories and macros' },
  { key: 'weightSteps', label: 'Bodyweight and steps' }, { key: 'cardioSleep', label: 'Cardio and sleep' },
  { key: 'water', label: 'Water' }, { key: 'physique', label: 'Physique' },
] as const;
export type DashboardGroup = typeof dashboardGroups[number]['key'];
export type DashboardLayout = Record<DashboardGroup, boolean>;
export const defaultDashboardLayout: DashboardLayout = {
  training: true, nutrition: true, weightSteps: true, cardioSleep: true, water: true, physique: true,
};
export function parseDashboardLayout(raw: string | null): DashboardLayout {
  if (!raw) return { ...defaultDashboardLayout };
  try {
    const parsed = JSON.parse(raw);
    return Object.fromEntries(dashboardGroups.map(({ key }) =>
      [key, typeof parsed?.[key] === 'boolean' ? parsed[key] : true])) as DashboardLayout;
  } catch { return { ...defaultDashboardLayout }; }
}
