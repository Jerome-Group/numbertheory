import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import {
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
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
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildFingerprint, fingerprint, scopeMap } from './verify.mjs';

const source = fileURLToPath(new URL('../../', import.meta.url));
const files = [
  'verify.mjs',
  'cli.mjs',
  'evidence.mjs',
  'repo-loader.mjs',
  'lesson-inventory.json',
];

function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'numbertheory-cli-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const directory = join(root, 'scripts/verification');
  mkdirSync(directory, { recursive: true });
  for (const file of files)
    copyFileSync(
      join(source, 'scripts/verification', file),
      join(directory, file),
    );
  const bin = join(root, 'bin'),
    marker = join(root, 'invoked');
  mkdirSync(bin);
  for (const command of ['git', 'npm']) {
    const path = join(bin, command);
    writeFileSync(path, '#!/bin/sh\nprintf invoked > "$CLI_PROBE"\nexit 91\n');
    chmodSync(path, 0o755);
  }
  const helper = join(root, '.agents/skills/verify/scripts');
  mkdirSync(helper, { recursive: true });
  writeFileSync(
    join(helper, 'drive.mjs'),
    `import { writeFileSync } from 'node:fs';
writeFileSync(process.env.CLI_PROBE, 'helper');
process.stdout.write(JSON.stringify({schemaVersion:1,status:'passed',args:process.argv.slice(2),cwd:process.cwd()})+'\\n');
process.exitCode = Number(process.env.CLI_HELPER_EXIT ?? 0);
`,
  );
  const run = (args, options = {}) =>
    spawnSync(process.execPath, [join(directory, 'verify.mjs'), ...args], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, CLI_PROBE: marker },
      ...options,
    });
  return { root, marker, bin, run };
}

