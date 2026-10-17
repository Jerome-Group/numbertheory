import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from '@typescript/typescript6';
import type { progressStore as Store } from './progress.ts';
import { parseProgressExport } from './progress-schema.ts';

const compiled = ts.transpileModule(
  readFileSync(new URL('./progress.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;

function document(
  accountId = 'account-alpha',
  revision = 0,
  lessons: Record<string, 'complete' | 'review'> = {},
) {
  return { accountId, displayName: null, revision, lessons };
}

function boundary(legacy: string | null = null) {
  const requests: {
    init: RequestInit;
    resolve: (response: Response) => void;
    reject: (error: Error) => void;
  }[] = [];
  let storageReads = 0;
  const exported: { progressStore?: typeof Store } = {};
  runInNewContext(compiled, {
    exports: exported,
    require(name: string) {
      if (name === './content/lessons')
        return { lessons: [{ id: 'P00' }, { id: 'C02' }] };
      assert.equal(name, './progress-schema');
      return { parseProgressExport };
    },
    AbortSignal,
    fetch(url: string, init: RequestInit) {
      assert.equal(url, '/api/progress');
      return new Promise<Response>((resolve, reject) => {
        requests.push({ init, resolve, reject });
      });
    },
    localStorage: {
      getItem(key: string) {
        assert.equal(key, 'numbertheory.progress.v1');
        storageReads++;
        return legacy;
      },
      setItem() {
        assert.fail('Account progress must never persist to browser storage.');
      },
      removeItem() {
        assert.fail('Legacy device bytes must be preserved.');
      },
    },
  });
  assert.ok(exported.progressStore);
  const store = exported.progressStore;
  async function load(value = document()) {
    const pending = store.reload();
    requests.at(-1)?.resolve(Response.json(value));
    await pending;
    return accountId();
  }
  function accountId() {
    const status = store.getStatusSnapshot();
    assert.ok('accountId' in status);
    return status.accountId;
  }
  function body() {
    return JSON.parse(String(requests.at(-1)?.init.body));
  }
  return {
    store,
    requests,
    load,
    accountId,
    body,
    get storageReads() {
      return storageReads;
    },
  };
}

test('loads only from the account API and keeps public initial progress empty', async () => {
  const b = boundary('{"P00":"complete"}');
  assert.equal(b.store.getStatusSnapshot().kind, 'unknown');
  assert.equal(Object.keys(b.store.getSnapshot()).length, 0);
  assert.equal(b.storageReads, 0);
  await b.load(document('account-alpha', 2, { C02: 'review' }));
  assert.equal(b.requests[0].init.cache, 'no-store');
  assert.equal(b.requests[0].init.credentials, 'same-origin');
  assert.equal(b.store.getSnapshot().C02, 'review');
  assert.equal(b.store.getSnapshot().P00, undefined);
  assert.equal(b.storageReads, 0);
});

test('shows only acknowledged marks and admits one local write', async () => {
  const b = boundary();
  const accountId = await b.load();
  const states: string[] = [];
  b.store.subscribe(() => states.push(b.store.getStatusSnapshot().kind));
  const old = b.store.getSnapshot();
  const saving = b.store.set({
    accountId,
    lessonId: 'P00',
    status: 'complete',
  });
  assert.equal(b.store.getStatusSnapshot().kind, 'saving');
  assert.equal(b.store.getSnapshot(), old);
  assert.equal(
    await b.store.set({ accountId, lessonId: 'C02', status: 'review' }),
    false,
  );
  await b.store.reload();
  assert.equal(b.requests.length, 2);
  assert.equal(b.requests[1].init.method, 'PATCH');
  assert.deepEqual(b.body(), { lessonId: 'P00', status: 'complete' });
  b.requests[1].resolve(
    Response.json(document('account-alpha', 1, { P00: 'complete' })),
  );
  assert.equal(await saving, true);
  assert.equal(b.store.getSnapshot().P00, 'complete');
  assert.deepEqual(states, ['saving', 'ready']);
});

test('lost write confirmation blocks new intent until an explicit read without replay', async () => {
  const b = boundary();
  const accountId = await b.load();
  const saving = b.store.set({
    accountId,
    lessonId: 'P00',
    status: 'complete',
  });
  b.requests[1].reject(new Error('Connection lost after sending.'));
  assert.equal(await saving, false);
  assert.equal(b.store.getStatusSnapshot().kind, 'uncertain');
  assert.equal(b.store.getSnapshot().P00, undefined);
  assert.equal(await b.store.reset(accountId), false);
  assert.equal(
    await b.store.set({ accountId, lessonId: 'C02', status: 'review' }),
    false,
  );
  assert.equal(b.requests.length, 2);
  await b.load(document('account-alpha', 1, { P00: 'complete' }));
  assert.equal(b.requests.length, 3);
  assert.equal(b.requests[2].init.body, undefined);
  assert.equal(b.store.getSnapshot().P00, 'complete');
});

test('bulk conflicts preserve confirmed marks and require reload', async () => {
  const b = boundary();
  const accountId = await b.load(
    document('account-alpha', 4, { P00: 'review' }),
  );
  const clearing = b.store.reset(accountId);
  assert.deepEqual(b.body(), { revision: 4, lessons: {} });
  b.requests[1].resolve(
    Response.json({ code: 'conflict', message: 'Conflict.' }, { status: 409 }),
  );
  assert.equal(await clearing, false);
  assert.equal(b.store.getStatusSnapshot().kind, 'conflict');
  assert.equal(b.store.getSnapshot().P00, 'review');
  assert.equal(await b.store.reset(accountId), false);
  assert.equal(b.requests.length, 2);
});

test('sign-out immediately clears private marks and fences a late write reply', async () => {
  const b = boundary();
  const accountId = await b.load(
    document('account-alpha', 1, { P00: 'complete' }),
  );
  const saving = b.store.set({ accountId, lessonId: 'C02', status: 'review' });
  b.store.clearSession();
  assert.equal(Object.keys(b.store.getSnapshot()).length, 0);
  assert.equal(b.store.getStatusSnapshot().kind, 'anonymous');
  b.requests[1].resolve(
    Response.json(
      document('account-alpha', 2, { P00: 'complete', C02: 'review' }),
    ),
  );
  assert.equal(await saving, false);
  assert.equal(Object.keys(b.store.getSnapshot()).length, 0);
  await b.load(document('account-beta'));
  assert.equal(await b.store.reset(accountId), false);
  assert.equal(b.requests.length, 3);
});

test('newer account refresh fences old GET responses', async () => {
  const b = boundary();
  const oldRead = b.store.reload();
  const newRead = b.store.reload();
  b.requests[1].resolve(
    Response.json(document('account-beta', 2, { C02: 'review' })),
  );
  await newRead;
  b.requests[0].resolve(
    Response.json(document('account-alpha', 9, { P00: 'complete' })),
  );
  await oldRead;
  assert.equal(b.accountId(), 'account-beta');
  assert.equal(b.store.getSnapshot().P00, undefined);
  assert.equal(b.store.getSnapshot().C02, 'review');
});

test('GET revision cannot regress, including after an unavailable read', async () => {
  const b = boundary();
  await b.load(document('account-alpha', 5, { P00: 'complete' }));
  const failed = b.store.reload();
  assert.equal(Object.keys(b.store.getSnapshot()).length, 0);
  b.requests[1].reject(new Error('Read unavailable.'));
  await failed;
  const stale = b.store.reload();
  b.requests[2].resolve(
    Response.json(document('account-alpha', 4, { C02: 'review' })),
  );
  await stale;
  assert.equal(b.store.getStatusSnapshot().kind, 'unavailable');
  assert.equal(Object.keys(b.store.getSnapshot()).length, 0);
});

test('account-mismatched writes clear marks and reject stale restore callbacks', async () => {
  const b = boundary();
  const accountId = await b.load(
    document('account-alpha', 1, { P00: 'complete' }),
  );
  const saving = b.store.set({ accountId, lessonId: 'C02', status: 'review' });
  b.requests[1].resolve(
    Response.json(document('account-beta', 2, { C02: 'review' })),
  );
  assert.equal(await saving, false);
  assert.equal(Object.keys(b.store.getSnapshot()).length, 0);
  assert.equal(b.store.getStatusSnapshot().kind, 'unavailable');
  await b.load(document('account-beta', 2, { C02: 'review' }));
  assert.equal(
    await b.store.importJson({
      accountId,
      text: '{"schemaVersion":1,"lessons":{"P00":"complete"}}',
    }),
    false,
  );
  assert.equal(b.requests.length, 3);
});

for (const reply of [
  () => Response.json(document('account-alpha', 0)),
  () => Response.json({ ...document(), lessons: { X99: 'complete' } }),
  () => new Response('unreadable'),
  () =>
    Response.json(
      { code: 'unavailable', message: 'Unavailable.' },
      { status: 503 },
    ),
]) {
  test('untrusted or ambiguous write replies never replace confirmed marks', async () => {
    const b = boundary();
    const accountId = await b.load(
      document('account-alpha', 1, { P00: 'review' }),
    );
    const saving = b.store.reset(accountId);
    b.requests[1].resolve(reply());
    assert.equal(await saving, false);
    assert.equal(b.store.getStatusSnapshot().kind, 'uncertain');
    assert.equal(b.store.getSnapshot().P00, 'review');
    assert.equal(await b.store.reset(accountId), false);
  });
}

test('legacy import is explicit, preserves account marks, and leaves device bytes intact', async () => {
  const legacy = '{"P00":"review","C02":"complete","invalid":"mark"}';
  const b = boundary(legacy);
  const accountId = await b.load(
    document('account-alpha', 3, { P00: 'complete' }),
  );
  assert.equal(b.storageReads, 0);
  const found = b.store.readLegacy();
  assert.equal(found.kind, 'available');
  assert.ok(found.kind === 'available');
  assert.equal(found.ignored, 1);
  const saving = b.store.importLegacy({ accountId, lessons: found.lessons });
  assert.deepEqual(b.body(), {
    revision: 3,
    lessons: { P00: 'complete', C02: 'complete' },
  });
  b.requests[1].resolve(
    Response.json(
      document('account-alpha', 4, { P00: 'complete', C02: 'complete' }),
    ),
  );
  assert.equal(await saving, true);
  assert.equal(b.store.readLegacy().kind, 'available');
  assert.equal(b.storageReads, 2);
});

test('schema1 restore remains validated and acknowledged as an atomic replacement', async () => {
  const b = boundary();
  const accountId = await b.load(
    document('account-alpha', 3, { P00: 'complete' }),
  );
  assert.throws(() =>
    b.store.importJson({
      accountId,
      text: '{"schemaVersion":1,"lessons":{"C02":"review","X99":"complete"}}',
    }),
  );
  assert.equal(b.requests.length, 1);
  const restoring = b.store.importJson({
    accountId,
    text: '{"schemaVersion":1,"lessons":{"C02":"review"}}',
  });
  assert.deepEqual(b.body(), { revision: 3, lessons: { C02: 'review' } });
  assert.equal(b.store.getSnapshot().P00, 'complete');
  b.requests[1].resolve(
    Response.json(document('account-alpha', 4, { C02: 'review' })),
  );
  assert.equal(await restoring, true);
  assert.deepEqual(JSON.parse(b.store.exportJson()), {
    schemaVersion: 1,
    lessons: { C02: 'review' },
  });
});

test('anonymous sessions cannot save after an expired authenticated request', async () => {
  const b = boundary();
  const accountId = await b.load(
    document('account-alpha', 1, { P00: 'complete' }),
  );
  const saving = b.store.reset(accountId);
  b.requests[1].resolve(
    Response.json(
      { code: 'sign_in_required', message: 'Sign in.' },
      { status: 401 },
    ),
  );
  assert.equal(await saving, false);
  assert.equal(b.store.getStatusSnapshot().kind, 'anonymous');
  assert.equal(Object.keys(b.store.getSnapshot()).length, 0);
  assert.equal(await b.store.reset(accountId), false);
  assert.equal(b.requests.length, 2);
});
