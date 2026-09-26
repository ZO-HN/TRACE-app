import { describe, expect, it, vi } from 'vitest';
import { loadWorkout, type WorkoutCache, type WorkoutSource } from '../../src/lib/workout/load';

function setup() {
  const saved = new Map<string, string>();
  const cache: WorkoutCache = {
    getItem: async (key) => saved.get(key) ?? null,
    setItem: async (key, value) => { saved.set(key, value); },
    removeItem: async (key) => { saved.delete(key); },
  };
  const source: WorkoutSource = {
    template: vi.fn().mockResolvedValue({ id: 'template-a', name: 'Assigned workout' }),
    items: vi.fn().mockResolvedValue([{ position: 1, target_sets: 3, target_reps: 8, target_rpe: 7, exercise: { id: 'exercise-a', name: 'Squat' } }]),
  };
  return { cache, saved, source };
}
describe('real workout cache', () => {
  it('downloads real IDs and reuses them after an offline restart', async () => {
    const { cache, source } = setup();
    const first = await loadWorkout(source, cache, 'a', null, false);
    const offline = await loadWorkout(source, cache, 'a', null, true);
    expect(first.status).toBe('ready');
    expect(offline.status).toBe('cached');
    expect(offline.exercises?.[0].id).toBe('exercise-a');
    expect(source.template).toHaveBeenCalledTimes(1);
  });
  it('never reads another account or another selection from cache', async () => {
    const { cache, source } = setup();
    await loadWorkout(source, cache, 'a', null, false);
    expect((await loadWorkout(source, cache, 'b', null, true)).status).toBe('unavailable');
    expect((await loadWorkout(source, cache, 'a', 'different', true)).status).toBe('unavailable');
  });
  it('revoked selected workouts clear their cached copy without choosing a replacement', async () => {
    const { cache, source } = setup();
    await loadWorkout(source, cache, 'a', 'template-a', false);
    vi.mocked(source.template).mockResolvedValue(null);
    const result = await loadWorkout(source, cache, 'a', 'template-a', false);
    expect(result.status).toBe('unavailable');
    expect(result.exercises).toBeNull();
    expect((await loadWorkout(source, cache, 'a', 'template-a', true)).status).toBe('unavailable');
  });
  it('distinguishes an unassigned account from backend errors and empty templates', async () => {
    const { cache, source } = setup();
    vi.mocked(source.template).mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('Schema unavailable'));
    expect((await loadWorkout(source, cache, 'a', null, false)).status).toBe('unassigned');
    expect((await loadWorkout(source, cache, 'a', null, false)).error).toBe('Schema unavailable');
    vi.mocked(source.items).mockResolvedValue([]);
    expect((await loadWorkout(source, cache, 'a', null, false)).status).toBe('unavailable');
  });
});
