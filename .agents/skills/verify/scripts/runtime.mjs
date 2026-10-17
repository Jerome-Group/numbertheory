import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import {
  buildFingerprint,
  fingerprint,
} from '../../../../scripts/verification/verify.mjs';

export const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const receiptPath = (output) => join(output, 'instance.json');
export const save = (file, value) =>
  writeFile(file, `${JSON.stringify(value, null, 2)}\n`);

export function processIdentity(pid) {
  try {
    const fields = execFileSync(
      'ps',
      ['-p', String(pid), '-o', 'pid=,pgid=,lstart=,command='],
      { encoding: 'utf8' },
    ).trim();
    const match = /^(\d+)\s+(\d+)\s+(.{24})\s+(.+)$/s.exec(fields);
    assert(match, `Cannot identify process ${pid}`);
    return {
      pid: Number(match[1]),
      pgid: Number(match[2]),
      started: match[3],
      command: match[4],
    };
  } catch (error) {
    if (error.status === 1 && !String(error.stdout).trim()) return null;
    throw error;
  }
}

function owned(current, expected) {
  assert.deepEqual(
    current,
    expected,
    `Ownership changed for PID ${expected.pid}; refusing to signal`,
  );
  assert.equal(
    current.pgid,
    current.pid,
    'Owned child must lead its process group',
  );
}

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = server.address().port;
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}

