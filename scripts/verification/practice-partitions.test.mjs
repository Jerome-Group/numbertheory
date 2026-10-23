import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { runCase } from '../../.agents/skills/verify/scripts/browser.mjs';
import {
  planPractice,
  selectPracticeCase,
  validatePracticeUnion,
} from './practice-partitions.mjs';
import { fingerprint, scopeMap } from './verify.mjs';

const root = resolve(process.env.NUMBERTHEORY_REPO ?? process.cwd());
const map = await scopeMap(root);
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
const profiles = {
  phone: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
};

test('Practice plan bounds source batches and keeps every flow exactly once per profile', () => {
  for (const profile of Object.keys(profiles)) {
    const complete = planPractice(map.lessons, profile);
    assert.deepEqual(complete.expectedCaseIds, [
      flowIds[0],
      inventoryId,
      ...flowIds.slice(1),
    ]);
    const candidates = complete.sourceLessonIds;
    for (const total of new Set([1, 2, 3, 4, candidates.length])) {
      if (total > candidates.length) continue;
      const plans = Array.from({ length: total }, (_, index) =>
        planPractice(map.lessons, profile, { index: index + 1, total }),
      );
      assert.deepEqual(
        plans.flatMap((plan) => plan.sourceLessonIds).sort(),
        [...candidates].sort(),
      );
      assert.deepEqual(
        plans
          .flatMap((plan) =>
            plan.expectedCaseIds.filter((id) => id !== inventoryId),
          )
          .sort(),
        [...flowIds].sort(),
      );
      assert(
        plans.every(
          (plan) =>
            plan.sourceLessonIds.length > 0 &&
            plan.expectedCaseIds.includes(inventoryId),
        ),
      );
    }
    assert.deepEqual(
      planPractice(map.lessons, profile, { index: 1, total: 1 })
        .sourceLessonIds,
      candidates,
    );
  }
  const desktop = Array.from({ length: 4 }, (_, index) =>
    planPractice(map.lessons, 'desktop', { index: index + 1, total: 4 }),
  );
  assert.deepEqual(
    desktop.map((plan) => plan.sourceLessonIds.length),
    [21, 21, 21, 20],
  );
  assert.deepEqual(
    desktop.map((plan) => plan.expectedCaseIds.length),
    [4, 4, 3, 3],
  );
  assert.equal(
    desktop.reduce((count, plan) => count + plan.expectedCaseIds.length, 0),
    14,
  );
  assert.deepEqual(
    planPractice(map.lessons, 'desktop').sourceLessonIds,
    map.lessons.map((lesson) => lesson.id),
  );
});

test('representative selection is stable, deduplicated, and responds to source additions', () => {
  const lessons = [
    { id: 'P00', proofStepCount: 2 },
    { id: 'P01', proofStepCount: 1 },
    { id: 'Q04', proofStepCount: 5 },
    { id: 'P02', proofStepCount: 5 },
  ];
  assert.deepEqual(planPractice(lessons, 'phone').sourceLessonIds, [
    'P00',
    'P01',
    'Q04',
  ]);
  assert.deepEqual(planPractice(lessons, 'tablet').sourceLessonIds, [
    'P00',
    'P01',
    'Q04',
  ]);
  const expanded = [...lessons, { id: 'P03', proofStepCount: 8 }];
  assert.deepEqual(planPractice(expanded, 'phone').sourceLessonIds, [
    'P00',
    'P01',
    'P03',
    'Q04',
  ]);
  assert.deepEqual(
    planPractice([{ id: 'Q04', proofStepCount: 1 }], 'phone').sourceLessonIds,
    ['Q04'],
  );
  assert.equal(planPractice(expanded, 'desktop').sourceLessonIds.at(-1), 'P03');
});

