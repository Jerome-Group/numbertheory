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
import {
  parseShard,
  planTeaching,
  validateTeachingProfile,
} from './teaching-shards.mjs';

const source = fileURLToPath(new URL('../../', import.meta.url));
const files = [
  'verify.mjs',
  'cli.mjs',
  'evidence.mjs',
  'repo-loader.mjs',
  'lesson-inventory.json',
  'teaching-shards.mjs',
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
  mkdirSync(join(root, 'src/content'), { recursive: true });
  copyFileSync(
    join(source, 'src/content/order.json'),
    join(root, 'src/content/order.json'),
  );
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
      'drive --feature all|discovery|teaching|practice|labs|urls --output DIR [--profile phone|tablet|desktop] [--channel chrome] [--shard I/N]',
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
      'drive',
      '--feature',
      'all',
      '--profile',
      'phone',
      '--shard',
      '1/2',
      '--output',
      output,
    ],
    ['drive', '--feature', 'teaching', '--shard', '1/2', '--output', output],
    [
      'drive',
      '--feature',
      'teaching',
      '--profile',
      'phone',
      '--shard',
      '1/0',
      '--output',
      output,
    ],
    [
      'drive',
      '--feature',
      'teaching',
      '--profile',
      'phone',
      '--shard',
      '85/85',
      '--output',
      output,
    ],
    ['teaching-profile', '--profile', 'phone'],
    ['teaching-profile', '--output', output],
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

test('teaching partitions preserve the full source inventory and final special case', () => {
  const ids = JSON.parse(
    readFileSync(join(source, 'src/content/order.json'), 'utf8'),
  );
  const all = planTeaching(ids);
  assert.equal(all.length, 84);
  assert.deepEqual(planTeaching(ids, { index: 1, total: 1 }), all);
  for (const total of [2, 3, all.length]) {
    const partitions = Array.from({ length: total }, (_, index) =>
      planTeaching(ids, { index: index + 1, total }),
    );
    const union = partitions.flat().map((item) => item.id);
    assert.equal(new Set(union).size, all.length);
    assert.deepEqual(union.sort(), all.map((item) => item.id).sort());
  }
  const first = planTeaching(ids, { index: 1, total: 2 });
  const second = planTeaching(ids, { index: 2, total: 2 });
  assert.equal(first.length, 42);
  assert.equal(second.length, 42);
  assert.equal(first[0].id, 'teaching-P00');
  assert.equal(second.at(-1).id, 'teaching-special-experiences');
  assert(!first.some((item) => item.kind === 'special'));
  assert.equal(planTeaching(ids.slice(0, 4), { index: 1, total: 2 }).length, 3);
  assert.equal(planTeaching(ids.slice(0, 4), { index: 2, total: 2 }).length, 2);
  assert.throws(() => planTeaching(ids, { index: 85, total: 85 }), /nonempty/);
  assert.throws(() => planTeaching([]), /inventory/);
  assert.throws(() => planTeaching(['P00', 'P00']), /Duplicate/);
});

test('both real CLI boundaries reject malformed, irrelevant and empty shards before effects', (t) => {
  const f = fixture(t);
  const output = join(f.root, 'must-not-exist');
  for (const shard of [
    '0/2',
    '1/0',
    '3/2',
    '-1/2',
    '1.5/2',
    '01/2',
    '1/02',
    '1/2x',
    '1/9007199254740992',
    '85/85',
  ]) {
    const args = [
      '--feature',
      'teaching',
      '--profile',
      'phone',
      '--shard',
      shard,
      '--output',
      output,
    ];
    const wrapper = f.run(['drive', ...args]);
    const helper = spawnSync(
      process.execPath,
      [join(source, '.agents/skills/verify/scripts/drive.mjs'), ...args],
      { encoding: 'utf8' },
    );
    assert.equal(wrapper.status, 2, wrapper.stderr);
    assert.equal(helper.status, 2, helper.stderr);
    assert.equal(existsSync(f.marker), false);
    assert.equal(existsSync(output), false);
  }
  for (const args of [
    ['--feature', 'all', '--profile', 'phone'],
    ['--feature', 'teaching'],
    ['--doctor', '--profile', 'phone'],
  ]) {
    const result = spawnSync(
      process.execPath,
      [
        join(source, '.agents/skills/verify/scripts/drive.mjs'),
        ...args,
        '--shard',
        '1/2',
        '--output',
        output,
      ],
      { encoding: 'utf8' },
    );
    assert.equal(result.status, 2, result.stderr);
    assert.equal(existsSync(output), false);
  }
  assert.equal(parseShard({ feature: 'teaching' }), undefined);
});

