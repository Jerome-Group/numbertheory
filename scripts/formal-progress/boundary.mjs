import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { setImmediate } from 'node:timers/promises';
import { Script } from 'node:vm';
import { loadRepositoryModule } from '../verification/repo-loader.mjs';

const accounts = Object.freeze(['account-alpha', 'account-beta']);
const statuses = Object.freeze([200, 401, 409, 400, 403, 413, 415, 500]);

export const bounds = Object.freeze({
  eventsAfterReady: 9,
  invalidations: 2,
  writes: 1,
  accounts: accounts.length,
  lessonIds: ['P00', 'C02'],
  revisions: [1, 2],
  requests: 3,
  outcomes: [
    ...statuses,
    'conflict',
    'account_changed',
    'invalid',
    'fetch rejection',
    'body rejection',
  ],
});

function document(accountId, revision = bounds.revisions[0]) {
  return {
    accountId,
    displayName: accountId,
    revision,
    lessons:
      accountId === accounts[0]
        ? {
            [bounds.lessonIds[0]]:
              revision === bounds.revisions[0] ? 'complete' : 'review',
          }
        : {
            [bounds.lessonIds[1]]:
              revision === bounds.revisions[0] ? 'review' : 'complete',
          },
  };
}

export async function compileStore(
  root,
  sourceFile = join(root, 'src/progress.ts'),
) {
  const require = createRequire(join(root, 'package.json'));
  const ts = require('@typescript/typescript6');
  const [{ lessons }, schema] = await Promise.all([
    loadRepositoryModule(root, 'src/content/lessons.ts'),
    loadRepositoryModule(root, 'src/progress-schema.ts'),
  ]);
  const source = readFileSync(sourceFile, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const script = new Script(compiled, { filename: sourceFile });
  return () => createBoundary(script, lessons, schema);
}

function createBoundary(script, lessons, schema) {
  const requests = [];
  const observations = [];
  const violations = [];
  const allowed = new Set();
  const outcomes = {};
  const reached = (key) => {
    outcomes[key] = (outcomes[key] ?? 0) + 1;
  };
  let epoch = 0;
  function retire() {
    epoch++;
    allowed.clear();
  }
  const exported = {};
  script.runInNewContext({
    exports: exported,
    require(name) {
      if (name === './content/lessons') return { lessons };
      assert.equal(name, './progress-schema');
      return schema;
    },
    AbortSignal,
    localStorage: {
      getItem() {
        assert.fail('The lifecycle replay must not read browser storage.');
      },
      setItem() {
        assert.fail('Account progress must not persist to browser storage.');
      },
    },
    fetch(url, init) {
      assert.equal(url, '/api/progress');
      const method = init.method ?? 'GET';
      if (method === 'GET') retire();
      let resolve;
      let reject;
      const promise = new Promise((yes, no) => {
        resolve = yes;
        reject = no;
      });
      requests.push({
        method,
        epoch,
        phase: 'fetch',
        accountId: new Headers(init.headers).get('X-Numbertheory-Account'),
        resolve,
        reject,
      });
      return promise;
    },
  });
  const store = exported.progressStore;
  assert.ok(store);

  function observe() {
    const status = JSON.parse(JSON.stringify(store.getStatusSnapshot()));
    const marks = JSON.parse(JSON.stringify(store.getSnapshot()));
    const observation = { epoch, status, marks };
    observations.push(observation);
    if ('accountId' in status) {
      const value = {
        accountId: status.accountId,
        displayName: status.displayName,
        revision: status.revision,
        lessons: marks,
      };
      if (!allowed.has(JSON.stringify(value))) violations.push(observation);
    } else if (Object.keys(marks).length) violations.push(observation);
  }

  store.subscribe(observe);

  async function step(action) {
    if (action.kind === 'reload' || action.kind === 'clear') {
      retire();
      if (action.kind === 'reload') void store.reload();
      else store.clearSession();
    } else if (action.kind === 'write') {
      const status = store.getStatusSnapshot();
      assert.ok('accountId' in status);
      void store.set({
        accountId: status.accountId,
        lessonId: bounds.lessonIds[0],
        status: 'review',
      });
    } else {
      const request = requests[action.request];
      assert.ok(request, `Missing request ${action.request}`);
      if (action.kind === 'headers') {
        assert.equal(request.phase, 'fetch');
        assert.ok(statuses.includes(action.status));
        request.phase = 'headers';
        request.status = action.status;
        reached(`${request.method}:headers:${action.status}`);
        if (action.status === 401 && request.epoch === epoch) retire();
        request.resolve({
          status: action.status,
          ok: action.status === 200,
          json() {
            request.phase = 'json';
            reached(`${request.method}:json:${request.status}`);
            return new Promise((resolve, reject) => {
              request.resolveJson = resolve;
              request.rejectJson = reject;
            });
          },
        });
      } else if (action.kind === 'body') {
        assert.equal(request.phase, 'json');
        let value;
        if (request.status === 200) {
          assert.equal(action.body.kind, 'document');
          const accountId = request.accountId ?? accounts[action.body.owner];
          value = document(
            accountId,
            bounds.revisions[request.method === 'GET' ? 0 : 1],
          );
          if (request.epoch === epoch) allowed.add(JSON.stringify(value));
        } else {
          assert.equal(request.status, 409);
          assert.equal(request.method, 'PATCH');
          assert.ok(
            ['conflict', 'account_changed', 'invalid'].includes(
              action.body.kind,
            ),
          );
          value = { code: action.body.kind };
          if (action.body.kind === 'account_changed' && request.epoch === epoch)
            retire();
        }
        reached(`${request.method}:body:${request.status}:${action.body.kind}`);
        request.phase = 'done';
        request.resolveJson(value);
      } else if (action.kind === 'reject') {
        assert.equal(request.phase, 'fetch');
        request.phase = 'done';
        reached(`${request.method}:fetch-rejection`);
        request.reject(new Error('Generated fetch rejection.'));
      } else if (action.kind === 'reject-body') {
        assert.equal(request.phase, 'json');
        request.phase = 'done';
        reached(`${request.method}:body-rejection:${request.status}`);
        request.rejectJson(new Error('Generated body rejection.'));
      } else assert.fail(`Unknown action ${action.kind}`);
    }
    await setImmediate();
    for (const request of requests) {
      if (request.phase === 'headers') request.phase = 'done';
    }
    assert.ok(requests.length <= bounds.requests, 'Request bound exceeded.');
    observe();
  }

  async function bootstrap() {
    void store.reload();
    await step({ kind: 'headers', request: 0, status: 200 });
    await step({
      kind: 'body',
      request: 0,
      body: { kind: 'document', owner: 0 },
    });
    assert.equal(store.getStatusSnapshot().kind, 'ready');
    requests.length = 0;
    observations.length = 0;
    for (const key of Object.keys(outcomes)) delete outcomes[key];
  }

  function choices(actions) {
    const invalidations = actions.filter(
      (a) => a.kind === 'reload' || a.kind === 'clear',
    ).length;
    const result = [];
    if (invalidations < bounds.invalidations) {
      result.push({ kind: 'reload' }, { kind: 'clear' });
    }
    if (
      actions.filter((a) => a.kind === 'write').length < bounds.writes &&
      ['ready', 'error'].includes(store.getStatusSnapshot().kind)
    )
      result.push({ kind: 'write' });
    for (const [request, value] of requests.entries()) {
      if (value.phase === 'fetch') {
        for (const status of statuses)
          result.push({ kind: 'headers', request, status });
        result.push({ kind: 'reject', request });
      }
      if (value.phase === 'json') {
        result.push({ kind: 'reject-body', request });
        const bodies =
          value.status === 200
            ? value.method === 'GET'
              ? accounts.map((_, owner) => ({ kind: 'document', owner }))
              : [{ kind: 'document', owner: 0 }]
            : ['conflict', 'account_changed', 'invalid'].map((kind) => ({
                kind,
              }));
        for (const body of bodies) result.push({ kind: 'body', request, body });
      }
    }
    return result;
  }

  return {
    bootstrap,
    step,
    choices,
    requests,
    observations,
    violations,
    outcomes,
  };
}

export async function replay(createBoundary, actions) {
  const boundary = createBoundary();
  await boundary.bootstrap();
  for (let index = 0; index < actions.length; index++) {
    await boundary.step(actions[index]);
    if (boundary.violations.length) {
      return {
        passed: false,
        property: 'PrivateStateCurrent',
        actions: actions.slice(0, index + 1),
        violation: boundary.violations[0],
        observations: boundary.observations,
      };
    }
  }
  return {
    passed: true,
    choices: boundary.choices(actions),
    outcomes: boundary.outcomes,
    final: boundary.observations.at(-1),
  };
}
