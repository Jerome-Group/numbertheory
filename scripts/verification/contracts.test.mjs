import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import test from 'node:test';
import { loadRepositoryModule } from './repo-loader.mjs';

const root = resolve(process.env.NUMBERTHEORY_REPO ?? process.cwd());
const storage = new Map(),
  events = new Map(),
  registered = new Map();
globalThis.location = new URL('https://numbertheory.example/');
globalThis.history = {
  pushState(_state, _unused, url) {
    globalThis.location = new URL(url, location);
  },
};
globalThis.window = {
  addEventListener(name, fn) {
    events.set(name, fn);
  },
};
globalThis.localStorage = {
  getItem(key) {
    return storage.get(key) ?? null;
  },
  setItem(key, value) {
    storage.set(key, value);
  },
};
globalThis.document = {
  modelContext: {
    registerTool(tool, { signal }) {
      registered.set(tool.name, tool);
      signal.addEventListener('abort', () => registered.delete(tool.name));
    },
  },
};
const { studyStore } = await loadRepositoryModule(root, 'src/state.ts');
const { progressStore } = await loadRepositoryModule(root, 'src/progress.ts');
const { registerStudyTools } = await loadRepositoryModule(
  root,
  'src/webmcp/register.ts',
);
const { lessons } = await loadRepositoryModule(root, 'src/content/lessons.ts');
const stop = registerStudyTools();
test('all 83 lesson commands and six view commands resolve; unknown ID is atomic', () => {
  for (const lesson of lessons) {
    studyStore.openLesson(lesson.id);
    assert.equal(studyStore.getSnapshot().lessonId, lesson.id);
    assert.match(
      location.pathname,
      new RegExp(`/lessons/${lesson.id.toLowerCase()}-`),
    );
  }
  for (const view of [
    'learn',
    'explore',
    'practice',
    'studio',
    'reference',
    'course',
  ]) {
    studyStore.openView(view);
    assert.equal(studyStore.getSnapshot().view, view);
  }
  const before = studyStore.getSnapshot(),
    url = location.href,
    revision = studyStore.getRevision();
  assert.throws(() => studyStore.openLesson('X99'));
  assert.equal(studyStore.getSnapshot(), before);
  assert.equal(location.href, url);
  assert.equal(studyStore.getRevision(), revision);
});
test('store setter exact certificate, URL reload/popstate and invalid input atomicity', () => {
  studyStore.setEuclidInputs('391', '299');
  const s = studyStore.getSnapshot();
  assert.equal(s.result.gcd, '23');
  assert.equal(391n * BigInt(s.result.x) + 299n * BigInt(s.result.y), 23n);
  assert.equal(location.search.includes('a=391'), true);
  const url = location.href,
    rev = studyStore.getRevision();
  assert.throws(() => studyStore.setEuclidInputs('bad', '299'));
  assert.equal(location.href, url);
  assert.equal(studyStore.getRevision(), rev);
  events.get('popstate')();
  assert.equal(studyStore.getSnapshot().result.gcd, '23');
});
test('36 registered contracts compute without mutation; setter increments; stale/extra input atomic', () => {
  assert.equal(registered.size, 36);
  let rev = studyStore.getRevision(),
    url = location.href;
  const result = registered
    .get('compute_euclid')
    .execute({ a: '391', b: '299' });
  assert.equal(result.gcd, '23');
  assert.equal(location.href, url);
  assert.equal(studyStore.getRevision(), rev);
  const setter = registered.get('set_euclid_example');
  setter.execute({ a: '252', b: '105', expectedRevision: rev });
  assert.equal(studyStore.getRevision(), rev + 1);
  assert.equal(studyStore.getSnapshot().result.gcd, '21');
  url = location.href;
  const current = studyStore.getSnapshot();
  assert.throws(
    () => setter.execute({ a: '391', b: '299', expectedRevision: rev }),
    /changed/,
  );
  assert.throws(
    () => setter.execute({ a: '391', b: '299', unexpected: true }),
    /Unknown/,
  );
  assert.throws(() => setter.execute({ a: 'bad', b: '299' }));
  assert.equal(location.href, url);
  assert.equal(studyStore.getSnapshot(), current);
});
test('checkpoint/context omit hidden answers; unknown claim rejected; no privileged tool registered', () => {
  const context = registered.get('get_number_theory_context').execute({});
  assert.equal('answer' in context, false);
  const chapter = lessons[0].cluster;
  const checkpoint = registered
    .get('get_number_theory_checkpoint')
    .execute({ chapter });
  assert.equal('answer' in checkpoint, false);
  assert.ok(checkpoint.prompt);
  assert.throws(() =>
    registered.get('get_number_theory_claim').execute({ claimId: 'missing' }),
  );
  assert.equal(
    [...registered.keys()].some((name) =>
      /publish|deploy|credential|filesystem|progress/.test(name),
    ),
    false,
  );
});
test('all 15 computation/setter pairs obey route/revision/nonmutation contracts', () => {
  const pairs = [
    [
      'cancellation_map',
      'cancellation_map',
      { modulus: '12', factor: '4' },
      'C02',
    ],
    [
      'local_square_roots',
      'local_square_roots',
      { modulus: '45', target: '4' },
      'X05',
    ],
    [
      'gaussian_division',
      'gaussian_division',
      { alphaRe: '7', alphaIm: '5', betaRe: '3', betaIm: '2' },
      'N04',
    ],
    ['euclid', 'euclid_example', { a: '391', b: '299' }, 'D04'],
    ['crt', 'crt_example', { a: '2', m: '3', b: '3', n: '5' }, 'C04'],
    [
      'linear_congruence',
      'linear_congruence',
      { a: '6', b: '8', n: '14' },
      'C03',
    ],
    [
      'residue_operation',
      'residue_operation',
      { modulus: '7', first: '-1', second: '9', operation: 'add' },
      'C01',
    ],
    [
      'quadratic_residue',
      'quadratic_residue',
      { prime: '7', target: '2' },
      'Q01',
    ],
    [
      'hensel_tree',
      'hensel_tree',
      { prime: '7', constant: '2', levels: '3' },
      'F03',
    ],
    [
      'rational_continued_fraction',
      'rational_continued_fraction',
      { numerator: '43', denominator: '19' },
      'R01',
    ],
    [
      'sqrt_continued_fraction',
      'sqrt_continued_fraction',
      { radicand: '2', terms: '8' },
      'R05',
    ],
    ['pell_orbit', 'pell_orbit', { radicand: '13', count: '5' }, 'R06'],
    [
      'divisor_convolution',
      'divisor_convolution',
      { n: '12', f: 'one', g: 'one' },
      'A03',
    ],
    [
      'primitive_root_cycle',
      'primitive_root_cycle',
      { prime: '7', candidate: '3' },
      'U02',
    ],
    ['reciprocity_lattice', 'reciprocity_lattice', { p: '7', q: '11' }, 'Q04'],
  ];
  for (const [compute, set, input, lessonId] of pairs) {
    const url = location.href,
      rev = studyStore.getRevision(),
      state = studyStore.getSnapshot();
    const output = registered.get(`compute_${compute}`).execute(input);
    assert.ok(output, compute);
    assert.equal(location.href, url, compute);
    assert.equal(studyStore.getSnapshot(), state, compute);
    assert.equal(studyStore.getRevision(), rev, compute);
    const changed = registered
      .get(`set_${set}`)
      .execute({ ...input, expectedRevision: rev });
    assert.equal(changed.lessonId, lessonId, set);
    assert.equal(studyStore.getSnapshot().lessonId, lessonId, set);
    assert.equal(studyStore.getRevision(), rev + 1, set);
    const next = studyStore.getSnapshot(),
      nextUrl = location.href;
    assert.throws(
      () =>
        registered.get(`set_${set}`).execute({ ...input, unexpected: true }),
      /Unknown/,
    );
    assert.throws(
      () =>
        registered
          .get(`set_${set}`)
          .execute({ ...input, expectedRevision: rev }),
      /changed/,
    );
    assert.equal(studyStore.getSnapshot(), next);
    assert.equal(location.href, nextUrl);
  }
  // Independent enumeration oracle at the tool boundary, not reuse of kernel.
  const roots = registered
    .get('compute_local_square_roots')
    .execute({ modulus: '45', target: '4' });
  assert.deepEqual(
    roots.roots,
    [...Array(45).keys()].filter((x) => (x * x) % 45 === 4),
  );
});
test('progress import/export store integration preserves state on malformed/unknown; reset persists', () => {
  progressStore.set('P00', 'review');
  const exported = progressStore.exportJson();
  assert.equal(JSON.parse(exported).lessons.P00, 'review');
  const previous = progressStore.getSnapshot(),
    before = storage.get('numbertheory.progress.v1');
  for (const value of [
    '{',
    JSON.stringify({
      schemaVersion: 1,
      lessons: { P00: 'complete', X99: 'review' },
    }),
  ])
    assert.throws(() => progressStore.importJson(value));
  assert.equal(progressStore.getSnapshot(), previous);
  assert.equal(storage.get('numbertheory.progress.v1'), before);
  progressStore.reset();
  assert.deepEqual(progressStore.getSnapshot(), {});
  progressStore.importJson(exported);
  assert.equal(progressStore.getSnapshot().P00, 'review');
  progressStore.reset();
  assert.equal(storage.get('numbertheory.progress.v1'), '{}');
});
test('denied storage retains usable current-session progress', () => {
  const original = localStorage.setItem;
  localStorage.setItem = () => {
    throw new Error('Denied');
  };
  try {
    progressStore.set('D04', 'complete');
    assert.equal(progressStore.getSnapshot().D04, 'complete');
  } finally {
    localStorage.setItem = original;
  }
});
test('registration abort removes every tool; absent host does not throw', () => {
  stop();
  assert.equal(registered.size, 0);
  document.modelContext = undefined;
  assert.doesNotThrow(() => registerStudyTools()());
});
