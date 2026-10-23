import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export const verifier = Object.freeze({
  version: 'TLC 1.7.4 (TLC2 2.19, revision 5a47802)',
  url: 'https://github.com/tlaplus/tlaplus/releases/download/v1.7.4/tla2tools.jar',
  sha256: '936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88',
  publishedSha1: 'bee4a54f3ee3d4afc347c3240ec2d9e93b075104',
});

export async function locateVerifier() {
  const jar =
    process.env.PROGRESS_TLC_JAR ??
    join(homedir(), '.cache', 'numbertheory-formal', 'tla2tools-1.7.4.jar');
  if (!existsSync(jar)) {
    const response = await fetch(verifier.url, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok)
      throw new Error(`TLC download returned ${response.status}.`);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(
      createHash('sha256').update(bytes).digest('hex'),
      verifier.sha256,
      'TLC download checksum mismatch.',
    );
    mkdirSync(dirname(jar), { recursive: true });
    const temporary = `${jar}.${process.pid}.download`;
    writeFileSync(temporary, bytes);
    renameSync(temporary, jar);
  }
  const digest = createHash('sha256').update(readFileSync(jar)).digest('hex');
  assert.equal(digest, verifier.sha256, `TLC checksum mismatch at ${jar}.`);
  return jar;
}

export function modelCheck(jar, modelDirectory, output) {
  mkdirSync(output, { recursive: true });
  const args = [
    '-XX:+UseParallelGC',
    '-Xmx512m',
    '-cp',
    jar,
    'tlc2.TLC',
    '-workers',
    '1',
    '-seed',
    '0',
    '-fp',
    '0',
    '-cleanup',
    '-metadir',
    join(output, 'states'),
    '-config',
    'ProgressLifecycle.cfg',
    'ProgressLifecycle.tla',
  ];
  const run = spawnSync('java', args, {
    cwd: modelDirectory,
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  const log = `${run.stdout ?? ''}${run.stderr ?? ''}`;
  writeFileSync(join(output, 'tlc.log'), log);
  const counts = log.match(
    /(\d+) states generated, (\d+) distinct states found, (\d+) states left on queue/,
  );
  return {
    passed:
      run.status === 0 &&
      log.includes('Model checking completed. No error has been found.') &&
      counts?.[3] === '0',
    exitCode: run.status,
    error: run.error?.message,
    statesGenerated: counts ? Number(counts[1]) : null,
    distinctStates: counts ? Number(counts[2]) : null,
    remainingStates: counts ? Number(counts[3]) : null,
    violatedProperty: log.match(/Invariant (\w+) is violated/)?.[1] ?? null,
    command: ['java', ...args],
    log: join(output, 'tlc.log'),
  };
}

export function checkModelControl(jar, modelDirectory, output) {
  mkdirSync(output, { recursive: true });
  const source = readFileSync(
    join(modelDirectory, 'ProgressLifecycle.tla'),
    'utf8',
  );
  const before =
    'THEN [Invalidate(s) EXCEPT !.queued = TRUE, !.invalidations = @ + 1]';
  assert.equal(
    source.split(before).length,
    2,
    'Model regression anchor changed.',
  );
  const broken = source.replace(
    before,
    'THEN [s EXCEPT !.requiredEpoch = @ + 1, !.queued = TRUE, !.invalidations = @ + 1]',
  );
  writeFileSync(join(output, 'ProgressLifecycle.tla'), broken);
  writeFileSync(
    join(output, 'ProgressLifecycle.cfg'),
    readFileSync(join(modelDirectory, 'ProgressLifecycle.cfg')),
  );
  const result = modelCheck(jar, output, join(output, 'run'));
  return {
    caught:
      result.exitCode !== 0 &&
      result.violatedProperty === 'PrivateStateCurrent',
    result,
  };
}