function teachingBundle(t) {
  const f = fixture(t);
  writeFileSync(join(f.root, 'package-lock.json'), '{}');
  writeFileSync(join(f.root, '.gitignore'), 'verification-results/\n');
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
  const expected = fingerprint(f.root);
  const bundle = join(f.root, 'verification-results/downloaded');
  const lessonIds = JSON.parse(
    readFileSync(join(f.root, 'src/content/order.json'), 'utf8'),
  );
  const partitions = [1, 2].map((index) => {
    const directory = join(bundle, String(index));
    mkdirSync(directory, { recursive: true });
    const original = `/original-runner/teaching-${index}`;
    const identity = {
      ...expected,
      scopeHash: 'c'.repeat(64),
      buildHash: String(index).repeat(64),
    };
    const processes = [
      {
        kind: 'wrangler',
        pid: 100 + index,
        pgid: 100 + index,
        started: 'fixture',
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
      requested: 'teaching',
      interruptedBy: null,
      profiles: { phone: { width: 390, height: 844 } },
      identity,
      shard: {
        index,
        total: 2,
        algorithm: 'modulo-source-order-v1',
        expectedCaseIds: planTeaching(lessonIds, { index, total: 2 }).map(
          (item) => item.id,
        ),
      },
      cases: [],
      artifacts: [],
      cleanup: { status: 'stopped', listenerPids: [], processes },
    };
    const artifact = (path, content) => {
      const destination = join(directory, path);
      mkdirSync(join(destination, '..'), { recursive: true });
      const bytes = Buffer.from(content);
      writeFileSync(destination, bytes);
      const entry = {
        path: join(original, path),
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      };
      const existing = report.artifacts.findIndex(
        (item) => item.path === entry.path,
      );
      if (existing === -1) report.artifacts.push(entry);
      else report.artifacts[existing] = entry;
      return entry.path;
    };
    artifact('instance.json', JSON.stringify(instance));
    report.cases = report.shard.expectedCaseIds.map((id) => ({
      id,
      profile: 'phone',
      status: 'passed',
      artifacts: [artifact(`${id}/actions.json`, 'Fixture observation only.')],
    }));
    return { report, directory, instance };
  });
  const save = () => {
    for (const { report, directory } of partitions)
      writeFileSync(join(directory, 'report.json'), JSON.stringify(report));
  };
  save();
  return {
    ...f,
    bundle,
    expected,
    partitions,
    save,
    validate: () => validateTeachingProfile(f.root, 'phone', bundle, expected),
  };
}

test('teaching-profile accepts relocated complete evidence without deps/build and independent build hashes', (t) => {
  const f = teachingBundle(t);
  assert.notEqual(
    f.partitions[0].report.identity.buildHash,
    f.partitions[1].report.identity.buildHash,
  );
  const result = f.run([
    'teaching-profile',
    '--profile',
    'phone',
    '--output',
    f.bundle,
  ]);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.scope, 'complete-teaching-profile');
  assert.equal(report.cases, 84);
  assert.equal(report.shards, 2);
  assert.equal(report.releaseReady, false);
  assert.equal(existsSync(join(f.root, 'node_modules')), false);
  assert.equal(existsSync(join(f.root, 'dist')), false);
});

