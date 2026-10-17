import { lessons } from './content/lessons';
import { type ProgressState, parseProgressExport } from './progress-schema';

export type { ProgressState } from './progress-schema';

type AccountId = string & { readonly __brand: 'AccountId' };
type AccountProgress = {
  accountId: AccountId;
  displayName: string | null;
  revision: number;
};
export type ProgressStatus =
  | { kind: 'unknown' | 'loading' | 'anonymous' }
  | { kind: 'unavailable'; message: string }
  | (AccountProgress & { kind: 'ready' | 'saving' })
  | (AccountProgress & {
      kind: 'error' | 'uncertain' | 'conflict';
      message: string;
    });
export type LegacyProgress =
  | { kind: 'available'; lessons: ProgressState; ignored: number }
  | { kind: 'empty' | 'unavailable' | 'invalid' };

const storageKey = 'numbertheory.progress.v1';
const validIds = new Set(lessons.map((lesson) => lesson.id));
const listeners = new Set<() => void>();
let snapshot: ProgressState = {};
let status: ProgressStatus = { kind: 'unknown' };
let confirmedAccount: AccountProgress | null = null;
let generation = 0;
let writing = false;

function publish(next: ProgressStatus, marks = snapshot) {
  status = next;
  snapshot = marks;
  for (const listener of listeners) listener();
}

function parseDocument(value: unknown): AccountProgress & {
  lessons: ProgressState;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !('accountId' in value) ||
    typeof value.accountId !== 'string' ||
    !value.accountId ||
    !('displayName' in value) ||
    (value.displayName !== null && typeof value.displayName !== 'string') ||
    !('revision' in value) ||
    typeof value.revision !== 'number' ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 0 ||
    !('lessons' in value) ||
    Object.keys(value).some(
      (key) =>
        !['accountId', 'displayName', 'revision', 'lessons'].includes(key),
    )
  )
    throw new Error('Invalid account progress response.');
  return {
    accountId: value.accountId as AccountId,
    displayName: value.displayName,
    revision: value.revision,
    lessons: parseProgressExport(
      JSON.stringify({ schemaVersion: 1, lessons: value.lessons }),
      validIds,
    ),
  };
}

export function canSaveProgress(current: ProgressStatus) {
  return current.kind === 'ready' || current.kind === 'error';
}

function clearSession() {
  generation++;
  confirmedAccount = null;
  publish({ kind: 'anonymous' }, {});
}

async function reload() {
  if (writing) return;
  const requestGeneration = ++generation;
  const previous = confirmedAccount;
  publish({ kind: 'loading' }, {});
  try {
    const response = await fetch('/api/progress', {
      credentials: 'same-origin',
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    if (requestGeneration !== generation) return;
    if (response.status === 401) {
      clearSession();
      return;
    }
    if (!response.ok) throw new Error('Progress unavailable.');
    const document = parseDocument(await response.json());
    if (requestGeneration !== generation) return;
    if (
      previous?.accountId === document.accountId &&
      document.revision < previous.revision
    )
      throw new Error('Older progress response.');
    const { lessons: marks, ...account } = document;
    confirmedAccount = account;
    publish({ kind: 'ready', ...account }, marks);
  } catch {
    if (requestGeneration !== generation) return;
    publish({
      kind: 'unavailable',
      message: 'Account progress is unavailable. Reload progress to try again.',
    });
  }
}

async function write(
  accountId: AccountId,
  method: 'PATCH' | 'PUT',
  body: object,
) {
  if (
    writing ||
    !canSaveProgress(status) ||
    !('accountId' in status) ||
    status.accountId !== accountId
  )
    return false;
  const account = {
    accountId: status.accountId,
    displayName: status.displayName,
    revision: status.revision,
  };
  const requestGeneration = generation;
  writing = true;
  publish({ kind: 'saving', ...account });
  try {
    const response = await fetch('/api/progress', {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    if (requestGeneration !== generation) return false;
    if (response.status === 401) {
      clearSession();
      return false;
    }
    if (response.status === 409) {
      publish({
        kind: 'conflict',
        ...account,
        message:
          'Progress changed elsewhere. Reload progress before restoring or clearing marks.',
      });
      return false;
    }
    if ([400, 403, 413, 415].includes(response.status)) {
      publish({
        kind: 'error',
        ...account,
        message:
          'The save was rejected. Your last confirmed marks are unchanged.',
      });
      return false;
    }
    if (!response.ok) throw new Error('Save not confirmed.');
    const document = parseDocument(await response.json());
    if (requestGeneration !== generation) return false;
    if (document.accountId !== accountId) {
      generation++;
      confirmedAccount = null;
      publish(
        {
          kind: 'unavailable',
          message: 'Your account changed. Reload progress before saving.',
        },
        {},
      );
      return false;
    }
    if (document.revision <= account.revision)
      throw new Error('Older save response.');
    const { lessons: marks, ...savedAccount } = document;
    confirmedAccount = savedAccount;
    publish({ kind: 'ready', ...savedAccount }, marks);
    return true;
  } catch {
    if (requestGeneration !== generation) return false;
    publish({
      kind: 'uncertain',
      ...account,
      message:
        'Save confirmation was lost. The change may have saved. Reload progress before marking again.',
    });
    return false;
  } finally {
    writing = false;
  }
}

function replace(accountId: AccountId, marks: ProgressState) {
  if (!('accountId' in status) || status.accountId !== accountId)
    return Promise.resolve(false);
  return write(accountId, 'PUT', {
    revision: status.revision,
    lessons: marks,
  });
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
  getStatusSnapshot() {
    return status;
  },
  reload,
  clearSession,
  set({
    accountId,
    lessonId,
    status: mark,
  }: {
    accountId: AccountId;
    lessonId: string;
    status: ProgressState[string] | null;
  }) {
    if (!validIds.has(lessonId)) throw new Error('Unknown lesson ID.');
    return write(accountId, 'PATCH', { lessonId, status: mark });
  },
  exportJson() {
    return JSON.stringify({ schemaVersion: 1, lessons: snapshot }, null, 2);
  },
  importJson({ text, accountId }: { text: string; accountId: AccountId }) {
    return replace(accountId, parseProgressExport(text, validIds));
  },
  readLegacy(): LegacyProgress {
    let raw: string | null;
    try {
      raw = localStorage.getItem(storageKey);
    } catch {
      return { kind: 'unavailable' };
    }
    if (!raw) return { kind: 'empty' };
    try {
      const value: unknown = JSON.parse(raw);
      if (!value || typeof value !== 'object' || Array.isArray(value))
        return { kind: 'invalid' };
      const entries = Object.entries(value);
      const valid = entries.filter(
        ([id, mark]) =>
          validIds.has(id) && (mark === 'complete' || mark === 'review'),
      );
      const marks = parseProgressExport(
        JSON.stringify({
          schemaVersion: 1,
          lessons: Object.fromEntries(valid),
        }),
        validIds,
      );
      if (!valid.length) return { kind: 'empty' };
      return {
        kind: 'available',
        lessons: marks,
        ignored: entries.length - valid.length,
      };
    } catch {
      return { kind: 'invalid' };
    }
  },
  importLegacy({
    accountId,
    lessons: legacy,
  }: {
    accountId: AccountId;
    lessons: ProgressState;
  }) {
    return replace(accountId, { ...legacy, ...snapshot });
  },
  reset(accountId: AccountId) {
    return replace(accountId, {});
  },
};
