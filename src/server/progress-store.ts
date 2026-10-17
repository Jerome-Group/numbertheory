import type { accountProgress } from '../../db/schema';
import {
  type ProgressCommand,
  type ProgressDocument,
  parseLessonMap,
} from './progress-protocol';

type StoredProgress = Pick<
  typeof accountProgress.$inferSelect,
  'revision' | 'lessonsJSON'
>;

export async function readProgress(database: D1Database, accountId: string) {
  const row = await database
    .prepare(
      `SELECT revision, lessons_json AS lessonsJSON
       FROM account_progress WHERE owner_id = ?1`,
    )
    .bind(accountId)
    .first<StoredProgress>();
  return row ? parseStoredProgress(row) : { revision: 0, lessons: {} };
}

export async function changeProgress({
  database,
  accountId,
  command,
}: {
  database: D1Database;
  accountId: string;
  command: Exclude<ProgressCommand, { kind: 'read' }>;
}): Promise<ProgressDocument | null> {
  const statement =
    command.kind === 'mark'
      ? database
          .prepare(
            `INSERT INTO account_progress (owner_id, revision, lessons_json)
             VALUES (?1, 1, json_patch('{}', ?2))
             ON CONFLICT(owner_id) DO UPDATE SET
               revision = account_progress.revision + 1,
               lessons_json = json_patch(account_progress.lessons_json, ?2)
             WHERE account_progress.revision < 9007199254740991
             RETURNING revision, lessons_json AS lessonsJSON`,
          )
          .bind(
            accountId,
            JSON.stringify({ [command.lessonId]: command.status }),
          )
      : database
          .prepare(
            `INSERT INTO account_progress (owner_id, revision, lessons_json)
             SELECT ?1, 1, ?2
             WHERE ?3 = 0 OR EXISTS (
               SELECT 1 FROM account_progress WHERE owner_id = ?1
             )
             ON CONFLICT(owner_id) DO UPDATE SET
               revision = account_progress.revision + 1,
               lessons_json = excluded.lessons_json
             WHERE account_progress.revision = ?3
               AND account_progress.revision < 9007199254740991
             RETURNING revision, lessons_json AS lessonsJSON`,
          )
          .bind(accountId, JSON.stringify(command.lessons), command.revision);
  const row = await statement.first<StoredProgress>();
  return row ? parseStoredProgress(row) : null;
}

function parseStoredProgress(row: StoredProgress): ProgressDocument {
  const lessons = parseLessonMap(JSON.parse(row.lessonsJSON));
  if (!lessons || !Number.isSafeInteger(row.revision) || row.revision < 1)
    throw new Error('Stored progress is invalid.');
  return { revision: row.revision, lessons };
}
