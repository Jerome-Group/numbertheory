import assert from 'node:assert/strict';
import test from 'node:test';
import { catalog, verify } from './verify.mjs';

const root = process.env.NUMBERTHEORY_REPO ?? process.cwd();
test('automated report never claims release; all automated stages executed', async () => {
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
    report.manualGates.map((g) => g.status),
    ['not-evaluated', 'not-evaluated'],
  );
});
test('release with missing manual evidence fails; failed automated stage never release ready', async () => {
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
