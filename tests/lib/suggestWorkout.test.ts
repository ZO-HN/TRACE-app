import { describe, expect, it } from 'vitest';
import { suggestWorkout } from '../../src/lib/generator/suggestWorkout';

const catalog = [
  { id: 'squat', name: 'Barbell Back Squat', target_muscle_group: 'Legs' },
  { id: 'bench', name: 'Barbell Bench Press', target_muscle_group: 'Chest' },
  { id: 'row', name: 'Barbell Row', target_muscle_group: 'Back' },
  { id: 'curl', name: 'Dumbbell Curl', target_muscle_group: 'Arms' },
];

describe('suggestWorkout', () => {
  it('prioritizes untrained/least-trained muscle groups first', () => {
    const suggestion = suggestWorkout(
      catalog,
      [
        { target_muscle_group: 'Chest', total_volume_kg: 5000 },
        { target_muscle_group: 'Legs', total_volume_kg: 100 },
        // Back and Arms have no volume row at all — most under-trained.
      ],
      [],
      4,
    );

    const groupsInDayOrder = suggestion.days.map((d) => d.items[0].targetMuscleGroup);
    // Back and Arms (untrained) come before Legs (100kg) before Chest (5000kg).
    expect(groupsInDayOrder.indexOf('Back')).toBeLessThan(groupsInDayOrder.indexOf('Legs'));
    expect(groupsInDayOrder.indexOf('Arms')).toBeLessThan(groupsInDayOrder.indexOf('Legs'));
    expect(groupsInDayOrder.indexOf('Legs')).toBeLessThan(groupsInDayOrder.indexOf('Chest'));
  });

  it('distributes groups round-robin across the target number of days', () => {
    const suggestion = suggestWorkout(catalog, [], [], 2);
    expect(suggestion.days).toHaveLength(2);
    // 4 groups over 2 days -> 2 items each
    expect(suggestion.days[0].items).toHaveLength(2);
    expect(suggestion.days[1].items).toHaveLength(2);
  });

  it('omits days that end up with no items', () => {
    const suggestion = suggestWorkout(catalog, [], [], 10);
    // Only 4 groups exist, so only 4 of the 10 days get an item.
    expect(suggestion.days).toHaveLength(4);
  });

  it('suggests a working weight at 70% of e1RM when a PR exists', () => {
    const suggestion = suggestWorkout(
      catalog,
      [],
      [{ exercise_id: 'squat', best_estimated_1rm: 100 }],
      4,
    );
    const squatDay = suggestion.days.find((d) =>
      d.items.some((i) => i.exerciseId === 'squat'),
    );
    expect(squatDay?.items.find((i) => i.exerciseId === 'squat')?.suggestedWeightKg).toBe(70);
  });

  it('leaves suggested weight null with no PR on record', () => {
    const suggestion = suggestWorkout(catalog, [], [], 4);
    for (const day of suggestion.days) {
      for (const item of day.items) {
        expect(item.suggestedWeightKg).toBeNull();
      }
    }
  });

  it('prefers a catalog exercise the trainee already has a PR for', () => {
    const twoLegExercises = [
      ...catalog,
      { id: 'lunge', name: 'Walking Lunge', target_muscle_group: 'Legs' },
    ];
    const suggestion = suggestWorkout(
      twoLegExercises,
      [],
      [{ exercise_id: 'lunge', best_estimated_1rm: 50 }],
      4,
    );
    const legsItem = suggestion.days
      .flatMap((d) => d.items)
      .find((i) => i.targetMuscleGroup === 'Legs');
    expect(legsItem?.exerciseId).toBe('lunge');
  });

  it('returns no days for an empty catalog', () => {
    expect(suggestWorkout([], [], [], 3).days).toEqual([]);
  });
});
