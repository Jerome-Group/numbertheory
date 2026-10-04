import { lessons } from './content/lessons';
import { type ProgressState, parseProgressExport } from './progress-schema';

export type { ProgressState } from './progress-schema';

const storageKey = 'numbertheory.progress.v1';
const validIds = new Set(lessons.map((lesson) => lesson.id));
const listeners = new Set<() => void>();
let storageStatus: 'persistent' | 'session' | 'recovered' = 'persistent';

function load(): ProgressState {
  let raw: string | null;
  try {
    raw = localStorage.getItem(storageKey);
  } catch {
    storageStatus = 'session';
    return {};
  }
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      storageStatus = 'recovered';
      return {};
    }
    const entries = Object.entries(value);
    const valid = entries.filter(
      ([id, status]) =>
        validIds.has(id) && (status === 'complete' || status === 'review'),
    );
    if (valid.length !== entries.length) storageStatus = 'recovered';
    return Object.fromEntries(valid);
  } catch {
    storageStatus = 'recovered';
    return {};
  }
}

let snapshot = load();
function persist(next: ProgressState) {
  snapshot = next;
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
    storageStatus = 'persistent';
  } catch {
    storageStatus = 'session';
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
  getStorageStatus() {
    return storageStatus;
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
