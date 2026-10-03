import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  buildFingerprint,
  commands,
  fingerprint,
  prerequisiteClosure,
  runStage,
  validateEvidence,
  validateInventory,
} from './verify.mjs';

const identity = {
  sourceHash: 'source',
  lockHash: 'lock',
  buildHash: 'build',
  scopeHash: 'scope',
};
const map = {
  requiredCoverage: ['route:P00', 'tool:compute_euclid'],
  lessons: [{ id: 'P00' }],
};
const artifactRoot = mkdtempSync(join(tmpdir(), 'numbertheory-evidence-'));
const artifactPath = join(artifactRoot, 'observation.txt');
writeFileSync(artifactPath, 'fixture observation');
const artifact = {
  id: 'notes',
  path: artifactPath,
  sha256: createHash('sha256').update('fixture observation').digest('hex'),
};
process.on('exit', () =>
  rmSync(artifactRoot, { recursive: true, force: true }),
);
const browser = () => ({
  schemaVersion: 1,
  kind: 'browser',
  ...identity,
  status: 'passed',
  observer: 'CUA reviewer',
  artifacts: [artifact],
  observedAt: new Date().toISOString(),
  surface: 'codex-in-app-browser',
  coverage: map.requiredCoverage.map((id) => ({
    id,
    status: 'passed',
    observedAt: new Date().toISOString(),
    summary: 'Observed fixture',
    artifactRefs: ['notes'],
  })),
});
test('valid complete same-build browser evidence accepted', () =>
  assert.equal(validateEvidence(browser(), identity, map, 'browser'), true));
test('inventory detects same-count lesson replacement', () => {
  assert.throws(
    () =>
      validateInventory([{ id: 'P00' }, { id: 'X99' }], {
        lessonIds: ['P00', 'D04'],
      }),
    /baseline inventory/,
  );
  assert.doesNotThrow(() =>
    validateInventory([{ id: 'D04' }, { id: 'P00' }], {
      lessonIds: ['P00', 'D04'],
    }),
  );
});
test('path transitive closure detects omitted indirect prerequisites and cycles', () => {
  const lessons = [
    { id: 'A', prerequisites: [] },
    { id: 'B', prerequisites: ['A'] },
    { id: 'C', prerequisites: ['B'] },
  ];
  assert.deepEqual(
    prerequisiteClosure(lessons, { path: { ids: ['C'] } }).path.missing,
    ['A', 'B'],
  );
  assert.equal(
    prerequisiteClosure(lessons, { path: { ids: ['A', 'B', 'C'] } }).path
      .closed,
    true,
  );
  assert.throws(
    () =>
      prerequisiteClosure([{ id: 'A', prerequisites: ['A'] }], {
        path: { ids: ['A'] },
      }),
    /cycle/,
  );
});
test('catalog exposes automated and release boundaries without repository reads', () => {
  assert.match(commands.verify.purpose, /automated gates only/);
  assert.ok(
    commands['verify:release'].prerequisites.includes(
      'actual current CUA browser evidence',
    ),
  );
});
test('missing evidence fails closed', () =>
  assert.throws(
    () => validateEvidence(null, identity, map, 'browser'),
    /object/,
  ));
