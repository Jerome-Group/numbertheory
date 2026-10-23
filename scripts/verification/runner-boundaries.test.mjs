import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  buildFingerprint,
  catalog,
  fingerprint,
  scopeMap,
  verify,
} from './verify.mjs';

const source =
  process.env.NUMBERTHEORY_REPO ??
  fileURLToPath(new URL('../../', import.meta.url));
function fixture(t, built = true) {
  const root = realpathSync(
    mkdtempSync(join(tmpdir(), 'numbertheory-runner-')),
  );
  t.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(join(source, 'src'), join(root, 'src'), { recursive: true });
  for (const file of ['package.json', 'package-lock.json'])
    copyFileSync(join(source, file), join(root, file));
  symlinkSync(join(source, 'node_modules'), join(root, 'node_modules'));
  writeFileSync(join(root, '.gitignore'), 'node_modules\ndist\n');
  execFileSync('git', ['init', '-q', root]);
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
  if (built) {
    mkdirSync(join(root, 'dist'));
    writeFileSync(
      join(root, 'dist/index.html'),
      '<html>isolated build fixture</html>',
    );
    writeFileSync(
      join(root, 'dist/source-identity.json'),
      JSON.stringify({ schemaVersion: 1, ...fingerprint(root) }),
    );
  }
  return root;
}

for (const [name, content, status] of [
  ['accepts clean', 'export const publicValue = 1;', 0],
  ['rejects prohibited', ['gh', 'p_', 'A'.repeat(24)].join(''), 1],
]) {
  test(`public-surface CLI ${name} source maps`, (t) => {
    const root = fixture(t);
    writeFileSync(
      join(root, 'dist/index.js.map'),
      JSON.stringify({
        version: 3,
        sources: ['index.ts'],
        sourcesContent: [content],
        names: [],
        mappings: '',
      }),
    );
    const result = spawnSync(
      process.execPath,
      [join(source, 'scripts/check-public-surface.mjs')],
      { cwd: root, encoding: 'utf8' },
    );
    assert.equal(result.status, status, result.stdout + result.stderr);
    if (status === 1)
      assert.match(
        result.stderr,
        /dist\/index\.js\.map: private path, private source link, or secret pattern/,
      );
    else assert.match(result.stdout, /Public-surface scan passed/);
  });
}

async function releaseFixture(t, root) {
  const bundle = realpathSync(
    mkdtempSync(join(tmpdir(), 'nt-release-fixture-')),
  );
  t.after(() => rmSync(bundle, { recursive: true, force: true }));
  const path = join(bundle, 'declarations.txt');
  const text =
    'Synthetic verifier test declarations. No browser or semantic observation.';
  writeFileSync(path, text);
  const map = await scopeMap(root);
  const { sourceHash, lockHash } = fingerprint(root);
  const { buildHash } = buildFingerprint(root);
  const observedAt = new Date().toISOString();
  const base = {
    schemaVersion: 1,
    sourceHash,
    lockHash,
    buildHash,
    scopeHash: map.scopeHash,
    status: 'passed',
    observer: 'fixture coordinator',
    observedAt,
    artifacts: [
      {
        id: 'fixture',
        path,
        sha256: createHash('sha256').update(text).digest('hex'),
      },
    ],
  };
  const record = {
    status: 'passed',
    observedAt,
    summary: text,
    artifactRefs: ['fixture'],
  };
  const browser = join(bundle, 'browser.json');
  const semantic = join(bundle, 'semantic.json');
  writeFileSync(
    browser,
    JSON.stringify({
      ...base,
      kind: 'browser',
      surface: 'codex-in-app-browser',
      coverage: map.requiredCoverage.map((id) => ({ ...record, id })),
    }),
  );
  const lessonIds = map.lessons.map((lesson) => lesson.id);
  writeFileSync(
    semantic,
    JSON.stringify({
      ...base,
      kind: 'semantic',
      independent: true,
      authors: ['fixture author'],
      unresolvedFindings: 0,
      lessonIds,
      reviews: [
        {
          ...record,
          reviewer: 'fixture reviewer',
          authors: ['fixture author'],
          independent: true,
          lessonIds,
        },
      ],
    }),
  );
  return { browser, semantic, buildHash };
}

