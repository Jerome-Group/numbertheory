import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join, resolve } from 'node:path';
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

export function runtimePrerequisites() {
  assert(process.platform !== 'win32', 'Owned process groups require POSIX');
  assert(processIdentity(process.pid), 'ps cannot identify this process');
  execFileSync('lsof', ['-v'], { stdio: 'ignore' });
  return {
    platform: process.platform,
    processGroups: true,
    ps: true,
    lsof: true,
  };
}

function listenerPids(origin) {
  try {
    return [
      ...new Set(
        execFileSync(
          'lsof',
          [
            '-nP',
            `-iTCP@127.0.0.1:${new URL(origin).port}`,
            '-sTCP:LISTEN',
            '-t',
          ],
          { encoding: 'utf8' },
        )
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .map(Number),
      ),
    ];
  } catch (error) {
    if (error.status === 1 && !String(error.stdout).trim()) return [];
    throw error;
  }
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

async function startOwned(runtime, kind, args) {
  const { root } = runtime.instance;
  const child = spawn(
    process.execPath,
    [
      '--import',
      join(root, 'scripts/sites-env.mjs'),
      join(root, 'node_modules/wrangler/bin/wrangler.js'),
      ...args,
    ],
    {
      cwd: root,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        SITES_RUNTIME_ROOT: join(runtime.output, 'sites-runtime'),
        CLOUDFLARE_CF_FETCH_ENABLED: 'false',
        WRANGLER_SEND_METRICS: 'false',
        WRANGLER_WRITE_LOGS: 'false',
        WRANGLER_LOG_PATH: join(runtime.output, 'sites-runtime/wrangler/logs'),
        WRANGLER_REGISTRY_PATH: join(
          runtime.output,
          'sites-runtime/wrangler/dev-registry',
        ),
        MINIFLARE_REGISTRY_PATH: join(
          runtime.output,
          'sites-runtime/wrangler/registry',
        ),
      },
    },
  );
  const chunks = [];
  child.stdout.on('data', (bytes) => chunks.push(bytes));
  child.stderr.on('data', (bytes) => chunks.push(bytes));
  const closed = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => resolve({ code, signal }));
  });
  closed.catch(() => {});
  assert(child.pid, `${kind} failed to spawn`);
  let entry;
  for (let attempt = 0; attempt < 30 && !entry; attempt++) {
    entry = processIdentity(child.pid);
    if (!entry) await delay(10);
  }
  assert(entry, `${kind} exited before ownership could be recorded`);
  owned(entry, entry);
  runtime.instance.processes.push({ kind, ...entry });
  await save(receiptPath(runtime.output), runtime.instance);
  return { child, closed, chunks, entry };
}

async function migrate(runtime, signal) {
  const { root, persistTo } = runtime.instance;
  const journal = JSON.parse(
    await readFile(join(root, 'drizzle/meta/_journal.json'), 'utf8'),
  );
  const files = (await readdir(join(root, 'drizzle')))
    .filter((name) => name.endsWith('.sql'))
    .sort();
  assert(files.length, 'No immutable D1 migrations');
  assert.deepEqual(
    journal.entries.map((entry) => `${entry.tag}.sql`),
    files,
    'D1 migration order differs from Drizzle journal',
  );
  for (const file of files) {
    signal?.throwIfAborted();
    const migration = {
      file,
      sha256: hash(await readFile(join(root, 'drizzle', file))),
      status: 'applying',
      log: `migration-${file}.log`,
    };
    runtime.instance.migrations.push(migration);
    const process_ = await startOwned(runtime, 'd1-migration', [
      'd1',
      'execute',
      'DB',
      '--local',
      '--config',
      'dist/server/wrangler.json',
      '--persist-to',
      persistTo,
      '--file',
      join(root, 'drizzle', file),
      '--yes',
    ]);
    migration.process = process_.entry;
    let onAbort;
    try {
      const result = await Promise.race([
        process_.closed,
        new Promise((_, reject) => {
          onAbort = () => reject(signal.reason);
          signal?.addEventListener('abort', onAbort, { once: true });
          if (signal?.aborted) onAbort();
        }),
      ]);
      migration.result = result;
      assert.equal(result.code, 0, `D1 migration failed: ${file}`);
      assert(!processIdentity(process_.entry.pid), 'Migration process remains');
      try {
        process.kill(-process_.entry.pgid, 0);
        assert.fail('Migration process group remains');
      } catch (error) {
        if (error.code !== 'ESRCH') throw error;
      }
      runtime.instance.processes = runtime.instance.processes.filter(
        (entry) => entry.pid !== process_.entry.pid,
      );
      migration.status = 'applied';
      migration.appliedAt = new Date().toISOString();
    } finally {
      signal?.removeEventListener('abort', onAbort);
      await writeFile(
        join(runtime.output, migration.log),
        Buffer.concat(process_.chunks),
      );
      await save(receiptPath(runtime.output), runtime.instance);
    }
  }
}

