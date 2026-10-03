import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { validateEvidence } from './evidence.mjs';

const root = mkdtempSync(join(tmpdir(), 'nt-strict-')),
  path = join(root, 'observations.txt');
writeFileSync(path, 'Retained observation/review fixture.');
process.on('exit', () => rmSync(root, { recursive: true, force: true }));
const identity = {
    sourceHash: 'source',
    lockHash: 'lock',
    buildHash: 'build',
    scopeHash: 'scope',
  },
  map = {
    requiredCoverage: ['route:P00', 'practice:P00:answer'],
    lessons: [{ id: 'P00' }, { id: 'D04' }],
  };
const observedAt = new Date().toISOString();
const artifact = {
  id: 'notes',
  path,
  sha256: createHash('sha256')
    .update('Retained observation/review fixture.')
    .digest('hex'),
};
const base = () => ({
  schemaVersion: 1,
  ...identity,
  status: 'passed',
  observer: 'coordinator',
  observedAt,
  artifacts: [{ ...artifact }],
});
const record = (id) => ({
  id,
  status: 'passed',
  observedAt,
  summary: `Observed ${id}`,
  artifactRefs: ['notes'],
});
const browser = () => ({
  ...base(),
  kind: 'browser',
  surface: 'codex-in-app-browser',
  coverage: map.requiredCoverage.map(record),
});
const review = (reviewer, lessonIds) => ({
  reviewer,
  authors: ['partition-builder'],
  lessonIds,
  independent: true,
  status: 'passed',
  observedAt,
  summary: 'Reviewed all teaching fields including annotations/options.',
  artifactRefs: ['notes'],
});
const semantic = () => ({
  ...base(),
  kind: 'semantic',
  independent: true,
  authors: ['builder'],
  lessonIds: ['P00', 'D04'],
  unresolvedFindings: 0,
  reviews: [review('reviewer-one', ['P00']), review('reviewer-two', ['D04'])],
});
const validate = (e, kind) =>
  validateEvidence(e, identity, map, kind, {
    artifactRoot: root,
    authors: ['trusted-builder'],
  });
test('good browser records and exact independent reviewer partition accepted', () => {
  assert.equal(validate(browser(), 'browser'), true);
  assert.equal(validate(semantic(), 'semantic'), true);
});
test('duplicate failed plus passed coverage cannot mask failure; fake/missing IDs fail', () => {
  for (const coverage of [
    [
      record('route:P00'),
      { ...record('route:P00'), status: 'failed' },
      record('practice:P00:answer'),
    ],
    [record('fake'), record('practice:P00:answer')],
    [record('route:P00')],
  ])
    assert.throws(() => validate({ ...browser(), coverage }, 'browser'));
});
test('per-record skip, summary, timestamps, refs and unknown fields rejected', () => {
  for (const patch of [
    { status: 'skipped' },
    { summary: '' },
    { observedAt: 'invalid' },
    { observedAt: '2000-01-01T00:00:00Z' },
    { artifactRefs: [] },
    { artifactRefs: ['fake'] },
    { artifactRefs: ['notes', 'notes'] },
    { imagined: true },
  ])
    assert.throws(() =>
      validate(
        {
          ...browser(),
          coverage: [
            { ...record('route:P00'), ...patch },
            record('practice:P00:answer'),
          ],
        },
        'browser',
      ),
    );
});
test('empty, tampered and duplicate artifacts rejected', () => {
  const empty = join(root, 'empty');
  writeFileSync(empty, '');
  for (const artifacts of [
    [
      {
        ...artifact,
        path: empty,
        sha256: createHash('sha256').update('').digest('hex'),
      },
    ],
    [{ ...artifact, sha256: 'a'.repeat(64) }],
    [artifact, artifact],
    [],
  ])
    assert.throws(() => validate({ ...browser(), artifacts }, 'browser'));
});
test('stale hashes, missing envelope, fake surface and unknown envelope fields rejected', () => {
  assert.throws(() => validate(null, 'browser'));
  for (const key of Object.keys(identity))
    assert.throws(() => validate({ ...browser(), [key]: 'old' }, 'browser'));
  for (const patch of [
    { surface: 'external-browser' },
    { invented: true },
    { observedAt: 'tomorrow' },
  ])
    assert.throws(() => validate({ ...browser(), ...patch }, 'browser'));
});
test('semantic false/string flags, author reviewer and fake/duplicate lesson IDs fail', () => {
  for (const patch of [
    { independent: false },
    { independent: 'false' },
    { lessonIds: ['P00', 'fake'] },
    { lessonIds: ['P00', 'P00'] },
    { unresolvedFindings: 1 },
    { authors: [] },
  ])
    assert.throws(() => validate({ ...semantic(), ...patch }, 'semantic'));
  for (const reviewer of ['builder', 'trusted-builder', ''])
    assert.throws(() =>
      validate(
        { ...semantic(), reviews: [review(reviewer, ['P00', 'D04'])] },
        'semantic',
      ),
    );
});
test('review partition requires complete exactly-once IDs and independent current records', () => {
  for (const reviews of [
    [review('one', ['P00'])],
    [review('one', ['P00']), review('two', ['P00', 'D04'])],
    [review('one', ['P00', 'fake'])],
    [{ ...review('one', ['P00', 'D04']), independent: 'true' }],
    [{ ...review('one', ['P00', 'D04']), artifactRefs: [] }],
  ])
    assert.throws(() => validate({ ...semantic(), reviews }, 'semantic'));
});
test('impossible calendar date is rejected even if Date.parse normalizes it', () => {
  const now = Date.parse('2026-10-03T00:00:00Z');
  assert.throws(
    () =>
      validateEvidence(
        { ...browser(), observedAt: '2026-09-31T00:00:00Z' },
        identity,
        map,
        'browser',
        { artifactRoot: root, now },
      ),
    /invalid/,
  );
});

test('partition author cannot review their own teaching even when integration author differs', () => {
  const evidence = semantic();
  evidence.reviews[0].authors = ['reviewer-one'];
  assert.throws(() => validate(evidence, 'semantic'), /distinct from authors/);
  evidence.reviews[0].authors = [];
  assert.throws(() => validate(evidence, 'semantic'), /Partition authors/);
});