test('help and catalog work with no deps, build, or Git reads', (t) => {
  const f = fixture(t);
  for (const args of [
    [],
    ['--help'],
    ['help'],
    ['catalog'],
    ['help', 'drive'],
  ]) {
    const result = f.run(args, {
      env: { ...process.env, PATH: f.bin, CLI_PROBE: f.marker },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    const report = JSON.parse(result.stdout);
    assert.equal(report.status, 'passed');
    assert.equal(
      report.commands.drive.syntax,
      'drive --feature all|discovery|teaching|practice|labs|urls --output DIR [--profile phone|tablet|desktop] [--channel chrome]',
    );
    assert.ok(report.commands.drive.reads.length);
    assert.ok(report.commands.drive.writes.length);
    assert.ok(report.commands.drive.prerequisites.length);
    assert.match(
      report.commands.drive.purpose,
      /no native, semantic, release, or deployment claim/,
    );
    if (args[1] === 'drive')
      assert.deepEqual(Object.keys(report.commands), ['drive']);
  }
  assert.equal(existsSync(f.marker), false);
  assert.equal(existsSync(join(f.root, 'node_modules')), false);
  assert.equal(existsSync(join(f.root, 'dist')), false);
});

test('real CLI rejects unknown, duplicate, missing, surplus, and irrelevant arguments before effects', (t) => {
  const f = fixture(t),
    output = join(f.root, 'must not exist');
  const cases = [
    ['unknown'],
    ['catalog', 'extra'],
    ['help', 'unknown'],
    ['help', 'map', 'extra'],
    ['map', f.root, 'extra'],
    ['fingerprint', '--output', output],
    ['verify', f.root, 'extra'],
    ['verify', '--bogus'],
    ['verify:release', f.root, 'browser.json'],
    ['doctor', '--channel', 'chrome'],
    ['drive', '--feature', 'all'],
    ['drive', '--feature', 'other', '--output', output],
    ['drive', '--feature', 'all', '--output'],
    ['drive', '--feature', 'all', '--output', '--channel', 'chrome'],
    ['drive', '--feature', 'all', '--output', output, '--output', output],
    ['launch', '--output', output, '--channel', 'chromium'],
    ['launch', '--output', output, '--channel', 'chrome'],
    ['launch', '--output', output, '--profile', 'phone'],
    ['drive', '--feature', 'all', '--output', output, '--profile', 'invalid'],
    [
      'launch',
      '--output',
      output,
      '--channel',
      'chrome',
      '--channel',
      'chrome',
    ],
    ['evidence', '--output', output, '--feature', 'all'],
    ['cleanup', '--output', output, '--channel', 'chrome'],
    ['map', ''],
  ];
  for (const args of cases) {
    const result = f.run(args, {
      env: { ...process.env, PATH: f.bin, CLI_PROBE: f.marker },
    });
    assert.equal(
      result.status,
      2,
      `${JSON.stringify(args)}\n${result.stdout}\n${result.stderr}`,
    );
    assert.equal(JSON.parse(result.stdout).code, 'usage');
    assert.ok(result.stderr.trim());
    assert.equal(existsSync(f.marker), false, JSON.stringify(args));
    assert.equal(existsSync(output), false, JSON.stringify(args));
  }
});

test('CLI source fixes the checkout root and refuses a different explicit repo', (t) => {
  const f = fixture(t),
    elsewhere = join(f.root, 'elsewhere');
  mkdirSync(elsewhere);
  const rejected = f.run(['map', elsewhere], {
    env: { ...process.env, PATH: f.bin, CLI_PROBE: f.marker },
  });
  assert.equal(rejected.status, 2);
  assert.match(JSON.parse(rejected.stdout).error, /this CLI checkout/);
  assert.equal(existsSync(f.marker), false);
  const result = f.run(['doctor'], { cwd: elsewhere });
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.repo, f.root);
  assert.equal(report.scope, 'prerequisites');
  assert.equal(report.releaseReady, false);
  assert.equal(report.browserLaunch, 'not-evaluated');
  assert.ok(report.missing.includes('locked dependencies'));
  assert.ok(report.missing.includes('playwright chromium'));
  assert.ok(report.missing.includes('build'));
  assert.equal(existsSync(join(f.root, 'node_modules')), false);
  assert.equal(existsSync(join(f.root, 'dist')), false);
});

test('lifecycle commands pass literal argument arrays and preserve helper failure exits', (t) => {
  const f = fixture(t),
    output = join(f.root, 'output ; literal');
  mkdirSync(output);
  for (const [args, expected] of [
    [
      ['drive', '--feature', 'labs', '--output', output, '--channel', 'chrome'],
      ['--feature', 'labs', '--output', output, '--channel', 'chrome'],
    ],
    [
      [
        'drive',
        '--feature',
        'urls',
        '--output',
        output,
        '--profile',
        'phone',
        '--channel',
        'chrome',
      ],
      [
        '--feature',
        'urls',
        '--output',
        output,
        '--channel',
        'chrome',
        '--profile',
        'phone',
      ],
    ],
    [
      ['launch', '--output', output],
      ['--launch-only', '--output', output],
    ],
    [
      ['doctor', '--output', output],
      ['--doctor', '--output', output],
    ],
    [
      ['cleanup', '--output', output],
      ['--cleanup', '--output', output],
    ],
  ]) {
    const result = f.run(args);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.deepEqual(report.args, expected);
    assert.equal(report.cwd, f.root);
    assert.equal(existsSync(f.marker), true);
    unlinkSync(f.marker);
  }
  const result = f.run(['drive', '--feature', 'all', '--output', output], {
    env: { ...process.env, CLI_PROBE: f.marker, CLI_HELPER_EXIT: '7' },
  });
  assert.equal(result.status, 7);
  const missing = f.run(['cleanup', '--output', join(f.root, 'missing')]);
  assert.equal(missing.status, 1);
});

test('foreground CLI forwards cancellation and waits for its helper to finish', {
  timeout: 5000,
}, async (t) => {
  const f = fixture(t);
  writeFileSync(
    join(f.root, '.agents/skills/verify/scripts/drive.mjs'),
    `import { writeFileSync } from 'node:fs';
const keepalive = setInterval(() => {}, 1000);
process.on('SIGTERM', () => { clearInterval(keepalive); process.stdout.write(JSON.stringify({status:'stopped'})+'\\n'); });
writeFileSync(process.env.CLI_PROBE, String(process.pid));
process.stdout.write(JSON.stringify({status:'ready'})+'\\n');
`,
  );
  const child = spawn(
    process.execPath,
    [
      join(f.root, 'scripts/verification/verify.mjs'),
      'launch',
      '--output',
      join(f.root, 'output'),
    ],
    {
      cwd: f.root,
      env: { ...process.env, CLI_PROBE: f.marker },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let helperPid;
  t.after(() => {
    if (child.exitCode === null && child.signalCode === null)
      child.kill('SIGKILL');
    if (helperPid) {
      try {
        process.kill(helperPid, 'SIGKILL');
      } catch {}
    }
  });
  const closed = once(child, 'close');
  await once(child.stdout, 'data');
  helperPid = Number(readFileSync(f.marker, 'utf8'));
  child.kill('SIGTERM');
  const [code, signal] = await closed;
  assert.equal(code, 0);
  assert.equal(signal, null);
  assert.throws(() => process.kill(helperPid, 0), { code: 'ESRCH' });
  helperPid = undefined;
});

test('evidence checks current identity and real artifact bytes without creating release proof', async (t) => {
  const f = fixture(t);
  cpSync(join(source, 'src'), join(f.root, 'src'), { recursive: true });
  for (const file of ['package.json', 'package-lock.json'])
    copyFileSync(join(source, file), join(f.root, file));
  symlinkSync(join(source, 'node_modules'), join(f.root, 'node_modules'));
  mkdirSync(join(f.root, 'dist'));
  writeFileSync(
    join(f.root, 'dist/index.html'),
    '<html>isolated built fixture</html>',
  );
  writeFileSync(
    join(f.root, '.gitignore'),
    'node_modules\nverification-results\ndist\n',
  );
  execFileSync('git', ['init', '-q', f.root]);
  execFileSync('git', ['-C', f.root, 'add', '.']);
  execFileSync('git', [
    '-C',
    f.root,
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    'commit',
    '-qm',
    'fixture',
  ]);
  const output = join(f.root, 'verification-results/run');
  mkdirSync(output, { recursive: true });
  const path = join(output, 'observation.txt'),
    reportPath = join(output, 'report.json');
  const bytes = 'fixture observation';
  writeFileSync(path, bytes);
  const artifact = {
    path,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
  const identity = {
    ...fingerprint(f.root),
  };
  writeFileSync(
    join(f.root, 'dist/source-identity.json'),
    JSON.stringify({ schemaVersion: 1, ...identity }),
  );
  Object.assign(identity, {
    ...buildFingerprint(f.root),
    scopeHash: (await scopeMap(f.root)).scopeHash,
  });
  const report = {
    schemaVersion: 1,
    status: 'passed',
    lane: 'playwright',
    identity,
    artifacts: [artifact],
  };
  const inspect = (patch = {}) => {
    writeFileSync(reportPath, JSON.stringify({ ...report, ...patch }));
    return f.run(['evidence', '--output', output]);
  };
  const result = inspect();
  assert.equal(result.status, 0, result.stderr);
  const accepted = JSON.parse(result.stdout);
  assert.equal(accepted.scope, 'playwright-artifact-integrity');
  assert.equal(accepted.releaseReady, false);
  assert.ok(accepted.unevaluated.includes('semantic review'));
  for (const patch of [
    { status: 'failed' },
    { lane: 'native' },
    { lane: 'browser' },
    { lane: 'semantic' },
    { artifacts: [] },
    { artifacts: [{ ...artifact, path: 'relative.txt' }] },
    ...['sourceHash', 'lockHash', 'buildHash', 'scopeHash'].map((key) => ({
      identity: { ...identity, [key]: 'stale' },
    })),
  ]) {
    const rejected = inspect(patch);
    assert.equal(rejected.status, 1, JSON.stringify(patch));
    assert.equal(JSON.parse(rejected.stdout).status, 'failed');
  }
  writeFileSync(path, 'changed');
  assert.match(JSON.parse(inspect().stdout).error, /digest/);
  writeFileSync(path, '');
  assert.match(JSON.parse(inspect().stdout).error, /nonempty regular/);
  writeFileSync(path, bytes);
  const link = join(output, 'linked.txt');
  symlinkSync(path, link);
  assert.equal(inspect({ artifacts: [{ ...artifact, path: link }] }).status, 1);
  assert.equal(
    inspect({ artifacts: [{ ...artifact, path: output }] }).status,
    1,
  );
  const symlinkedDirectory = join(output, 'linked-directory');
  symlinkSync(output, symlinkedDirectory);
  assert.match(
    JSON.parse(
      inspect({
        artifacts: [
          { ...artifact, path: join(symlinkedDirectory, 'observation.txt') },
        ],
      }).stdout,
    ).error,
    /symlink/,
  );
  writeFileSync(join(f.root, 'dist/index.html'), '<html>changed build</html>');
  assert.match(JSON.parse(inspect().stdout).error, /buildHash/);
});
