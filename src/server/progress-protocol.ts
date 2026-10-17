import lessonIds from '../content/order.json';
import type { ProgressState } from '../progress-schema';

export type ProgressAccount = {
  accountId: string;
  displayName: string | null;
};

export type ProgressDocument = {
  revision: number;
  lessons: ProgressState;
};

export type ProgressCommand =
  | { kind: 'read' }
  | {
      kind: 'mark';
      lessonId: string;
      status: 'complete' | 'review' | null;
    }
  | ({ kind: 'replace' } & ProgressDocument);

const validLessonIds = new Set(lessonIds);
const maximumBodyBytes = 16 * 1024;

export class ProgressRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function parseLessonMap(value: unknown): ProgressState | null {
  if (!isRecord(value)) return null;
  const lessons: ProgressState = {};
  for (const [id, status] of Object.entries(value)) {
    if (
      !validLessonIds.has(id) ||
      (status !== 'complete' && status !== 'review')
    )
      return null;
    lessons[id] = status;
  }
  return lessons;
}

export async function parseProgressRequest(
  request: Request,
): Promise<ProgressCommand> {
  if (request.method === 'GET') return { kind: 'read' };
  if (request.method !== 'PATCH' && request.method !== 'PUT')
    throw invalidRequest();
  if (request.headers.get('origin') !== new URL(request.url).origin)
    throw new ProgressRequestError(
      403,
      'invalid_origin',
      'Progress changes require the same origin.',
    );
  const contentType = request.headers.get('content-type')?.split(';', 1)[0];
  if (contentType?.trim().toLowerCase() !== 'application/json')
    throw new ProgressRequestError(
      415,
      'invalid_content_type',
      'Progress changes require application/json.',
    );

  const value = await readJson(request);
  if (!isRecord(value)) throw invalidRequest();
  if (request.method === 'PATCH') {
    if (
      !hasExactFields(value, ['lessonId', 'status']) ||
      typeof value.lessonId !== 'string' ||
      !validLessonIds.has(value.lessonId) ||
      (value.status !== null &&
        value.status !== 'complete' &&
        value.status !== 'review')
    )
      throw invalidRequest();
    return { kind: 'mark', lessonId: value.lessonId, status: value.status };
  }

  if (
    !hasExactFields(value, ['revision', 'lessons']) ||
    typeof value.revision !== 'number' ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 0
  )
    throw invalidRequest();
  const lessons = parseLessonMap(value.lessons);
  if (!lessons) throw invalidRequest();
  return { kind: 'replace', revision: value.revision, lessons };
}

async function readJson(request: Request): Promise<unknown> {
  if (!request.body) throw invalidRequest();
  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0;
  let text = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > maximumBodyBytes) {
        void reader.cancel().catch(() => {});
        throw new ProgressRequestError(
          413,
          'body_too_large',
          'Progress request exceeds 16 KiB.',
        );
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof ProgressRequestError) throw error;
    throw invalidRequest();
  } finally {
    reader.releaseLock();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactFields(value: Record<string, unknown>, fields: string[]) {
  return (
    Object.keys(value).length === fields.length &&
    fields.every((field) => Object.hasOwn(value, field))
  );
}

function invalidRequest() {
  return new ProgressRequestError(
    400,
    'invalid_request',
    'Progress request is invalid.',
  );
}