export async function launch(root, output, identity) {
  assert(
    process.platform !== 'win32',
    'Owned process groups currently require POSIX',
  );
  const port = await freePort();
  const command = [
    join(root, 'node_modules/vite/bin/vite.js'),
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
    '--strictPort',
  ];
  const child = spawn(process.execPath, command, {
    cwd: root,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const chunks = [];
  child.stdout.on('data', (bytes) => chunks.push(bytes));
  child.stderr.on('data', (bytes) => chunks.push(bytes));
  let launchError;
  child.on('error', (error) => {
    launchError = error;
  });
  assert(child.pid, 'Vite failed to spawn');
  const instance = {
    schemaVersion: 1,
    nonce: randomUUID(),
    root,
    origin: `http://127.0.0.1:${port}`,
    identity,
    owner: processIdentity(process.pid),
    processes: [],
    status: 'starting',
  };
  for (let attempt = 0; attempt < 30 && !instance.processes.length; attempt++) {
    const childIdentity = processIdentity(child.pid);
    if (childIdentity)
      instance.processes.push({ kind: 'vite-preview', ...childIdentity });
    else await delay(10);
  }
  assert(
    instance.processes.length,
    'Vite exited before ownership could be recorded',
  );
  await save(receiptPath(output), instance);
  const runtime = { instance, child, chunks, output };
  try {
    for (let attempt = 0; attempt < 150; attempt++) {
      if (launchError) throw launchError;
      assert(child.exitCode === null, `Vite exited ${child.exitCode}`);
      try {
        const response = await fetch(instance.origin, {
          signal: AbortSignal.timeout(500),
        });
        if (response.ok) {
          await doctor(output);
          instance.status = 'running';
          await save(receiptPath(output), instance);
          return runtime;
        }
      } catch (error) {
        if (attempt === 149) throw error;
      }
      await delay(100);
    }
    throw new Error('Vite did not become ready');
  } catch (error) {
    await cleanup(output, true);
    throw error;
  } finally {
    await writeFile(join(output, 'server.log'), Buffer.concat(chunks));
  }
}

export async function doctor(output) {
  const instance = JSON.parse(await readFile(receiptPath(output), 'utf8'));
  assert.equal(instance.schemaVersion, 1, 'Unknown receipt version');
  assert(
    ['starting', 'running'].includes(instance.status),
    `Instance is ${instance.status}`,
  );
  assert(instance.processes.length, 'No owned process recorded');
  assert(
    /^http:\/\/127\.0\.0\.1:\d+$/.test(instance.origin),
    'Receipt origin must be loopback HTTP',
  );
  for (const { kind, ...expected } of instance.processes)
    owned(processIdentity(expected.pid), expected);
  const preview = instance.processes.find(
    (entry) => entry.kind === 'vite-preview',
  );
  assert(preview, 'No owned preview recorded');
  const listeners = execFileSync(
    'lsof',
    [
      '-nP',
      `-iTCP@127.0.0.1:${new URL(instance.origin).port}`,
      '-sTCP:LISTEN',
      '-t',
    ],
    { encoding: 'utf8' },
  )
    .trim()
    .split(/\s+/)
    .map(Number);
  assert.deepEqual(
    [...new Set(listeners)],
    [preview.pid],
    'Loopback listener is not the owned preview process',
  );
  assert.equal(
    fingerprint(instance.root).sourceHash,
    instance.identity.sourceHash,
    'Source changed after launch',
  );
  assert.equal(
    fingerprint(instance.root).lockHash,
    instance.identity.lockHash,
    'Lockfile changed after launch',
  );
  assert.equal(
    buildFingerprint(instance.root).buildHash,
    instance.identity.buildHash,
    'Build changed after launch',
  );
  const response = await fetch(instance.origin, {
    signal: AbortSignal.timeout(5000),
    redirect: 'error',
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.equal(
    html,
    await readFile(join(instance.root, 'dist/index.html'), 'utf8'),
    'Served index differs from built artifact',
  );
  const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert(scripts.length, 'Built app has no entry script');
  for (const asset of scripts) {
    assert(
      asset.startsWith('/assets/') && !asset.includes('..'),
      'Unexpected entry asset',
    );
    const bytes = await fetch(`${instance.origin}${asset}`, {
      signal: AbortSignal.timeout(5000),
      redirect: 'error',
    });
    assert.equal(bytes.status, 200);
    assert.equal(
      hash(Buffer.from(await bytes.arrayBuffer())),
      hash(await readFile(join(instance.root, 'dist', asset))),
      'Served JavaScript differs from built artifact',
    );
  }
  return {
    status: 'passed',
    origin: instance.origin,
    identity: instance.identity,
    processes: instance.processes,
    checkedAt: new Date().toISOString(),
  };
}

export async function registerBrowser(runtime, browserServer) {
  const entry = processIdentity(browserServer.process().pid);
  assert(entry, 'Browser exited before ownership could be recorded');
  assert.equal(entry.pid, entry.pgid, 'Browser must own its process group');
  runtime.instance.processes.push({ kind: 'playwright-chromium', ...entry });
  await save(receiptPath(runtime.output), runtime.instance);
}

export async function cleanup(output, fromOwner = false) {
  const file = receiptPath(output);
  const instance = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(instance.schemaVersion, 1, 'Unknown receipt version');
  if (instance.status === 'stopped')
    return { status: 'already-stopped', processes: instance.processes };
  const owner = processIdentity(instance.owner.pid);
  if (!fromOwner)
    assert(
      !owner,
      'Run owner is still alive or its PID was reused; stop the foreground owner first',
    );
  else
    assert.deepEqual(
      owner,
      instance.owner,
      'Cleanup caller does not own this run',
    );
  const states = instance.processes.map(({ kind, ...expected }) => ({
    kind,
    expected,
    current: processIdentity(expected.pid),
  }));
  for (const state of states)
    if (state.current) owned(state.current, state.expected);
  for (const state of states.reverse()) {
    if (!state.current) {
      try {
        process.kill(-state.expected.pgid, 0);
        throw new Error(
          `Leader exited but ${state.kind} group remains; refusing ambiguous ownership`,
        );
      } catch (error) {
        if (error.code !== 'ESRCH') throw error;
      }
      continue;
    }
    try {
      process.kill(-state.expected.pgid, 'SIGTERM');
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
    for (
      let attempt = 0;
      attempt < 50 && processIdentity(state.expected.pid);
      attempt++
    )
      await delay(50);
    const current = processIdentity(state.expected.pid);
    if (current) {
      owned(current, state.expected);
      process.kill(-state.expected.pgid, 'SIGKILL');
      for (
        let attempt = 0;
        attempt < 50 && processIdentity(state.expected.pid);
        attempt++
      )
        await delay(50);
    }
    assert(
      !processIdentity(state.expected.pid),
      `Owned ${state.kind} process remains alive`,
    );
    try {
      process.kill(-state.expected.pgid, 0);
      throw new Error(`Owned ${state.kind} group still exists`);
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
  }
  instance.status = 'stopped';
  instance.stoppedAt = new Date().toISOString();
  await save(file, instance);
  return { status: 'stopped', processes: instance.processes };
}
