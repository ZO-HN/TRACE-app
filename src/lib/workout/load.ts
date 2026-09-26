import { templateToExercises, type TemplateItemRow, type LoggerExercise } from './template';
export interface WorkoutContent { templateId: string; templateName: string; exercises: LoggerExercise[] }
export type WorkoutState = {
  status: 'loading' | 'ready' | 'cached' | 'unassigned' | 'unavailable';
  templateId: string | null; templateName: string | null; exercises: LoggerExercise[] | null; error: string | null;
};
export const emptyWorkout: WorkoutState = { status: 'loading', templateId: null, templateName: null, exercises: null, error: null };
export interface WorkoutSource {
  template: (userId: string, selectedId?: string | null) => Promise<{ id: string; name: string } | null>;
  items: (templateId: string) => Promise<TemplateItemRow[]>;
}
export interface WorkoutCache {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}
export async function loadWorkout(source: WorkoutSource, cache: WorkoutCache, userId: string, selectedId: string | null, offline: boolean): Promise<WorkoutState> {
  const key = `trace:workout:v1:${userId}:${selectedId ?? 'assigned'}`;
  try {
    if (offline) {
      const raw = await cache.getItem(key);
      if (raw) {
        const data = JSON.parse(raw) as WorkoutContent;
        if (data.templateId && (!selectedId || data.templateId === selectedId) && data.exercises?.length && data.exercises.every((e) => e.id && e.name && Array.isArray(e.sets))) {
          return { ...data, status: 'cached', error: null };
        }
      }
      return { ...emptyWorkout, status: 'unavailable', error: 'Connect once to download this workout before logging offline.' };
    }
    const template = await source.template(userId, selectedId);
    if (!template) {
      await cache.removeItem(key);
      return { ...emptyWorkout, status: selectedId ? 'unavailable' : 'unassigned', error: selectedId ? 'This workout is no longer available. Choose another workout.' : null };
    }
    const rows = await source.items(template.id);
    if (!rows.length || rows.some((r) => !r.exercise?.id)) {
      await cache.removeItem(key);
      return { ...emptyWorkout, status: 'unavailable', error: 'This workout has no available exercises. Ask your coach to update it.' };
    }
    const content = { templateId: template.id, templateName: template.name, exercises: templateToExercises(rows) };
    // A cache failure must not hide successfully fetched content.
    await cache.setItem(key, JSON.stringify(content)).catch(() => undefined);
    await cache.setItem(`trace:workout:v1:${userId}:${template.id}`, JSON.stringify(content)).catch(() => undefined);
    return { ...content, status: 'ready', error: null };
  } catch (cause) {
    return { ...emptyWorkout, status: 'unavailable', error: cause instanceof Error ? cause.message : 'Could not load this workout. Check your connection and retry.' };
  }
}
