import assert from 'node:assert/strict';
import { readdirSync, realpathSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import {
  regularBytes,
  validateArtifacts,
  validateStoppedRuntime,
} from './browser-artifacts.mjs';

const algorithm = 'practice-source-order-v1';
const profiles = {
  phone: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
};
const flowIds = [
  'proof-notebook-attempt-compare-revise',
  'practice-transfer-reset',
  'practice-anonymous-account-boundary',
  'practice-account-persistence-isolation',
  'practice-replacement-conflicts',
  'practice-explicit-legacy-import',
  'practice-committed-response-loss',
  'practice-signout-client-clear',
  'practice-clipboard-denied-fallback',
  'practice-lifecycle-account-fence',
];
const inventoryId = 'proof-notebook-source-inventory';
const caseIds = [flowIds[0], inventoryId, ...flowIds.slice(1)];
const sourceAction = 'Read exact notebook source for ';
const digest = /^[a-f0-9]{64}$/;

export function planPractice(lessons, profile, shard) {
  assert(Object.hasOwn(profiles, profile), 'Unknown Practice profile');
  assert(
    Array.isArray(lessons) &&
      lessons.length > 0 &&
      lessons.every(
        (lesson) =>
          /^[A-Z]\d{2}$/.test(lesson?.id) &&
          Number.isSafeInteger(lesson.proofStepCount) &&
          lesson.proofStepCount > 0,
      ),
    'Practice inventory requires lesson IDs and positive proof counts',
  );
  assert.equal(
    new Set(lessons.map((lesson) => lesson.id)).size,
    lessons.length,
    'Duplicate Practice inventory IDs',
  );
  const mathematical = lessons.find((lesson) => lesson.id === 'Q04');
  assert(mathematical, 'Practice inventory requires Q04');
  const shortest = lessons.reduce((a, b) =>
    b.proofStepCount < a.proofStepCount ? b : a,
  );
  const longest = lessons.reduce((a, b) =>
    b.proofStepCount > a.proofStepCount ? b : a,
  );
  const candidates =
    profile === 'desktop'
      ? lessons.map((lesson) => lesson.id)
      : [...new Set([lessons[0].id, shortest.id, longest.id, mathematical.id])];
  if (shard)
    assert(
      Number.isSafeInteger(shard.index) &&
        Number.isSafeInteger(shard.total) &&
        shard.index > 0 &&
        shard.index <= shard.total &&
        shard.total <= candidates.length,
      'Practice shard must select a nonempty source partition',
    );
  const selected = (_, ordinal) =>
    !shard || ordinal % shard.total === shard.index - 1;
  const selectedFlows = flowIds.filter(selected);
  return {
    profile,
    shard: shard ? { index: shard.index, total: shard.total } : null,
    algorithm,
    expectedCaseIds: caseIds.filter(
      (id) => id === inventoryId || selectedFlows.includes(id),
    ),
    sourceLessonIds: candidates.filter(selected),
  };
}

export function selectPracticeCase(plan, id) {
  assert(caseIds.includes(id), `Unknown Practice case ${id}`);
  return plan.expectedCaseIds.includes(id);
}

function validateCoverage(report, map) {
  assert(Array.isArray(report.coverage), 'Missing Practice coverage receipt');
  assert.deepEqual(
    report.coverage.map((row) => row.id),
    map.requiredCoverage,
    'Practice coverage inventory differs from current scope',
  );
  for (const record of report.cases) {
    assert(
      Array.isArray(record.coverage) &&
        new Set(record.coverage).size === record.coverage.length &&
        record.coverage.every((id) => map.requiredCoverage.includes(id)),
      `Invalid Practice case coverage ${record.id}`,
    );
  }
  for (const row of report.coverage) {
    const records = report.cases.filter((record) =>
      record.coverage.includes(row.id),
    );
    assert.equal(
      row.status,
      records.length ? 'passed' : 'not-evaluated',
      `False Practice coverage status ${row.id}`,
    );
    assert.deepEqual(
      row.cases,
      records.map((record) => `${record.profile}/${record.id}`),
      `False Practice coverage cases ${row.id}`,
    );
  }
}

function validateReport(report, directory, map, expected) {
  assert(
    report.schemaVersion === 1 &&
      report.status === 'passed' &&
      report.lane === 'playwright' &&
      report.proofLane === 'local-playwright-built-worker-d1' &&
      report.requested === 'practice' &&
      report.interruptedBy === null &&
      report.releaseReady === false &&
      Number.isFinite(Date.parse(report.startedAt)) &&
      Number.isFinite(Date.parse(report.finishedAt)) &&
      Date.parse(report.finishedAt) >= Date.parse(report.startedAt),
    'Expected completed passed Practice report',
  );
  const selectedProfiles = Object.keys(report.profiles ?? {});
  assert.equal(
    selectedProfiles.length,
    1,
    'Practice actor requires one profile',
  );
  const [profile] = selectedProfiles;
  assert(Object.hasOwn(profiles, profile), 'Unknown Practice report profile');
  assert.deepEqual(
    report.profiles[profile],
    profiles[profile],
    'Wrong Practice viewport',
  );
  assert.deepEqual(
    Object.keys(report.practicePlans ?? {}),
    [profile],
    'Practice plan profiles differ',
  );
  const declared = report.practicePlans[profile];
  assert(
    declared && (declared.shard === null || typeof declared.shard === 'object'),
    'Missing Practice shard declaration',
  );
  const plan = planPractice(map.lessons, profile, declared.shard ?? undefined);
  assert.deepEqual(
    declared,
    plan,
    'Declared Practice plan differs from source',
  );
  assert(
    !Object.hasOwn(report, 'shard'),
    'Unexpected teaching shard in Practice report',
  );
  assert(Array.isArray(report.cases), 'Practice cases must be an array');
  assert.deepEqual(
    report.cases.map((record) => record.id),
    plan.expectedCaseIds,
    'Practice cases differ from source plan',
  );
  for (const record of report.cases)
    assert(
      record.profile === profile && record.status === 'passed',
      `Failed or wrong-profile Practice case ${record.id}`,
    );
  assert.deepEqual(
    report.features,
    [{ feature: 'practice', status: 'passed', cases: report.cases.length }],
    'Practice feature summary differs',
  );
  for (const key of ['commit', 'sourceHash', 'lockHash'])
    assert.equal(
      report.identity?.[key],
      expected[key],
      `Stale Practice ${key}`,
    );
  assert.equal(report.identity.dirty, false, 'Dirty Practice source receipt');
  for (const key of ['sourceHash', 'lockHash', 'buildHash', 'scopeHash'])
    assert(digest.test(report.identity[key]), `Invalid Practice ${key}`);
  assert.equal(
    report.identity.scopeHash,
    map.scopeHash,
    'Stale Practice scopeHash',
  );
  const { instance, artifacts } = validateArtifacts(report, directory);
  validateStoppedRuntime(report, instance, 'Practice');
  for (const process of instance.processes)
    assert(
      Number.isSafeInteger(process.pid) &&
        process.pid > 0 &&
        Number.isSafeInteger(process.pgid) &&
        process.pgid > 0 &&
        ['kind', 'started', 'command'].every(
          (key) => typeof process[key] === 'string' && process[key].length > 0,
        ),
      'Invalid owned Practice process receipt',
    );
  validateCoverage(report, map);
  for (const record of report.cases) {
    const actionFiles = record.artifacts.filter(
      (path) => basename(path) === 'actions.json',
    );
    assert.equal(
      actionFiles.length,
      1,
      `Case ${record.id} requires one actions artifact`,
    );
    const actions = JSON.parse(regularBytes(artifacts.get(actionFiles[0])));
    assert(
      Array.isArray(actions.events) &&
        actions.events.some((event) => event.status === 'passed') &&
        actions.events.every(
          (event) =>
            typeof event.action === 'string' &&
            event.action.length > 0 &&
            (event.status === 'passed' ||
              (Number.isInteger(event.status) &&
                event.status >= 100 &&
                event.status <= 599 &&
                /^[A-Z]+ local progress$/.test(event.action) &&
                typeof event.session === 'string' &&
                event.session.length > 0)),
        ),
      `Incomplete Practice action observations ${record.id}`,
    );
    assert.deepEqual(
      actions.errors,
      [],
      `Practice browser errors ${record.id}`,
    );
    if (record.id === inventoryId) {
      assert.deepEqual(
        record.coverage,
        plan.sourceLessonIds.map((id) => `proof-notebook-source:${id}`),
        'Practice source obligations differ from plan',
      );
      const observations = actions.events.filter((event) =>
        event.action.startsWith(sourceAction),
      );
      assert.deepEqual(
        observations.map((event) => event.action),
        plan.sourceLessonIds.map((id) => `${sourceAction}${id}`),
        'Practice source observations differ from plan',
      );
      assert.deepEqual(
        observations.map((event) => event.value),
        plan.sourceLessonIds.map((lessonId) => ({ lessonId })),
        'Practice source observation values differ',
      );
    } else {
      assert(
        !record.coverage.some((id) => id.startsWith('proof-notebook-source:')),
        'Source obligations require inventory observations',
      );
    }
  }
  return { report, plan };
}

export function validatePracticeUnion(bundle, expected, map) {
  assert.equal(expected.dirty, false, 'Current Practice source must be clean');
  const directory = resolve(bundle);
  assert.equal(
    realpathSync(directory),
    directory,
    'Symlink in Practice bundle path',
  );
  const entries = readdirSync(directory, { withFileTypes: true });
  assert(
    entries.length > 0 && entries.every((entry) => entry.isDirectory()),
    'Expected only Practice artifact directories',
  );
  const actors = entries.map((entry) => {
    const artifactDirectory = join(directory, entry.name);
    return validateReport(
      JSON.parse(regularBytes(join(artifactDirectory, 'report.json'))),
      artifactDirectory,
      map,
      expected,
    );
  });
  const sourceCounts = {};
  for (const profile of Object.keys(profiles)) {
    const group = actors.filter((actor) => actor.plan.profile === profile);
    assert(group.length > 0, `Missing Practice profile ${profile}`);
    const shards = group.map((actor) => actor.plan.shard);
    if (shards.every((shard) => shard === null))
      assert.equal(
        group.length,
        1,
        `Duplicate complete Practice profile ${profile}`,
      );
    else {
      assert(
        shards.every((shard) => shard !== null),
        `Mixed full and sharded Practice profile ${profile}`,
      );
      const total = shards[0].total;
      assert(
        shards.every((shard) => shard.total === total),
        `Mismatched Practice shard totals ${profile}`,
      );
      assert.deepEqual(
        shards.map((shard) => shard.index).sort((a, b) => a - b),
        Array.from({ length: total }, (_, index) => index + 1),
        `Missing or duplicate Practice shard ${profile}`,
      );
    }
    const complete = planPractice(map.lessons, profile);
    const sources = group.flatMap((actor) => actor.plan.sourceLessonIds);
    assert.deepEqual(
      [...sources].sort(),
      [...complete.sourceLessonIds].sort(),
      `Practice source union differs ${profile}`,
    );
    const flows = group.flatMap((actor) =>
      actor.report.cases
        .filter((record) => record.id !== inventoryId)
        .map((record) => record.id),
    );
    assert.deepEqual(
      [...flows].sort(),
      [...flowIds].sort(),
      `Practice flow union differs ${profile}`,
    );
    sourceCounts[profile] = sources.length;
  }
  return {
    schemaVersion: 1,
    status: 'passed',
    scope: 'complete-practice-profiles',
    lane: 'playwright',
    profiles: Object.keys(profiles),
    cases: actors.reduce(
      (total, actor) => total + actor.report.cases.length,
      0,
    ),
    actors: actors.length,
    sourceCounts,
    identity: {
      commit: expected.commit,
      sourceHash: expected.sourceHash,
      lockHash: expected.lockHash,
      scopeHash: map.scopeHash,
    },
    buildHashes: actors.map((actor) => actor.report.identity.buildHash),
    hostedAuthentication: { status: 'not-evaluated' },
    nativeWebMCP: { status: 'not-evaluated' },
    releaseReady: false,
  };
}