test('invalid source inventories, profiles and empty source partitions fail', () => {
  for (const lessons of [
    [],
    [{ id: 'P00', proofStepCount: 1 }],
    [{ id: 'Q04', proofStepCount: 0 }],
    [{ id: 'Q04', proofStepCount: Infinity }],
    [{ id: 'Q04', proofStepCount: 1.5 }],
    [{ id: 'q04', proofStepCount: 1 }],
    [
      { id: 'Q04', proofStepCount: 1 },
      { id: 'Q04', proofStepCount: 2 },
    ],
  ])
    assert.throws(() => planPractice(lessons, 'desktop'));
  assert.throws(() => planPractice(map.lessons, 'unknown'), /profile/);
  for (const shard of [
    { index: 0, total: 4 },
    { index: 5, total: 4 },
    { index: 1, total: 84 },
    { index: 1.5, total: 4 },
  ])
    assert.throws(
      () => planPractice(map.lessons, 'desktop', shard),
      /nonempty/,
    );
});

test('Practice selection rejects unknown cases and skips unselected cases before effects', async (t) => {
  const output = mkdtempSync(join(tmpdir(), 'nt-practice-guard-'));
  t.after(() => rmSync(output, { recursive: true, force: true }));
  const plan = planPractice(map.lessons, 'desktop', { index: 4, total: 4 });
  assert.equal(selectPracticeCase(plan, 'practice-signout-client-clear'), true);
  assert.equal(selectPracticeCase(plan, 'practice-transfer-reset'), false);
  const suite = { output, practicePlans: { desktop: plan } };
  assert.equal(
    await runCase(suite, 'desktop', 'practice-transfer-reset', [], () =>
      assert.fail('unselected callback ran'),
    ),
    undefined,
  );
  await assert.rejects(
    runCase(suite, 'desktop', 'practice-copy-pasted-new-case', [], () => {}),
    /Unknown Practice case/,
  );
  await assert.rejects(
    runCase(
      {
        output,
        signal: AbortSignal.abort(new Error('Ordinary feature execution')),
      },
      'desktop',
      'teaching-P00',
      [],
      () => {},
    ),
    /Ordinary feature execution/,
  );
});

