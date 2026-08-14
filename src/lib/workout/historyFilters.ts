// Pure client-side filtering for the History screen — sessions are already
// loaded in full (see useSessionSummaries' higher limit there), so a
// second query per filter change isn't needed.

export type DateRangeFilter = '7' | '30' | '90' | 'all';

export const DATE_RANGE_OPTIONS: { value: DateRangeFilter; label: string }[] = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

export interface SessionForFilter {
  session_name: string;
  completed_at: string;
}

export function filterSessions<T extends SessionForFilter>(
  sessions: T[],
  options: { days: DateRangeFilter; query: string; now?: Date },
): T[] {
  const now = options.now ?? new Date();
  const trimmedQuery = options.query.trim().toLowerCase();
  const cutoff = options.days === 'all' ? null : new Date(now.getTime() - Number(options.days) * 24 * 60 * 60 * 1000);

  return sessions.filter((s) => {
    if (cutoff && new Date(s.completed_at) < cutoff) return false;
    if (trimmedQuery && !s.session_name.toLowerCase().includes(trimmedQuery)) return false;
    return true;
  });
}
