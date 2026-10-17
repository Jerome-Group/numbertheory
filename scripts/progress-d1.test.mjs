import assert from 'node:assert/strict';
import {
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { convertV4MiniflareOptions, Log, LogLevel, Miniflare } from 'miniflare';

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = 'https://progress.test';
const endpoint = `${origin}/api/progress`;
const accountA = {
  'oai-authenticated-user-id': 'fixture-account-a',
  'oai-authenticated-user-email': 'a@example.test',
  'oai-authenticated-user-full-name': 'First%20Learner',
  'oai-authenticated-user-full-name-encoding': 'percent-encoded-utf-8',
};
const accountB = {
  'oai-authenticated-user-id': 'fixture-account-b',
  'oai-authenticated-user-email': 'b@example.test',
};

test('progress route on actual local D1 with fixture dispatch identities', async (t) => {
  const directory = await realpath(
    await mkdtemp(path.join(tmpdir(), 'numbertheory-progress-d1-')),
  );
  let worker;
  try {
    const fixturePath = path.join(directory, 'request-identity.ts');
    const entryPath = path.join(directory, 'worker.ts');
    await writeFile(
      fixturePath,
      `import { AsyncLocalStorage } from 'node:async_hooks';
const requestHeaders = new AsyncLocalStorage();
export function headers() { return requestHeaders.getStore(); }
export function withFixtureHeaders(headers, operation) {
  return requestHeaders.run(headers, operation);
}
`,
    );
    await writeFile(
      entryPath,
      `import * as routes from ${JSON.stringify(path.join(root, 'app/api/progress/route.ts'))};
import { withFixtureHeaders } from './request-identity';
export default {
  fetch(request) {
    const operation = routes[request.method] ?? routes.POST;
    return withFixtureHeaders(request.headers, () => operation(request));
  }
};
`,
    );
    const bundle = await build({
      entryPoints: [entryPath],
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'neutral',
      target: 'es2022',
      external: ['cloudflare:workers', 'node:async_hooks'],
      plugins: [
        {
          name: 'fixture-dispatch-identity',
          setup(builder) {
            builder.onResolve({ filter: /^next\/headers$/ }, () => ({
              path: fixturePath,
            }));
          },
        },
      ],
    });
    worker = new Miniflare(
      convertV4MiniflareOptions({
        modules: true,
        script: bundle.outputFiles[0].text,
        compatibilityDate: '2026-05-15',
        compatibilityFlags: ['nodejs_compat'],
        d1Databases: { DB: 'progress-fixture' },
        d1Persist: path.join(directory, 'd1'),
        log: new Log(LogLevel.ERROR),
      }),
    );
    const database = await worker.getD1Database('DB');

    async function request({
      method = 'GET',
      account = accountA,
      body,
      headers = {},
      rawBody,
      expectedAccount = account['oai-authenticated-user-id'],
    } = {}) {
      return worker.dispatchFetch(endpoint, {
        method,
        headers: {
          ...account,
          ...(method === 'GET'
            ? {}
            : { origin, 'content-type': 'application/json' }),
          ...((method === 'PATCH' || method === 'PUT') &&
          expectedAccount !== null
            ? { 'x-numbertheory-account': expectedAccount ?? '' }
            : {}),
          ...headers,
        },
        body:
          rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
        ...(rawBody instanceof ReadableStream ? { duplex: 'half' } : {}),
      });
    }

    async function json(response, status = 200) {
      assert.equal(response.status, status);
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
      assert.equal(response.headers.get('vary'), 'Cookie');
      assert.match(
        response.headers.get('content-type'),
        /^application\/json\b/,
      );
      const value = await response.json();
      assert.deepEqual(
        Object.keys(value).sort(),
        status === 200
          ? ['accountId', 'displayName', 'lessons', 'revision']
          : ['code', 'message'],
      );
      return value;
    }

    async function error(options, status, code) {
      const value = await json(await request(options), status);
      assert.equal(value.code, code);
      assert.equal(typeof value.message, 'string');
    }

    await t.test(
      'missing migrations fail closed without creating tables',
      async () => {
        await error({}, 503, 'unavailable');
        const table = await database
          .prepare(
            "SELECT name FROM sqlite_master WHERE name = 'account_progress'",
          )
          .first();
        assert.equal(table, null);
      },
    );

    const migrations = (await readdir(path.join(root, 'drizzle')))
      .filter((name) => name.endsWith('.sql'))
      .sort();
    assert.ok(migrations.length > 0, 'generated schema migrations exist');
    for (const migration of migrations) {
      const sql = await readFile(path.join(root, 'drizzle', migration), 'utf8');
      for (const statement of sql.split('--> statement-breakpoint')) {
        if (statement.trim()) await database.prepare(statement).run();
      }
    }

    await t.test(
      'anonymous, invalid and oversized requests cannot change progress',
      async () => {
        await error({ account: {} }, 401, 'sign_in_required');
        await error(
          { account: { 'oai-authenticated-user-id': 'unverified' } },
          401,
          'sign_in_required',
        );
        await error(
          {
            method: 'PATCH',
            account: {},
            body: { lessonId: 'P00', status: 'complete' },
          },
          401,
          'sign_in_required',
        );
        for (const requestOrigin of [
          '',
          'null',
          'https://other.test',
          `${origin}/`,
        ]) {
          await error(
            {
              method: 'PATCH',
              headers: { origin: requestOrigin },
              body: { lessonId: 'P00', status: 'complete' },
            },
            403,
            'invalid_origin',
          );
        }
        await error(
          {
            method: 'PATCH',
            headers: { 'content-type': 'text/plain' },
            body: { lessonId: 'P00', status: 'complete' },
          },
          415,
          'invalid_content_type',
        );
        for (const body of [
          null,
          [],
          {},
          { lessonId: 'P00' },
          { lessonId: 'unknown', status: 'complete' },
          { lessonId: 'P00', status: 'pending' },
          { lessonId: 'P00', status: 1 },
          {
            lessonId: 'P00',
            status: 'complete',
            accountId: 'fixture-account-b',
          },
          { lessonId: 'P00', status: 'complete', ownerId: 'fixture-account-b' },
        ]) {
          await error({ method: 'PATCH', body }, 400, 'invalid_request');
        }
        for (const body of [
          { revision: -1, lessons: {} },
          { revision: 0.5, lessons: {} },
          { revision: Number.MAX_SAFE_INTEGER + 1, lessons: {} },
          { revision: '0', lessons: {} },
          { revision: 0, lessons: [] },
          { revision: 0, lessons: { unknown: 'complete' } },
          { revision: 0, lessons: { P00: null } },
          { revision: 0, lessons: { P00: 'pending' } },
          { revision: 0, lessons: {}, ownerId: 'fixture-account-b' },
        ]) {
          await error({ method: 'PUT', body }, 400, 'invalid_request');
        }
        await error({ method: 'PATCH', rawBody: '{' }, 400, 'invalid_request');
        await error(
          { method: 'PATCH', rawBody: new Uint8Array([0xff, 0xfe]) },
          400,
          'invalid_request',
        );
        await error(
          { method: 'PATCH', rawBody: ' '.repeat(16 * 1024 + 1) },
          413,
          'body_too_large',
        );
        await error(
          {
            method: 'PATCH',
            rawBody: JSON.stringify({
              lessonId: 'é'.repeat(8192),
              status: 'complete',
            }),
          },
          413,
          'body_too_large',
        );
        for (const method of ['POST', 'DELETE', 'OPTIONS'])
          await error({ method }, 400, 'invalid_request');
        const head = await request({ method: 'HEAD' });
        assert.equal(head.status, 400);
        assert.equal(head.headers.get('cache-control'), 'private, no-store');
        assert.deepEqual((await json(await request())).lessons, {});
        assert.equal((await json(await request())).revision, 0);
      },
    );

    await t.test(
      'fresh documents and mutations are bound to the server account',
      async () => {
        assert.deepEqual(await json(await request()), {
          accountId: 'fixture-account-a',
          displayName: 'First Learner',
          revision: 0,
          lessons: {},
        });
        const first = await json(
          await request({
            method: 'PATCH',
            body: { lessonId: 'P00', status: 'complete' },
          }),
        );
        assert.equal(first.accountId, 'fixture-account-a');
        assert.equal(first.revision, 1);
        assert.deepEqual(first.lessons, { P00: 'complete' });
        const queryOwner = await json(
          await worker.dispatchFetch(
            `${endpoint}?accountId=fixture-account-b`,
            {
              headers: accountA,
            },
          ),
        );
        assert.equal(queryOwner.accountId, 'fixture-account-a');
        assert.deepEqual(queryOwner.lessons, first.lessons);
        assert.deepEqual(await json(await request({ account: accountB })), {
          accountId: 'fixture-account-b',
          displayName: 'b@example.test',
          revision: 0,
          lessons: {},
        });
        const second = await json(
          await request({
            method: 'PUT',
            account: accountB,
            body: { revision: 0, lessons: { D01: 'review' } },
          }),
        );
        assert.equal(second.revision, 1);
        assert.deepEqual(second.lessons, { D01: 'review' });
        assert.deepEqual((await json(await request())).lessons, {
          P00: 'complete',
        });
      },
    );

    await t.test('parallel disjoint marks all survive', async () => {
      const marks = {
        D01: 'complete',
        D02: 'review',
        D03: 'complete',
        D04: 'review',
        D05: 'complete',
        D06: 'review',
      };
      const results = await Promise.all(
        Object.entries(marks).map(async ([lessonId, status]) =>
          json(await request({ method: 'PATCH', body: { lessonId, status } })),
        ),
      );
      assert.deepEqual(
        results.map((result) => result.revision).sort((a, b) => a - b),
        [2, 3, 4, 5, 6, 7],
      );
      const current = await json(await request());
      assert.equal(current.revision, 7);
      assert.deepEqual(current.lessons, { P00: 'complete', ...marks });
      assert.deepEqual(
        (await json(await request({ account: accountB }))).lessons,
        {
          D01: 'review',
        },
      );
    });

    await t.test(
      'same-lesson writes follow server commit revision',
      async () => {
        const statuses = ['review', null, 'complete', 'review'];
        const results = await Promise.all(
          statuses.map(async (status) => {
            const saved = await json(
              await request({
                method: 'PATCH',
                body: { lessonId: 'P00', status },
              }),
            );
            assert.equal(saved.lessons.P00 ?? null, status);
            return { saved, status };
          }),
        );
        const last = results.reduce((left, right) =>
          left.saved.revision > right.saved.revision ? left : right,
        );
        const current = await json(await request());
        assert.equal(current.revision, 11);
        assert.equal(current.lessons.P00 ?? null, last.status);
        const cleared = await json(
          await request({
            method: 'PATCH',
            body: { lessonId: 'P00', status: null },
          }),
        );
        assert.equal(Object.hasOwn(cleared.lessons, 'P00'), false);
        assert.equal(cleared.lessons.D06, 'review');
      },
    );

    await t.test(
      'bulk restore and reset reject stale revisions atomically',
      async () => {
        await error(
          {
            method: 'PUT',
            account: {
              'oai-authenticated-user-id': 'fixture-new-account',
              'oai-authenticated-user-email': 'new@example.test',
            },
            body: { revision: 9, lessons: { P00: 'complete' } },
          },
          409,
          'conflict',
        );
        const before = await json(await request());
        await error(
          { method: 'PUT', body: { revision: 0, lessons: {} } },
          409,
          'conflict',
        );
        const replacements = [{ P00: 'complete' }, { D01: 'review' }];
        const racing = await Promise.all(
          replacements.map(async (lessons) => {
            const response = await request({
              method: 'PUT',
              body: { revision: before.revision, lessons },
            });
            return {
              status: response.status,
              value: await json(response, response.status),
            };
          }),
        );
        assert.deepEqual(
          racing.map((result) => result.status).sort(),
          [200, 409],
        );
        const accepted = racing.find((result) => result.status === 200).value;
        assert.equal(accepted.revision, before.revision + 1);
        assert.deepEqual(await json(await request()), accepted);
        const reset = await json(
          await request({
            method: 'PUT',
            body: { revision: accepted.revision, lessons: {} },
          }),
        );
        assert.deepEqual(reset.lessons, {});
        await error(
          {
            method: 'PUT',
            body: { revision: accepted.revision, lessons: before.lessons },
          },
          409,
          'conflict',
        );
        assert.deepEqual(await json(await request()), reset);
        const restored = await json(
          await request({
            method: 'PUT',
            body: { revision: reset.revision, lessons: before.lessons },
          }),
        );
        assert.deepEqual(restored.lessons, before.lessons);
        assert.equal(restored.revision, reset.revision + 1);
      },
    );

    await t.test(
      'the body limit counts streamed bytes and accepts all lesson marks',
      async () => {
        const payload = JSON.stringify({ lessonId: 'P00', status: 'complete' });
        const body = payload.padEnd(16 * 1024, ' ');
        const stream = new ReadableStream({
          start(controller) {
            for (let offset = 0; offset < body.length; offset += 257)
              controller.enqueue(
                new TextEncoder().encode(body.slice(offset, offset + 257)),
              );
            controller.close();
          },
        });
        await json(await request({ method: 'PATCH', rawBody: stream }));
        const ids = JSON.parse(
          await readFile(path.join(root, 'src/content/order.json'), 'utf8'),
        );
        assert.equal(ids.length, 83);
        const current = await json(await request());
        const lessons = Object.fromEntries(ids.map((id) => [id, 'complete']));
        const saved = await json(
          await request({
            method: 'PUT',
            body: { revision: current.revision, lessons },
          }),
        );
        assert.deepEqual(saved.lessons, lessons);
        const rows = await database
          .prepare('SELECT * FROM account_progress')
          .all();
        assert.equal(rows.results.length, 2);
        assert.doesNotMatch(
          JSON.stringify(rows.results),
          /example\.test|First Learner/,
        );
      },
    );
    await t.test(
      'stale account intents cannot mutate another signed-in account',
      async () => {
        const beforeA = await json(await request());
        const beforeB = await json(await request({ account: accountB }));
        for (const method of ['PATCH', 'PUT']) {
          const body =
            method === 'PATCH'
              ? { lessonId: 'P00', status: 'review' }
              : { revision: beforeB.revision, lessons: {} };
          for (const expectedAccount of [
            accountA['oai-authenticated-user-id'],
            null,
          ]) {
            await error(
              { method, account: accountB, expectedAccount, body },
              409,
              'account_changed',
            );
          }
        }
        assert.deepEqual(await json(await request()), beforeA);
        assert.deepEqual(
          await json(await request({ account: accountB })),
          beforeB,
        );
        assert.deepEqual(
          await json(
            await request({
              headers: {
                'x-numbertheory-account': accountB['oai-authenticated-user-id'],
              },
            }),
          ),
          beforeA,
        );
      },
    );
  } finally {
    await worker?.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});