function bundleFixture(t, desktopTotal = 4) {
  const bundle = realpathSync(
    mkdtempSync(join(tmpdir(), 'nt-practice-receipts-')),
  );
  t.after(() => rmSync(bundle, { recursive: true, force: true }));
  const expected = {
    commit: 'receipt-contract-fixture',
    sourceHash: 'a'.repeat(64),
    lockHash: 'b'.repeat(64),
    dirty: false,
  };
  const plans = Object.keys(profiles).flatMap((profile) =>
    profile === 'desktop' && desktopTotal
      ? Array.from({ length: desktopTotal }, (_, index) =>
          planPractice(map.lessons, profile, {
            index: index + 1,
            total: desktopTotal,
          }),
        )
      : [planPractice(map.lessons, profile)],
  );
  const actors = plans.map((plan, ordinal) => {
    const directory = join(bundle, `actor-${ordinal}`);
    mkdirSync(directory);
    const original = `/original-runner/practice-${ordinal}`;
    const identity = {
      ...expected,
      scopeHash: map.scopeHash,
      buildHash: String(ordinal + 1).repeat(64),
    };
    const processes = [
      {
        kind: 'wrangler',
        pid: 100 + ordinal,
        pgid: 100 + ordinal,
        started: 'fixture start',
        command: 'fixture Worker',
      },
    ];
    const instance = {
      schemaVersion: 1,
      runtime: 'vinext-worker-d1',
      status: 'stopped',
      identity,
      processes,
    };
    const report = {
      schemaVersion: 1,
      status: 'passed',
      lane: 'playwright',
      proofLane: 'local-playwright-built-worker-d1',
      requested: 'practice',
      releaseReady: false,
      interruptedBy: null,
      startedAt: '2026-10-22T01:00:00Z',
      finishedAt: '2026-10-22T01:01:00Z',
      profiles: { [plan.profile]: profiles[plan.profile] },
      identity,
      practicePlans: { [plan.profile]: plan },
      cases: [],
      artifacts: [],
      cleanup: { status: 'stopped', listenerPids: [], processes },
      features: [
        {
          feature: 'practice',
          status: 'passed',
          cases: plan.expectedCaseIds.length,
        },
      ],
    };
    const actor = { directory, report, instance };
    const retain = (path, value) => {
      const bytes = Buffer.isBuffer(value)
        ? value
        : Buffer.from(JSON.stringify(value));
      const destination = join(directory, path);
      mkdirSync(join(destination, '..'), { recursive: true });
      writeFileSync(destination, bytes);
      const entry = {
        path: join(original, path),
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      };
      const previous = actor.report.artifacts.findIndex(
        (item) => item.path === entry.path,
      );
      if (previous === -1) actor.report.artifacts.push(entry);
      else actor.report.artifacts[previous] = entry;
      return entry.path;
    };
    retain('instance.json', instance);
    report.cases = plan.expectedCaseIds.map((id) => ({
      id,
      profile: plan.profile,
      status: 'passed',
      coverage:
        id === inventoryId
          ? plan.sourceLessonIds.map(
              (lessonId) => `proof-notebook-source:${lessonId}`,
            )
          : [],
      artifacts: [
        retain(`${id}/actions.json`, {
          events:
            id === inventoryId
              ? plan.sourceLessonIds.map((lessonId) => ({
                  action: `Read exact notebook source for ${lessonId}`,
                  status: 'passed',
                  value: { lessonId },
                }))
              : [
                  {
                    action: 'Serialized receipt contract fixture only',
                    status: 'passed',
                  },
                ],
          errors: [],
        }),
      ],
    }));
    report.coverage = map.requiredCoverage.map((id) => {
      const records = report.cases.filter((record) =>
        record.coverage.includes(id),
      );
      return {
        id,
        status: records.length ? 'passed' : 'not-evaluated',
        cases: records.map((record) => `${record.profile}/${record.id}`),
      };
    });
    actor.retain = retain;
    return actor;
  });
  const save = () => {
    for (const actor of actors)
      writeFileSync(
        join(actor.directory, 'report.json'),
        JSON.stringify(actor.report),
      );
  };
  save();
  return {
    bundle,
    expected,
    actors,
    save,
    validate: () => validatePracticeUnion(bundle, expected, map),
  };
}

test('serialized relocated Practice receipts accept independent builds and full or partitioned profiles', (t) => {
  for (const partitioned of [false, true]) {
    const f = bundleFixture(t, partitioned ? 4 : 0);
    const result = f.validate();
    assert.equal(result.scope, 'complete-practice-profiles');
    assert.equal(result.cases, partitioned ? 36 : 33);
    assert.equal(result.actors, partitioned ? 6 : 3);
    assert.equal(result.sourceCounts.desktop, 83);
    assert.equal(
      result.sourceCounts.phone,
      planPractice(map.lessons, 'phone').sourceLessonIds.length,
    );
    assert.equal(new Set(result.buildHashes).size, result.actors);
    assert.equal(result.releaseReady, false);
    assert.equal(result.hostedAuthentication.status, 'not-evaluated');
    assert.equal(result.nativeWebMCP.status, 'not-evaluated');
  }
});

test('Practice receipts reject notebook payloads omitted from both artifact inventories', (t) => {
  const f = bundleFixture(t);
  const actor = f.actors[0];
  const record = actor.report.cases.find((item) => item.id === flowIds[0]);
  writeFileSync(
    join(actor.directory, record.id, 'proof-notebook.md'),
    'Original learner argument.\n',
  );
  f.save();
  assert.throws(() => f.validate(), /Case artifact inventory differs/);
});

