import type { Ionicons } from '@expo/vector-icons';

export interface ToolMeta {
  slug: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const TOOLS: ToolMeta[] = [
  {
    slug: 'tdee',
    title: 'TDEE & Calorie Target',
    description: 'Estimate maintenance calories (Mifflin-St Jeor) and a goal-adjusted target.',
    icon: 'flame-outline',
  },
  {
    slug: 'macros',
    title: 'Macro Split',
    description: 'Protein, fat, and carb targets from a calorie goal.',
    icon: 'pie-chart-outline',
  },
  {
    slug: 'protein',
    title: 'Protein Target',
    description: 'Daily protein target from bodyweight and goal.',
    icon: 'nutrition-outline',
  },
  {
    slug: 'one-rep-max',
    title: 'One-Rep Max',
    description: 'Estimate your 1RM from a working weight and rep count.',
    icon: 'barbell-outline',
  },
  {
    slug: 'body-fat',
    title: 'Body Fat %',
    description: 'US Navy circumference method — no calipers needed.',
    icon: 'body-outline',
  },
  {
    slug: 'plates',
    title: 'Plate Calculator',
    description: 'Plates per side to hit a target barbell weight.',
    icon: 'disc-outline',
  },
  {
    slug: 'water',
    title: 'Water Intake',
    description: 'Daily water target from bodyweight, with a training-day bump.',
    icon: 'water-outline',
  },
  {
    slug: 'strength-score',
    title: 'Wilks / DOTS Score',
    description: 'Relative-strength score to compare lifts across bodyweights.',
    icon: 'trophy-outline',
  },
];

export function findTool(slug: string | undefined): ToolMeta | undefined {
  return TOOLS.find((t) => t.slug === slug);
}
