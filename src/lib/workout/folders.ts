// Pure grouping helper: workout templates + folders -> folder-grouped
// structure for the "My Workouts" list. Templates with no folder_id (or
// whose folder no longer exists) land in an "Unfoldered" bucket.

export interface WorkoutFolder {
  id: string;
  name: string;
}

export interface WorkoutTemplateSummary {
  id: string;
  name: string;
  scope: 'ASSIGNED' | 'PRIVATE';
  folderId: string | null;
  exerciseCount: number;
}

export interface FolderGroup {
  folder: WorkoutFolder | null; // null = "Unfoldered" / "My Workouts"
  templates: WorkoutTemplateSummary[];
}

export function groupByFolder(
  templates: WorkoutTemplateSummary[],
  folders: WorkoutFolder[],
): FolderGroup[] {
  const foldersById = new Map(folders.map((f) => [f.id, f]));
  const byFolderKey = new Map<string, FolderGroup>();
  const unfoldered: FolderGroup = { folder: null, templates: [] };
  const groups: FolderGroup[] = [];

  for (const template of templates) {
    const folder = template.folderId ? foldersById.get(template.folderId) : undefined;
    if (!folder) {
      unfoldered.templates.push(template);
      continue;
    }
    let group = byFolderKey.get(folder.id);
    if (!group) {
      group = { folder, templates: [] };
      byFolderKey.set(folder.id, group);
      groups.push(group);
    }
    group.templates.push(template);
  }

  if (unfoldered.templates.length > 0 || groups.length === 0) groups.push(unfoldered);
  return groups;
}
