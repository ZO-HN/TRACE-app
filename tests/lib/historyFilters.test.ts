import { describe, expect, it } from 'vitest';
import { filterSessions } from '../../src/lib/workout/historyFilters';

const NOW = new Date('2026-08-14T12:00:00Z');

const sessions = [
  { session_name: 'Push Day', completed_at: '2026-08-13T10:00:00Z' }, // 1 day ago
  { session_name: 'Leg Day', completed_at: '2026-08-01T10:00:00Z' }, // 13 days ago
  { session_name: 'Pull Day', completed_at: '2026-05-01T10:00:00Z' }, // ~105 days ago
];

describe('filterSessions', () => {
  it('returns everything for "all time" with no query', () => {
    expect(filterSessions(sessions, { days: 'all', query: '', now: NOW })).toHaveLength(3);
  });

  it('excludes sessions older than the selected date range', () => {
    const result = filterSessions(sessions, { days: '7', query: '', now: NOW });
    expect(result.map((s) => s.session_name)).toEqual(['Push Day']);
  });

  it('includes sessions right at the boundary of a wider range', () => {
    const result = filterSessions(sessions, { days: '30', query: '', now: NOW });
    expect(result.map((s) => s.session_name)).toEqual(['Push Day', 'Leg Day']);
  });

  it('filters by name, case-insensitively', () => {
    const result = filterSessions(sessions, { days: 'all', query: 'leg', now: NOW });
    expect(result.map((s) => s.session_name)).toEqual(['Leg Day']);
  });

  it('combines date range and name query', () => {
    const result = filterSessions(sessions, { days: '30', query: 'push', now: NOW });
    expect(result.map((s) => s.session_name)).toEqual(['Push Day']);
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterSessions(sessions, { days: '7', query: 'leg', now: NOW })).toEqual([]);
  });
});