test('teaching union rejects missing, duplicate, failed, interrupted and wrong-source partitions', (t) => {
  const f = teachingBundle(t);
  const baseline = f.partitions.map(({ report }) => structuredClone(report));
  for (const mutate of [
    (reports) => {
      reports[1] = structuredClone(reports[0]);
    },
    (reports) => {
      reports[1].cases.pop();
    },
    (reports) => {
      reports[1].cases[0].id = reports[1].cases[1].id;
    },
    (reports) => {
      reports[1].shard.expectedCaseIds.pop();
    },
    (reports) => {
      reports[1].shard.algorithm = 'other';
    },
    (reports) => {
      reports[1].shard.total = 3;
    },
    (reports) => {
      reports[1].cases[0].status = 'failed';
    },
    (reports) => {
      reports[1].cases[0].profile = 'tablet';
    },
    (reports) => {
      reports[1].profiles.tablet = reports[1].profiles.phone;
    },
    (reports) => {
      reports[1].status = 'failed';
    },
    (reports) => {
      reports[1].interruptedBy = 'SIGTERM';
    },
    (reports) => {
      reports[1].identity.commit = 'old';
    },
    (reports) => {
      reports[1].identity.dirty = true;
    },
    (reports) => {
      reports[1].identity.sourceHash = 'd'.repeat(64);
    },
    (reports) => {
      reports[1].identity.lockHash = 'd'.repeat(64);
    },
    (reports) => {
      reports[1].identity.scopeHash = 'd'.repeat(64);
    },
    (reports) => {
      reports[1].identity.buildHash = 'invalid';
    },
    (reports) => {
      reports[1].cleanup.status = 'already-stopped';
    },
    (reports) => {
      reports[1].cleanup.listenerPids = [123];
    },
    (reports) => {
      reports[1].cleanup.processes = [];
    },
  ]) {
    const reports = structuredClone(baseline);
    mutate(reports);
    reports.forEach((report, index) => {
      f.partitions[index].report = report;
    });
    f.save();
    assert.throws(f.validate);
  }
  f.partitions.forEach((partition, index) => {
    partition.report = structuredClone(baseline[index]);
  });
  f.save();
  f.expected.dirty = true;
  assert.throws(f.validate, /must be clean/);
  f.expected.dirty = false;
  cpSync(f.partitions[0].directory, f.partitions[1].directory, {
    recursive: true,
  });
  assert.throws(f.validate, /Missing or duplicate teaching shard/);
  rmSync(join(f.partitions[1].directory, 'report.json'));
  assert.throws(f.validate, /ENOENT/);
});

test('teaching union rejects artifact corruption, escapes, missing references and mismatched ownership', (t) => {
  const f = teachingBundle(t);
  const partition = f.partitions[1];
  const baseline = structuredClone(partition.report);
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
      report.cases[0].captureErrors = ['trace failed'];
    },
  ]) {
    partition.report = structuredClone(baseline);
    mutate(partition.report);
    f.save();
    assert.throws(f.validate);
  }
  partition.report = structuredClone(baseline);
  f.save();
  const retainInstance = (instance) => {
    const bytes = Buffer.from(JSON.stringify(instance));
    writeFileSync(join(partition.directory, 'instance.json'), bytes);
    Object.assign(partition.report.artifacts[0], {
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
    f.save();
  };
  retainInstance({
    ...partition.instance,
    identity: { ...partition.instance.identity, commit: 'wrong-instance' },
  });
  assert.throws(f.validate, /Instance commit/);
  partition.report.identity.scopeHash = 'd'.repeat(64);
  retainInstance({
    ...partition.instance,
    identity: partition.report.identity,
  });
  assert.throws(f.validate, /Teaching scope hashes differ/);
});

test('teaching union rejects missing bytes and symlinked artifact directories', (t) => {
  const f = teachingBundle(t);
  const partition = f.partitions[1];
  const path = join(partition.directory, 'teaching-P01/actions.json');
  const bytes = readFileSync(path);
  rmSync(path);
  assert.throws(f.validate, /ENOENT/);
  const target = join(f.root, 'fixture-artifact.txt');
  writeFileSync(target, bytes);
  symlinkSync(target, path);
  assert.throws(f.validate, /Symlink/);
  unlinkSync(path);
  writeFileSync(path, bytes);
  const bundleLink = join(f.root, 'bundle-link');
  symlinkSync(f.bundle, bundleLink);
  assert.throws(
    () => validateTeachingProfile(f.root, 'phone', bundleLink, f.expected),
    /Symlink/,
  );
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
      [
        'drive',
        '--feature',
        'teaching',
        '--profile',
        'phone',
        '--shard',
        '2/2',
        '--output',
        output,
      ],
      [
        '--feature',
        'teaching',
        '--output',
        output,
        '--profile',
        'phone',
        '--shard',
        '2/2',
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
