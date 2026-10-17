import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { closeSync, mkdirSync, openSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { commands } from './cli.mjs';

assert.equal(process.argv.length, 3, 'Expected one external output directory');
const output = process.argv[2];
assert(isAbsolute(output), 'Output must be absolute');
mkdirSync(output);
const cli = fileURLToPath(new URL('./verify.mjs', import.meta.url));
const tasks = commands.drive.options.feature.choices
  .filter((feature) => feature !== 'all')
  .flatMap((feature) =>
    feature === 'teaching'
      ? commands.drive.options.profile.choices.map((profile) => ({
          feature,
          profile,
        }))
      : [{ feature }],
  )
  .sort(
    (a, b) =>
      Number(b.feature === 'teaching') - Number(a.feature === 'teaching'),
  );
const children = new Set();
const results = [];
let interrupted;
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    interrupted = signal;
    for (const child of children) child.kill(signal);
  });

function run({ feature, profile }) {
  const name = `${feature}-${profile ?? 'all'}`;
  const args = [
    cli,
    'drive',
    '--feature',
    feature,
    '--output',
    join(output, name),
  ];
  if (profile) args.push('--profile', profile);
  const stdout = openSync(join(output, `${name}.stdout.json`), 'wx');
  const stderr = openSync(join(output, `${name}.stderr.log`), 'wx');
  const child = spawn(process.execPath, args, {
    stdio: ['ignore', stdout, stderr],
  });
  children.add(child);
  let error;
  child.once('error', (failure) => {
    error = failure.message;
  });
  return new Promise((resolve) =>
    child.once('close', (code, signal) => {
      children.delete(child);
      closeSync(stdout);
      closeSync(stderr);
      results.push({
        feature,
        profile: profile ?? 'all',
        code,
        signal,
        ...(error ? { error } : {}),
      });
      resolve();
    }),
  );
}

async function worker() {
  while (tasks.length && !interrupted) await run(tasks.shift());
}

await Promise.all(Array.from({ length: 4 }, worker));
const passed = !interrupted && results.every((result) => result.code === 0);
process.stdout.write(
  `${JSON.stringify({ status: interrupted ? 'interrupted' : passed ? 'passed' : 'failed', output, results }, null, 2)}\n`,
);
process.exitCode =
  interrupted === 'SIGINT' ? 130 : interrupted ? 143 : passed ? 0 : 1;