test('real practice-union CLI reads serialized current-source receipts without a build or browser', (t) => {
  const f = bundleFixture(t);
  const checkout = realpathSync(
    mkdtempSync(join(tmpdir(), 'nt-practice-union-cli-')),
  );
  t.after(() => rmSync(checkout, { recursive: true, force: true }));
  cpSync(join(root, 'src'), join(checkout, 'src'), { recursive: true });
  cpSync(
    join(root, 'scripts/verification'),
    join(checkout, 'scripts/verification'),
    { recursive: true },
  );
  for (const file of ['package.json', 'package-lock.json'])
    cpSync(join(root, file), join(checkout, file));
  symlinkSync(join(root, 'node_modules'), join(checkout, 'node_modules'));
  writeFileSync(join(checkout, '.gitignore'), 'node_modules\n');
  execFileSync('git', ['init', '-q', checkout]);
  execFileSync('git', ['-C', checkout, 'add', '.']);
  execFileSync('git', [
    '-C',
    checkout,
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    'commit',
    '-qm',
    'fixture',
  ]);
  const expected = fingerprint(checkout);
  assert.equal(expected.dirty, false);
  Object.assign(f.expected, expected);
  for (const actor of f.actors) {
    Object.assign(actor.report.identity, expected);
    actor.retain('instance.json', actor.instance);
  }
  f.save();
  const run = () =>
    spawnSync(
      process.execPath,
      [
        join(checkout, 'scripts/verification/verify.mjs'),
        'practice-union',
        '--output',
        f.bundle,
      ],
      { cwd: checkout, encoding: 'utf8' },
    );
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).cases, 36);
  writeFileSync(join(checkout, 'changed-source.md'), 'Changed current source');
  const stale = run();
  assert.equal(stale.status, 1, stale.stderr);
  assert.match(stale.stderr, /must be clean/);
});

test('Practice union distinguishes successful steps from observed HTTP responses', (t) => {
  const f = bundleFixture(t);
  f.validate();
  const actor = f.actors[0];
  const record = actor.report.cases[0];
  const path = `${record.id}/actions.json`;
  const baseline = JSON.parse(readFileSync(join(actor.directory, path)));
  const responses = [
    { session: 'main', action: 'GET local progress', status: 401 },
    { session: 'main', action: 'PATCH local progress', status: 200 },
    { session: 'main', action: 'PUT local progress', status: 409 },
  ];
  const retainEvents = (events) => {
    actor.retain(path, { ...baseline, events });
    f.save();
  };
  const observations = [...baseline.events, ...responses];
  retainEvents(observations);
  assert.equal(f.validate().status, 'passed');
  for (const response of [
    { ...responses[0], status: 99 },
    { ...responses[0], status: 600 },
    { ...responses[0], status: 200.5 },
    { ...responses[0], status: '401' },
    { ...responses[0], session: '' },
    { ...responses[0], action: 'Read exact notebook source for P00' },
    { ...baseline.events[0], status: 'failed' },
  ]) {
    retainEvents([...observations, response]);
    assert.throws(f.validate, /action observations/);
  }
  retainEvents(responses);
  assert.throws(f.validate, /action observations/);
});

