import { describe, expect, it } from 'vitest';
import { groupByFolder, type WorkoutFolder, type WorkoutTemplateSummary } from '../../src/lib/workout/folders';

const template = (overrides: Partial<WorkoutTemplateSummary>): WorkoutTemplateSummary => ({
  id: 'w1',
  name: 'Leg day',
  scope: 'PRIVATE',
  folderId: null,
  exerciseCount: 6,
  ...overrides,
});

describe('groupByFolder', () => {
  it('buckets templates by folder and puts folderless ones in Unfoldered', () => {
    const folders: WorkoutFolder[] = [{ id: 'f1', name: 'Push/Pull' }];
    const templates = [
      template({ id: 'w1', folderId: 'f1' }),
      template({ id: 'w2', folderId: null }),
      template({ id: 'w3', folderId: 'f1' }),
    ];

    const groups = groupByFolder(templates, folders);
    expect(groups).toHaveLength(2);
    expect(groups[0].folder?.name).toBe('Push/Pull');
    expect(groups[0].templates.map((t) => t.id)).toEqual(['w1', 'w3']);
    expect(groups[1].folder).toBeNull();
    expect(groups[1].templates.map((t) => t.id)).toEqual(['w2']);
  });

  it('falls back to Unfoldered for a folder_id that no longer exists', () => {
    const groups = groupByFolder([template({ folderId: 'missing' })], []);
    expect(groups).toHaveLength(1);
    expect(groups[0].folder).toBeNull();
  });

  it('returns a single empty Unfoldered group for no templates', () => {
    const groups = groupByFolder([], []);
    expect(groups).toEqual([{ folder: null, templates: [] }]);
  });
});