test('missing or tampered evidence artifact fails closed', () => {
  for (const item of [
    { ...artifact, path: join(artifactRoot, 'missing') },
    { ...artifact, sha256: 'old' },
  ])
    assert.throws(
      () =>
        validateEvidence(
          { ...browser(), artifacts: [item] },
          identity,
          map,
          'browser',
        ),
      /artifact|Artifact|ENOENT/,
    );
});
test('stale source, lock, build, or scope cannot reuse green', () => {
  for (const key of Object.keys(identity))
    assert.throws(
      () =>
        validateEvidence(
          { ...browser(), [key]: 'old' },
          identity,
          map,
          'browser',
        ),
      /Stale/,
    );
});
test('missing, skipped, failed coverage each reject', () => {
  for (const coverage of [
    [],
    [{ id: 'route:P00', status: 'passed' }],
    map.requiredCoverage.map((id) => ({ id, status: 'skipped' })),
  ])
    assert.throws(
      () =>
        validateEvidence({ ...browser(), coverage }, identity, map, 'browser'),
      /coverage/i,
    );
});
test('timestamp, surface, failed status reject', () => {
  for (const patch of [
    { observedAt: 'bad' },
    { observedAt: '2000-01-01T00:00:00Z' },
    { surface: 'playwright' },
    { status: 'failed' },
    { artifacts: [] },
  ])
    assert.throws(() =>
      validateEvidence({ ...browser(), ...patch }, identity, map, 'browser'),
    );
});
test('semantic review requires independent complete scope and zero unresolved findings', () => {
  const { surface, coverage, ...envelope } = browser();
  const review = {
    ...envelope,
    kind: 'semantic',
    independent: true,
    authors: ['builder'],
    lessonIds: ['P00'],
    unresolvedFindings: 0,
    reviews: [
      {
        reviewer: 'reviewer',
        authors: ['partition-builder'],
        independent: true,
        status: 'passed',
        lessonIds: ['P00'],
        observedAt: new Date().toISOString(),
        summary: 'Independent review fixture',
        artifactRefs: ['notes'],
      },
    ],
  };
  assert.equal(validateEvidence(review, identity, map, 'semantic'), true);
  for (const patch of [
    { independent: false },
    { lessonIds: [] },
    { unresolvedFindings: 1 },
  ])
    assert.throws(() =>
      validateEvidence({ ...review, ...patch }, identity, map, 'semantic'),
    );
});
test('invalid command is never executed', () => {
  let calls = 0;
  assert.throws(
    () => runStage('build; touch /tmp/unsafe', '/', () => calls++),
    /Unknown command/,
  );
  assert.equal(calls, 0);
});
test('stage records failed command and launch failure', () => {
  assert.equal(
    runStage('types', '/', () => ({ status: 7, stdout: '', stderr: 'bad' }))
      .status,
    'failed',
  );
  assert.equal(
    runStage('types', '/', () => ({
      status: null,
      error: new Error('missing npm'),
    })).exitCode,
    1,
  );
});
test('missing dist cannot produce public scan green', () => {
  const root = mkdtempSync(join(tmpdir(), 'numbertheory-missing-'));
  try {
    assert.throws(() => buildFingerprint(root), /Missing dist/);
    assert.throws(
      () => runStage('public', root, () => ({ status: 0 })),
      /Missing dist/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('source hash detects tracked working-tree edits; build hash detects changed generated assets', () => {
  const root = mkdtempSync(join(tmpdir(), 'numbertheory-hash-'));
  try {
    execFileSync('git', ['init', '-q', root]);
    writeFileSync(join(root, 'package-lock.json'), '{}');
    writeFileSync(join(root, 'owned.ts'), 'export const x=1;');
    execFileSync('git', ['-C', root, 'add', '.']);
    execFileSync('git', [
      '-C',
      root,
      '-c',
      'user.name=Fixture',
      '-c',
      'user.email=fixture@example.invalid',
      'commit',
      '-qm',
      'fixture',
    ]);
    const first = fingerprint(root);
    writeFileSync(join(root, 'owned.ts'), 'export const x=2;');
    assert.notEqual(fingerprint(root).sourceHash, first.sourceHash);
    mkdirSync(join(root, 'dist'));
    writeFileSync(join(root, 'dist/index.html'), 'old');
    const old = buildFingerprint(root);
    writeFileSync(join(root, 'dist/index.html'), 'new');
    assert.notEqual(buildFingerprint(root).buildHash, old.buildHash);
    assert.equal(fingerprint(root).files, 2);
    writeFileSync(join(root, 'new.ts'), 'new source');
    assert.notEqual(fingerprint(root).sourceHash, first.sourceHash);
    assert.equal(fingerprint(root).files, 3);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
