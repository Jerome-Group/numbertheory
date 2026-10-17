import { sql } from 'drizzle-orm';
import { check, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const accountProgress = sqliteTable(
  'account_progress',
  {
    ownerId: text('owner_id').primaryKey().notNull(),
    revision: integer('revision').notNull(),
    lessonsJSON: text('lessons_json').notNull(),
  },
  (table) => [
    check(
      'account_progress_revision',
      sql`${table.revision} >= 1 AND ${table.revision} <= 9007199254740991`,
    ),
    check(
      'account_progress_lessons_json',
      sql`json_valid(${table.lessonsJSON}) AND json_type(${table.lessonsJSON}) = 'object'`,
    ),
  ],
);
