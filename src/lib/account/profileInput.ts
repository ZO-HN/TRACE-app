import type { ExperienceTier } from '../../hooks/useTraceUser';

export type EditableProfile = {
  first_name: string;
  last_name: string;
  experience_level: ExperienceTier;
  primary_goal: string | null;
  injury_notes: string | null;
};

export function profileUpdate(input: EditableProfile): EditableProfile {
  const firstName = input.first_name.trim();
  const lastName = input.last_name.trim();
  if (!firstName || firstName.length > 80 || lastName.length > 80) {
    throw new Error('Enter a first name and keep each name under 80 characters.');
  }
  if (!['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(input.experience_level)) {
    throw new Error('Select a valid experience level.');
  }
  const goal = input.primary_goal?.trim() || null;
  const injuries = input.injury_notes?.trim() || null;
  if ((goal?.length ?? 0) > 500 || (injuries?.length ?? 0) > 2000) {
    throw new Error('Keep your goal under 500 characters and injury notes under 2,000.');
  }
  return { first_name: firstName, last_name: lastName, experience_level: input.experience_level,
    primary_goal: goal, injury_notes: injuries };
}
