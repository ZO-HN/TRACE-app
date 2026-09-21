import type { OutboxItem } from './types';

export function ownerOf(item: OutboxItem, items: OutboxItem[]): string | undefined {
  if (item.owner_id) return item.owner_id;
  if ('user_id' in item.payload) return item.payload.user_id;
  const parent = items.find((i) => i.id === ('session_id' in item.payload ? item.payload.session_id : null));
  return parent && 'user_id' in parent.payload ? parent.payload.user_id : undefined;
}

export function forUser(items: OutboxItem[], userId: string): OutboxItem[] {
  return items.filter((item) => ownerOf(item, items) === userId);
}
