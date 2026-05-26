export interface ActivityEntry {
  id: string;
  type: 'ingest' | 'lesson' | 'quiz' | 'chat' | 'summary' | 'flashcard';
  title: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

let cache: ActivityEntry[] = [];
let cacheLoaded = false;

async function fetchActivity(): Promise<ActivityEntry[]> {
  try {
    const res = await fetch('/api/activity');
    const data = await res.json();
    if (!res.ok) return [];
    return (data.entries || []) as ActivityEntry[];
  } catch {
    return [];
  }
}

async function ensureCache(): Promise<ActivityEntry[]> {
  if (typeof window === 'undefined') return [];
  if (!cacheLoaded) {
    cache = await fetchActivity();
    cacheLoaded = true;
  }
  return cache;
}

export function logActivity(
  entry: Omit<ActivityEntry, 'id' | 'timestamp'> & { timestamp?: string }
) {
  if (typeof window === 'undefined') return;

  const optimistic: ActivityEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: entry.timestamp ?? new Date().toISOString(),
  };

  cache = [optimistic, ...cache].slice(0, 50);
  cacheLoaded = true;

  fetch('/api/activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: entry.type,
      title: entry.title,
      meta: entry.meta,
    }),
  }).catch(() => {
    // keep optimistic entry
  });
}

export function getActivity(): ActivityEntry[] {
  if (typeof window === 'undefined') return [];
  if (!cacheLoaded) {
    fetchActivity().then((entries) => {
      cache = entries;
      cacheLoaded = true;
    });
    return [];
  }
  return cache;
}

export async function refreshActivity(): Promise<ActivityEntry[]> {
  cache = await fetchActivity();
  cacheLoaded = true;
  return cache;
}

export function getStats() {
  const entries = getActivity();
  const lessons = entries.filter((e) => e.type === 'lesson').length;
  const quizzes = entries.filter((e) => e.type === 'quiz');
  const lastQuizScore = quizzes.find((q) => q.meta?.score)?.meta?.score as
    | number
    | undefined;
  const ingested = entries.filter((e) => e.type === 'ingest').length;

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const day = d.toISOString().slice(0, 10);
    if (entries.some((e) => e.timestamp.startsWith(day))) streak++;
    else if (i > 0) break;
  }

  return {
    resourcesIngested: ingested,
    lessonsGenerated: lessons,
    quizScore: lastQuizScore ?? 0,
    streak: streak || (entries.length > 0 ? 1 : 0),
  };
}