test('automated runner covers every stage with an isolated build and never claims release', async (t) => {
  const root = fixture(t);
  const commands = [];
  const report = await verify(
    root,
    undefined,
    undefined,
    false,
    (command, args) => {
      commands.push([command, ...args]);
      return { status: 0 };
    },
  );
  assert.equal(report.scope, 'automated');
  assert.equal(report.releaseReady, false);
  assert.equal(report.status, 'passed');
  assert.equal(commands.length, Object.keys(catalog).length);
  assert.deepEqual(
    report.stages.map((stage) => stage.stage),
    Object.keys(catalog),
  );
  assert.deepEqual(
    commands.find((command) => command.includes('build:bundle')),
    ['npm', 'run', 'build:bundle'],
  );
  assert.deepEqual(
    report.manualGates.map((g) => g.status),
    ['not-evaluated', 'not-evaluated'],
  );
});
test('successful subprocess exits cannot hide a missing build', async (t) => {
  const root = fixture(t, false),
    commands = [];
  const report = await verify(
    root,
    undefined,
    undefined,
    false,
    (command, args) => {
      commands.push([command, ...args]);
      return { status: 0 };
    },
  );
  assert.equal(report.status, 'failed');
  assert.equal(report.releaseReady, false);
  assert.deepEqual(
    report.stages
      .filter((stage) => stage.status === 'failed')
      .map((stage) => stage.stage),
    ['public', 'build-identity'],
  );
  assert.equal(commands.length, Object.keys(catalog).length - 1);
});
test('release with missing manual evidence fails; failed automated stage never release ready', async (t) => {
  const root = fixture(t);
  const report = await verify(root, undefined, undefined, true, () => ({
    status: 0,
  }));
  assert.equal(report.scope, 'release');
  assert.equal(report.status, 'failed');
  assert.equal(report.releaseReady, false);
  assert.deepEqual(
    report.manualGates.map((g) => g.status),
    ['failed', 'failed'],
  );
  let calls = 0;
  const failed = await verify(root, undefined, undefined, false, () => ({
    status: ++calls === 1 ? 9 : 0,
  }));
  assert.equal(failed.status, 'failed');
  assert.equal(calls, Object.keys(catalog).length);
});

test('release preserves the observed bytes while every other gate runs', async (t) => {
  const root = fixture(t);
  const evidence = await releaseFixture(t, root),
    commands = [];
  const report = await verify(
    root,
    evidence.browser,
    evidence.semantic,
    true,
    (command, args) => {
      commands.push([command, ...args]);
      if (args.includes('build:bundle'))
        writeFileSync(join(root, 'dist/index.html'), 'a newly generated build');
      return { status: 0 };
    },
  );
  assert.equal(report.status, 'passed');
  assert.equal(report.releaseReady, true);
  assert.equal(report.identity.buildHash, evidence.buildHash);
  assert.equal(buildFingerprint(root).buildHash, evidence.buildHash);
  assert.deepEqual(
    commands,
    Object.entries(catalog)
      .filter(([name]) => name !== 'build')
      .map(([, [command, args]]) => [command, ...args]),
  );
  assert.equal(
    report.stages.find((stage) => stage.stage === 'frozen-build').command,
    undefined,
  );
});

for (const state of ['missing', 'stale']) {
  test(`release rejects a ${state} build before installation`, async (t) => {
    const root = fixture(t, state !== 'missing');
    if (state === 'stale')
      writeFileSync(join(root, 'changed-source.md'), 'new source');
    let calls = 0;
    const report = await verify(root, undefined, undefined, true, () => {
      calls++;
      return { status: 0 };
    });
    assert.equal(calls, 0);
    assert.equal(report.status, 'failed');
    assert.equal(report.releaseReady, false);
    assert.equal(report.stages[0].stage, 'frozen-build');
    assert.equal(report.stages[0].status, 'failed');
  });
}

for (const mutation of [
  'install-build',
  'late-build',
  'deleted-build',
  'source',
  'lock',
  'gate',
]) {
  test(`release fails closed on ${mutation} after freezing`, async (t) => {
    const root = fixture(t);
    const evidence = await releaseFixture(t, root);
    const report = await verify(
      root,
      evidence.browser,
      evidence.semantic,
      true,
      (_command, args) => {
        if (mutation === 'install-build' && args[0] === 'ci')
          writeFileSync(
            join(root, 'dist/index.html'),
            'changed by installation',
          );
        if (args.includes('test:verification')) {
          if (mutation === 'late-build')
            writeFileSync(
              join(root, 'dist/index.html'),
              'changed after build check',
            );
          if (mutation === 'deleted-build')
            rmSync(join(root, 'dist'), { recursive: true, force: true });
          if (mutation === 'source')
            writeFileSync(
              join(root, 'changed-source.md'),
              'changed by a check',
            );
          if (mutation === 'lock')
            writeFileSync(join(root, 'package-lock.json'), '{}');
        }
        return {
          status: mutation === 'gate' && args.includes('check') ? 9 : 0,
        };
      },
    );
    assert.equal(report.status, 'failed');
    assert.equal(report.releaseReady, false);
    assert.equal(report.identity.buildHash, evidence.buildHash);
    const failed = report.stages
      .filter((stage) => stage.status === 'failed')
      .map((stage) => stage.stage);
    assert.ok(
      failed.includes(mutation === 'gate' ? 'types' : 'build-stability'),
    );
    if (['source', 'lock'].includes(mutation))
      assert.ok(failed.includes('source-stability'));
  });
}