test('Practice union rejects incomplete, duplicate, mixed, extra and inconsistent actor families', (t) => {
  const f = bundleFixture(t);
  f.validate();
  const complete = bundleFixture(t, 0);
  const extra = join(f.bundle, 'extra');
  cpSync(complete.actors[2].directory, extra, { recursive: true });
  assert.throws(f.validate, /Mixed full and sharded/);
  rmSync(extra, { recursive: true });
  cpSync(f.actors[0].directory, extra, { recursive: true });
  assert.throws(f.validate, /Duplicate complete Practice profile/);
  rmSync(extra, { recursive: true });
  const three = bundleFixture(t, 3);
  cpSync(three.actors[2].directory, extra, { recursive: true });
  assert.throws(f.validate, /Mismatched Practice shard totals/);
  rmSync(extra, { recursive: true });
  const actor = f.actors.at(-1);
  const baseline = structuredClone(actor.report);
  for (const mutate of [
    (report) => {
      report.practicePlans.desktop.shard.total = 3;
    },
    (report) => {
      report.practicePlans.desktop.algorithm = 'wrong';
    },
    (report) => {
      report.practicePlans.desktop.sourceLessonIds.pop();
    },
    (report) => {
      report.practicePlans.desktop.expectedCaseIds.pop();
    },
    (report) => {
      report.cases.pop();
    },
    (report) => {
      report.cases[0].id = 'unknown-copy';
    },
    (report) => {
      report.cases.push(report.cases[0]);
    },
    (report) => {
      report.cases[0].profile = 'phone';
    },
    (report) => {
      report.profiles.desktop.width = 1000;
    },
    (report) => {
      report.profiles.phone = profiles.phone;
    },
    (report) => {
      report.features[0].cases += 1;
    },
    (report) => {
      report.features[0].status = 'not-evaluated';
    },
    (report) => {
      report.shard = { index: 1, total: 4 };
    },
  ]) {
    actor.report = structuredClone(baseline);
    mutate(actor.report);
    f.save();
    assert.throws(f.validate, /plan|cases|profile|viewport|summary|shard/);
  }
  actor.report = structuredClone(f.actors.at(-2).report);
  cpSync(f.actors.at(-2).directory, actor.directory, { recursive: true });
  f.save();
  assert.throws(f.validate, /duplicate Practice shard/);
  rmSync(actor.directory, { recursive: true });
  f.actors.pop();
  f.save();
  assert.throws(f.validate, /Missing or duplicate Practice shard/);
  rmSync(f.actors[0].directory, { recursive: true });
  assert.throws(f.validate, /Missing Practice profile/);
});

test('Practice union rejects unfinished, failed, dirty and wrong-source receipts', (t) => {
  const f = bundleFixture(t);
  f.validate();
  const actor = f.actors[0];
  const baseline = structuredClone(actor.report);
  for (const mutate of [
    (report) => {
      report.status = 'running';
    },
    (report) => {
      report.status = 'failed';
    },
    (report) => {
      report.interruptedBy = 'SIGTERM';
    },
    (report) => {
      delete report.finishedAt;
    },
    (report) => {
      report.cases[0].status = 'failed';
    },
    (report) => {
      report.identity.commit = 'old';
    },
    (report) => {
      report.identity.sourceHash = 'd'.repeat(64);
    },
    (report) => {
      report.identity.lockHash = 'd'.repeat(64);
    },
    (report) => {
      report.identity.scopeHash = 'd'.repeat(64);
    },
    (report) => {
      report.identity.buildHash = 'invalid';
    },
    (report) => {
      report.identity.dirty = true;
    },
    (report) => {
      report.releaseReady = true;
    },
  ]) {
    actor.report = structuredClone(baseline);
    mutate(actor.report);
    f.save();
    assert.throws(f.validate, /completed|Failed|Stale|Dirty|Invalid/);
  }
  actor.report = baseline;
  f.save();
  f.expected.dirty = true;
  assert.throws(f.validate, /must be clean/);
});

test('Practice union requires ordered successful source observations and exact scoped coverage', (t) => {
  const f = bundleFixture(t);
  f.validate();
  const actor = f.actors[2];
  const baseline = structuredClone(actor.report);
  const record = actor.report.cases.find((record) => record.id === inventoryId);
  const path = `${inventoryId}/actions.json`;
  const observations = JSON.parse(readFileSync(join(actor.directory, path)));
  for (const mutate of [
    (actions) => {
      actions.events.pop();
    },
    (actions) => {
      actions.events.push(actions.events[0]);
    },
    (actions) => {
      actions.events.reverse();
    },
    (actions) => {
      actions.events[0].status = 'failed';
    },
    (actions) => {
      actions.events[0].action = 'Read exact notebook source for Z99';
    },
    (actions) => {
      actions.events[0].value.lessonId = 'Z99';
    },
    (actions) => {
      delete actions.events[0].value;
    },
    (actions) => {
      actions.errors = ['unhandled console error'];
    },
  ]) {
    const actions = structuredClone(observations);
    mutate(actions);
    actor.retain(path, actions);
    f.save();
    assert.throws(
      f.validate,
      /source observations|action observations|observation values|browser errors/,
    );
  }
  actor.retain(path, observations);
  for (const mutate of [
    (report) => {
      report.cases.find((item) => item.id === inventoryId).coverage.pop();
    },
    (report) => {
      report.cases[0].coverage = [record.coverage[0]];
    },
    (report) => {
      report.coverage[0].status = 'passed';
    },
    (report) => {
      report.coverage[0].cases = ['invented/case'];
    },
    (report) => {
      report.coverage.pop();
    },
    (report) => {
      report.coverage.push(report.coverage[0]);
    },
  ]) {
    actor.report = structuredClone(baseline);
    mutate(actor.report);
    f.save();
    assert.throws(f.validate, /coverage|source obligations|Source obligations/);
  }
});