export async function launch(root, output, identity, signal) {
  runtimePrerequisites();
  const manifest = JSON.parse(
    await readFile(join(root, 'dist/server/wrangler.json'), 'utf8'),
  );
  assert.equal(
    manifest.main,
    'index.js',
    'Build must contain the Worker entry',
  );
  assert.equal(manifest.assets?.directory, '../client');
  assert(
    manifest.d1_databases?.some((entry) => entry.binding === 'DB'),
    'Worker has no DB binding',
  );
  const instance = {
    schemaVersion: 1,
    runtime: 'vinext-worker-d1',
    nonce: randomUUID(),
    root,
    origin: `http://127.0.0.1:${await freePort()}`,
    persistTo: join(output, 'd1'),
    identity,
    owner: processIdentity(process.pid),
    processes: [],
    migrations: [],
    status: 'starting',
  };
  await save(receiptPath(output), instance);
  const runtime = { instance, chunks: [], output };
  try {
    await migrate(runtime, signal);
    signal?.throwIfAborted();
    const worker = await startOwned(runtime, 'vinext-worker', [
      'dev',
      '--config',
      'dist/server/wrangler.json',
      '--local',
      '--ip',
      '127.0.0.1',
      '--inspector-port',
      '0',
      '--port',
      new URL(instance.origin).port,
      '--persist-to',
      instance.persistTo,
    ]);
    runtime.child = worker.child;
    runtime.chunks = worker.chunks;
    for (let attempt = 0; attempt < 300; attempt++) {
      signal?.throwIfAborted();
      assert(
        worker.child.exitCode === null,
        `Worker exited ${worker.child.exitCode}`,
      );
      let response;
      try {
        response = await fetch(instance.origin, {
          signal: AbortSignal.timeout(1000),
        });
      } catch (error) {
        if (attempt === 299) throw error;
      }
      if (response?.ok) {
        await doctor(output);
        instance.status = 'running';
        await save(receiptPath(output), instance);
        return runtime;
      }
      await delay(100);
    }
    throw new Error('Built Worker did not become ready');
  } catch (error) {
    error.cleanup = await cleanup(output, true);
    throw error;
  } finally {
    await writeFile(join(output, 'server.log'), Buffer.concat(runtime.chunks));
  }
}

export async function doctor(output) {
  runtimePrerequisites();
  const instance = JSON.parse(await readFile(receiptPath(output), 'utf8'));
  assert.equal(instance.schemaVersion, 1, 'Unknown receipt version');
  assert.equal(instance.runtime, 'vinext-worker-d1', 'Unsupported runtime');
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
  const worker = instance.processes.find(
    (entry) => entry.kind === 'vinext-worker',
  );
  assert(worker, 'No owned Worker recorded');
  const listeners = listenerPids(instance.origin);
  assert(listeners.length, 'Worker has no loopback listener');
  for (const pid of listeners)
    assert.equal(
      processIdentity(pid)?.pgid,
      worker.pgid,
      'Listener is outside the owned Worker group',
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
  assert.equal(
    instance.persistTo,
    join(output, 'd1'),
    'Unexpected local D1 path',
  );
  assert(instance.migrations.length, 'No local D1 migrations recorded');
  for (const migration of instance.migrations) {
    assert.equal(migration.status, 'applied', 'D1 migration was not confirmed');
    assert.equal(
      hash(await readFile(join(instance.root, 'drizzle', migration.file))),
      migration.sha256,
      'Applied migration bytes changed',
    );
  }
  const response = await fetch(instance.origin, {
    signal: AbortSignal.timeout(5000),
    redirect: 'error',
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert(html.includes('<title>Number Theory'), 'Unexpected Worker document');
  const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert(scripts.length, 'Built app has no entry script');
  const servedAssets = [];
  for (const asset of [...new Set(scripts)]) {
    assert(
      asset.startsWith('/_next/static/') && !asset.includes('..'),
      'Unexpected entry asset',
    );
    const bytes = await fetch(`${instance.origin}${asset}`, {
      signal: AbortSignal.timeout(5000),
      redirect: 'error',
    });
    assert.equal(bytes.status, 200);
    assert.equal(
      hash(Buffer.from(await bytes.arrayBuffer())),
      hash(await readFile(resolve(instance.root, 'dist/client', `.${asset}`))),
      'Served JavaScript differs from built artifact',
    );
    servedAssets.push({
      path: asset,
      sha256: hash(
        await readFile(resolve(instance.root, 'dist/client', `.${asset}`)),
      ),
    });
  }
  const endpoint = `${instance.origin}/api/progress`;
  const anonymous = await fetch(endpoint, {
    redirect: 'error',
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(anonymous.status, 401, 'Anonymous progress must reject access');
  const accountId = `local-verifier-doctor-${instance.nonce}`;
  const progress = await fetch(endpoint, {
    headers: {
      'oai-authenticated-user-id': accountId,
      'oai-authenticated-user-email': `${accountId}@example.test`,
    },
    redirect: 'error',
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(progress.status, 200, 'Migrated local D1 is unavailable');
  assert.match(progress.headers.get('cache-control'), /no-store/);
  const document = await progress.json();
  assert.equal(document.accountId, accountId);
  assert.equal(document.revision, 0);
  assert.deepEqual(document.lessons, {});
  return {
    status: 'passed',
    runtime: instance.runtime,
    origin: instance.origin,
    identity: instance.identity,
    processes: instance.processes,
    listenerPids: listeners,
    migrations: instance.migrations,
    servedAssets,
    database: 'real local D1; read-only invented dispatcher identity',
    hostedIdentity: 'not-evaluated',
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
  runtimePrerequisites();
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
  assert.deepEqual(
    listenerPids(instance.origin),
    [],
    'Listener remains after cleanup',
  );
  instance.status = 'stopped';
  instance.stoppedAt = new Date().toISOString();
  await save(file, instance);
  return { status: 'stopped', processes: instance.processes, listenerPids: [] };
}
