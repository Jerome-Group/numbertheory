import assert from 'node:assert/strict';
import { readdirSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  regularBytes,
  validateArtifacts,
  validateStoppedRuntime,
} from './browser-artifacts.mjs';

const algorithm = 'modulo-source-order-v1';
const profiles = ['phone', 'tablet', 'desktop'];
const digest = /^[a-f0-9]{64}$/;

export function parseShard({ shard, feature, profile }) {
  if (shard === undefined) return undefined;
  assert(
    ['teaching', 'practice'].includes(feature),
    'Shard applies only to teaching or practice',
  );
  assert(profiles.includes(profile), 'Shard requires one explicit profile');
  assert(
    typeof shard === 'string' && /^[1-9]\d*\/[1-9]\d*$/.test(shard),
    'Shard must be I/N with positive integers',
  );
  const [index, total] = shard.split('/').map(Number);
  assert(
    Number.isSafeInteger(index) &&
      Number.isSafeInteger(total) &&
      index <= total,
    'Shard index must be within its safe integer total',
  );
  return { index, total };
}

export function planTeaching(lessonIds, shard) {
  assert(
    Array.isArray(lessonIds) &&
      lessonIds.length > 0 &&
      lessonIds.every(
        (id) => typeof id === 'string' && /^[A-Z]\d{2}$/.test(id),
      ),
    'Teaching inventory must contain lesson IDs',
  );
  assert.equal(
    new Set(lessonIds).size,
    lessonIds.length,
    'Duplicate teaching inventory IDs',
  );
  const cases = [
    ...lessonIds.map((id) => ({ kind: 'lesson', id: `teaching-${id}` })),
    { kind: 'special', id: 'teaching-special-experiences' },
  ];
  if (!shard) return cases;
  assert(
    Number.isSafeInteger(shard.index) &&
      Number.isSafeInteger(shard.total) &&
      shard.index > 0 &&
      shard.index <= shard.total &&
      shard.total <= cases.length,
    'Shard must select a nonempty partition',
  );
  return cases.filter(
    (_, ordinal) => ordinal % shard.total === shard.index - 1,
  );
}

function validateReport(report, directory, profile, lessonIds, expected) {
  assert(
    report.schemaVersion === 1 &&
      report.status === 'passed' &&
      report.lane === 'playwright' &&
      report.proofLane === 'local-playwright-built-worker-d1' &&
      report.requested === 'teaching' &&
      report.interruptedBy === null,
    'Expected completed passed teaching report',
  );
  assert.deepEqual(
    Object.keys(report.profiles ?? {}),
    [profile],
    'Report profile differs',
  );
  assert(
    report.shard &&
      report.shard.total === 2 &&
      [1, 2].includes(report.shard.index) &&
      report.shard.algorithm === algorithm,
    'Expected one of two teaching shards',
  );
  const ids = planTeaching(lessonIds, report.shard).map((item) => item.id);
  assert.deepEqual(
    report.shard.expectedCaseIds,
    ids,
    'Declared shard cases differ from source',
  );
  assert(Array.isArray(report.cases), 'Report cases must be an array');
  assert.deepEqual(
    report.cases.map((record) => record.id),
    ids,
    'Shard cases differ from source',
  );
  for (const record of report.cases)
    assert(
      record.profile === profile && record.status === 'passed',
      `Failed or wrong-profile teaching case ${record.id}`,
    );
  for (const key of ['commit', 'sourceHash', 'lockHash'])
    assert.equal(
      report.identity?.[key],
      expected[key],
      `Stale teaching ${key}`,
    );
  assert.equal(report.identity.dirty, false, 'Dirty teaching source receipt');
  for (const key of ['sourceHash', 'lockHash', 'buildHash', 'scopeHash'])
    assert(digest.test(report.identity[key]), `Invalid teaching ${key}`);
  const { instance } = validateArtifacts(report, directory);
  validateStoppedRuntime(report, instance, 'Teaching');
  return report;
}

export function validateTeachingProfile(root, profile, bundle, expected) {
  assert(profiles.includes(profile), 'Unknown teaching profile');
  assert.equal(expected.dirty, false, 'Current teaching source must be clean');
  const directory = resolve(bundle);
  assert.equal(
    realpathSync(directory),
    directory,
    'Symlink in teaching bundle path',
  );
  const entries = readdirSync(directory, { withFileTypes: true });
  assert(
    entries.length === 2 && entries.every((entry) => entry.isDirectory()),
    'Expected exactly two teaching artifact directories',
  );
  const lessonIds = JSON.parse(
    regularBytes(join(root, 'src/content/order.json')),
  );
  const reports = entries.map((entry) => {
    const artifactDirectory = join(directory, entry.name);
    const report = JSON.parse(
      regularBytes(join(artifactDirectory, 'report.json')),
    );
    return validateReport(
      report,
      artifactDirectory,
      profile,
      lessonIds,
      expected,
    );
  });
  assert.deepEqual(
    reports.map((report) => report.shard.index).sort(),
    [1, 2],
    'Missing or duplicate teaching shard',
  );
  assert.equal(
    reports[0].identity.scopeHash,
    reports[1].identity.scopeHash,
    'Teaching scope hashes differ',
  );
  const cases = reports.flatMap((report) =>
    report.cases.map((record) => record.id),
  );
  assert.deepEqual(
    [...cases].sort(),
    planTeaching(lessonIds)
      .map((item) => item.id)
      .sort(),
    'Teaching union differs from source',
  );
  return {
    schemaVersion: 1,
    status: 'passed',
    scope: 'complete-teaching-profile',
    lane: 'playwright',
    profile,
    cases: cases.length,
    shards: reports.length,
    identity: {
      commit: expected.commit,
      sourceHash: expected.sourceHash,
      lockHash: expected.lockHash,
      scopeHash: reports[0].identity.scopeHash,
    },
    buildHashes: reports.map((report) => report.identity.buildHash),
    scopeAgreement: 'paired reports; not independently recomputed',
    releaseReady: false,
  };
}

export const teachingShardAlgorithm = algorithm;
