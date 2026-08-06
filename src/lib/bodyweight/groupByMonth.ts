// Groups a most-recent-first bodyweight entry list into month buckets for
// the history table (e.g. "August 2026", "July 2026").

export interface MonthGroup<T> {
  label: string; // "August 2026"
  key: string; // "2026-08" — stable sort/dedup key
  entries: T[];
}

export function groupByMonth<T extends { recorded_date: string }>(entries: T[]): MonthGroup<T>[] {
  const groups: MonthGroup<T>[] = [];
  const byKey = new Map<string, MonthGroup<T>>();

  for (const entry of entries) {
    const key = entry.recorded_date.slice(0, 7); // "YYYY-MM"
    let group = byKey.get(key);
    if (!group) {
      const [year, month] = key.split('-').map(Number);
      const label = new Date(year, month - 1, 1).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
      group = { label, key, entries: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.entries.push(entry);
  }

  return groups;
}
