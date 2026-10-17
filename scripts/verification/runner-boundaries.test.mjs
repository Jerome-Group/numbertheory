import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
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
import { catalog, verify } from './verify.mjs';

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
  }
  return root;
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