test('Practice union rejects corrupt, escaped, duplicated and absent artifact bytes or references', (t) => {
  const f = bundleFixture(t);
  f.validate();
  const actor = f.actors[0];
  const baseline = structuredClone(actor.report);
  for (const mutate of [
    (report) => {
      report.artifacts = [];
    },
    (report) => {
      report.artifacts.push(report.artifacts[0]);
    },
    (report) => {
      report.artifacts[1].path = '/outside/actions.json';
    },
    (report) => {
      report.artifacts[1].path = 'relative/actions.json';
    },
    (report) => {
      report.artifacts[1].sha256 = 'd'.repeat(64);
    },
    (report) => {
      report.artifacts[1].bytes += 1;
    },
    (report) => {
      report.cases[0].artifacts = [];
    },
    (report) => {
      report.cases[0].artifacts = ['/unknown/actions.json'];
    },
    (report) => {
      report.cases[1].artifacts = report.cases[0].artifacts;
    },
    (report) => {
      report.cases[0].captureErrors = ['trace capture failed'];
    },
  ]) {
    actor.report = structuredClone(baseline);
    mutate(actor.report);
    f.save();
    assert.throws(f.validate, /artifact|Artifact|Case/);
  }
  actor.report = baseline;
  f.save();
  const path = join(actor.directory, `${inventoryId}/actions.json`);
  const bytes = readFileSync(path);
  rmSync(path);
  assert.throws(f.validate, /ENOENT/);
  const target = `${f.bundle}-outside-bytes.json`;
  writeFileSync(target, bytes);
  symlinkSync(target, path);
  assert.throws(f.validate, /Symlink/);
  unlinkSync(path);
  writeFileSync(path, bytes);
  rmSync(target);
  const link = `${f.bundle}-link`;
  symlinkSync(f.bundle, link);
  t.after(() => unlinkSync(link));
  assert.throws(() => validatePracticeUnion(link, f.expected, map), /Symlink/);
});

test('Practice union requires stopped, owned, source-matching teardown receipts', (t) => {
  const f = bundleFixture(t);
  f.validate();
  const actor = f.actors[0];
  const baseline = structuredClone(actor.report);
  for (const mutate of [
    (report) => {
      delete report.cleanup;
    },
    (report) => {
      report.cleanup.status = 'already-stopped';
    },
    (report) => {
      report.cleanup.listenerPids = [123];
    },
    (report) => {
      report.cleanup.processes = [];
    },
  ]) {
    actor.report = structuredClone(baseline);
    mutate(actor.report);
    f.save();
    assert.throws(f.validate, /cleanup|listener|ownership/);
  }
  actor.report = baseline;
  for (const mutate of [
    (instance) => {
      instance.status = 'running';
    },
    (instance) => {
      instance.identity.commit = 'wrong';
    },
    (instance) => {
      instance.identity.buildHash = 'd'.repeat(64);
    },
    (instance) => {
      instance.processes[0].pid += 1;
    },
    (instance) => {
      instance.processes = [];
    },
  ]) {
    const instance = structuredClone(actor.instance);
    mutate(instance);
    actor.retain('instance.json', instance);
    f.save();
    assert.throws(
      f.validate,
      /Instance|ownership|stopped Worker|Missing owned/,
    );
  }
});
