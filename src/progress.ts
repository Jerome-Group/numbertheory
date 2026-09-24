import { lessons } from './content/lessons';
import { parseProgressExport, type ProgressState } from './progress-schema';

export type { ProgressState } from './progress-schema';
const storageKey = 'numbertheory.progress.v1';
const validIds = new Set(lessons.map((lesson) => lesson.id));
const listeners = new Set<() => void>();

function load(): ProgressState {
  try {
    const raw = localStorage.getItem(storageKey);
    const value: unknown = raw ? JSON.parse(raw) : {};
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter(
        ([id, status]) =>
          validIds.has(id) && (status === 'complete' || status === 'review'),
      ),
    );
  } catch {
    return {};
  }
}

let snapshot = load();
function persist(next: ProgressState) {
  snapshot = next;
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    /* Progress remains usable for this browser session. */
  }
  for (const listener of listeners) listener();
}

export const progressStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot() {
    return snapshot;
  },
  set(id: string, status: ProgressState[string] | null) {
    if (!validIds.has(id)) throw new Error('Unknown lesson ID.');
    const next = { ...snapshot };
    if (status) next[id] = status;
    else delete next[id];
    persist(next);
  },
  exportJson() {
    return JSON.stringify({ schemaVersion: 1, lessons: snapshot }, null, 2);
  },
  importJson(text: string) {
    persist(parseProgressExport(text, validIds));
  },
  reset() {
    persist({});
  },
};
