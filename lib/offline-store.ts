'use client';

export type OfflineItemType = 'lesson' | 'note' | 'flashcard' | 'audio';

export type OfflineItem = {
  id: string;
  type: OfflineItemType;
  title: string;
  content: string;
  savedAt: string;
  meta?: Record<string, unknown>;
};

const OFFLINE_KEY = 'aetherlearn-offline-library';

function readItems(): OfflineItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]') as OfflineItem[];
  } catch {
    return [];
  }
}

function writeItems(items: OfflineItem[]) {
  localStorage.setItem(OFFLINE_KEY, JSON.stringify(items.slice(0, 200)));
}

export function getOfflineItems() {
  return readItems();
}

export function saveOfflineItem(item: Omit<OfflineItem, 'savedAt'>) {
  const items = readItems();
  writeItems([
    { ...item, savedAt: new Date().toISOString() },
    ...items.filter((existing) => existing.id !== item.id),
  ]);
}

export function deleteOfflineItem(id: string) {
  writeItems(readItems().filter((item) => item.id !== id));
}

export function isOfflineItemSaved(id: string) {
  return readItems().some((item) => item.id === id);
}
