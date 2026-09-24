import assert from 'node:assert/strict';
import test from 'node:test';
import { parseProgressExport } from './progress-schema.ts';

const validIds = new Set(['P00', 'C02']);

test('restores only known lesson marks from a versioned export', () => {
  assert.deepEqual(
    parseProgressExport(
      JSON.stringify({
        schemaVersion: 1,
        lessons: { P00: 'complete', C02: 'review' },
      }),
      validIds,
    ),
    { P00: 'complete', C02: 'review' },
  );
});

test('rejects malformed, future, and unknown progress without partial import', () => {
  for (const text of [
    '{',
    '[]',
    JSON.stringify({ schemaVersion: 2, lessons: {} }),
    JSON.stringify({ schemaVersion: 1, lessons: [] }),
    JSON.stringify({ schemaVersion: 1, lessons: { X99: 'complete' } }),
    JSON.stringify({ schemaVersion: 1, lessons: { P00: 'other' } }),
  ])
    assert.throws(() => parseProgressExport(text, validIds));
});
