import { validateEvidence } from './evidence.mjs';
import { loadRepositoryModule } from './repo-loader.mjs';

export { commands } from './cli.mjs';
export { validateEvidence } from './evidence.mjs';

import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  readlinkSync,
} from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const verificationDirectory = fileURLToPath(new URL('.', import.meta.url));

export const catalog = Object.freeze({
  install: ['npm', ['ci']],
  content: ['npm', ['run', 'check:content']],
  types: ['npm', ['run', 'check']],
  format: ['npm', ['run', 'format:check']],
  lint: ['npm', ['run', 'lint']],
  tests: ['npm', ['test']],
  contracts: [
    process.execPath,
    ['--test', join(verificationDirectory, 'contracts.test.mjs')],
  ],
  build: ['npm', ['run', 'build:bundle']],
  public: ['npm', ['run', 'check:public']],
  'verification-tests': ['npm', ['run', 'test:verification']],
});
const hash = (value) => createHash('sha256').update(value).digest('hex');
const git = (root, args) =>
  execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' });
export function validateInventory(lessons, inventory) {
  const actual = lessons.map((l) => l.id).sort(),
    expected = [...inventory.lessonIds].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error('Lesson IDs differ from baseline inventory.');
}
export function prerequisiteClosure(lessons, paths) {
  const byId = new Map(lessons.map((l) => [l.id, l]));
  const result = {};
  for (const [id, path] of Object.entries(paths)) {
    const members = new Set(path.ids),
      needed = new Set();
    const visit = (lesson, trail = []) => {
      if (trail.includes(lesson))
        throw new Error(
          `Prerequisite cycle: ${[...trail, lesson].join(' -> ')}`,
        );
      if (!byId.has(lesson)) throw new Error(`Unknown prerequisite ${lesson}`);
      for (const pre of byId.get(lesson).prerequisites) {
        needed.add(pre);
        visit(pre, [...trail, lesson]);
      }
    };
    for (const lesson of members) visit(lesson);
    result[id] = {
      required: [...needed].sort(),
      missing: [...needed].filter((p) => !members.has(p)).sort(),
      closed: [...needed].every((p) => members.has(p)),
    };
  }
  return result;
}
export function fingerprint(root) {
  const paths = git(root, [
    'ls-files',
    '--cached',
    '--others',
    '--exclude-standard',
    '-z',
  ])
    .split('\0')
    .filter(Boolean)
    .filter(
      (p) => !/^(dist|node_modules|coverage|verification-results)\//.test(p),
    )
    .sort();
  const files = paths.map((p) => {
    const file = join(root, p);
    if (!existsSync(file)) return [p, 'MISSING'];
    const stat = lstatSync(file);
    return [
      p,
      stat.isSymbolicLink()
        ? hash(`symlink:${readlinkSync(file)}`)
        : hash(readFileSync(file)),
    ];
  });
  return {
    sourceHash: hash(JSON.stringify(files)),
    commit: git(root, ['rev-parse', 'HEAD']).trim(),
    dirty: Boolean(git(root, ['status', '--porcelain']).trim()),
    files: files.length,
    lockHash: hash(readFileSync(join(root, 'package-lock.json'))),
    node: process.version,
  };
}
export function buildFingerprint(root) {
  const dist = join(root, 'dist');
  const hostingPath = join(root, '.openai/hosting.json');
  const worker =
    existsSync(hostingPath) &&
    !JSON.parse(readFileSync(hostingPath, 'utf8')).static;
  const entry = worker ? 'server/wrangler.json' : 'index.html';
  if (!existsSync(join(dist, entry)))
    throw new Error(`Missing dist/${entry}; fresh build required.`);
  if (worker) {
    const manifest = JSON.parse(readFileSync(join(dist, entry), 'utf8'));
    if (
      typeof manifest.main !== 'string' ||
      typeof manifest.assets?.directory !== 'string'
    )
      throw new Error('Worker build requires an entry and asset directory.');
    for (const [name, target, directory] of [
      ['entry', manifest.main, false],
      ['assets', manifest.assets.directory, true],
    ]) {
      const path = resolve(dist, 'server', target);
      const within = relative(dist, path);
      if (
        isAbsolute(target) ||
        isAbsolute(within) ||
        !within ||
        within === '..' ||
        within.startsWith('../') ||
        within.startsWith('..\\') ||
        !existsSync(path) ||
        (directory ? !lstatSync(path).isDirectory() : !lstatSync(path).isFile())
      )
        throw new Error(`Missing or unsafe Worker ${name}.`);
      if (directory && !readdirSync(path).length)
        throw new Error('Worker assets must not be empty.');
    }
  }
  const receiptPath = join(dist, 'source-identity.json');
  if (!existsSync(receiptPath) || !lstatSync(receiptPath).isFile())
    throw new Error('Missing regular build source identity; rebuild required.');
  const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
  const current = fingerprint(root);
  if (
    receipt.schemaVersion !== 1 ||
    receipt.sourceHash !== current.sourceHash ||
    receipt.lockHash !== current.lockHash
  )
    throw new Error('Stale build source identity; rebuild required.');
  const files = [];
  function walk(dir) {
    for (const name of readdirSync(dir).sort()) {
      const file = join(dir, name);
      const stat = lstatSync(file);
      if (stat.isDirectory()) walk(file);
      else if (stat.isFile())
        files.push([file.slice(dist.length + 1), hash(readFileSync(file))]);
      else throw new Error(`Build output must contain regular files: ${file}`);
    }
  }
  walk(dist);
  return { buildHash: hash(JSON.stringify(files)), assets: files.length };
}
function frozenBuildStage(root, frozenBuild, stage) {
  try {
    if (buildFingerprint(root).buildHash !== frozenBuild.buildHash)
      throw new Error('Frozen build changed during release verification.');
    return { stage, status: 'passed', ...frozenBuild };
  } catch (error) {
    return { stage, status: 'failed', error: error.message };
  }
}
export async function scopeMap(root) {
  const { lessons } = await loadRepositoryModule(
    root,
    'src/content/lessons.ts',
  );
  const paths = await loadRepositoryModule(root, 'src/content/paths.ts');
  const routes = await loadRepositoryModule(root, 'src/routes.ts');
  const checkpoints = await loadRepositoryModule(
    root,
    'src/content/checkpoints.ts',
  );
  const { figures } = await loadRepositoryModule(
    root,
    'src/content/figures.ts',
  );
  const teaching = JSON.parse(
    readFileSync(join(root, 'src/content/teaching.json'), 'utf8'),
  );
  const ids = new Set(lessons.map((l) => l.id));
  if (ids.size !== 83 || lessons.length !== 83)
    throw new Error('Expected exact 83 lesson scope.');
  validateInventory(
    lessons,
    JSON.parse(
      readFileSync(
        join(verificationDirectory, 'lesson-inventory.json'),
        'utf8',
      ),
    ),
  );
  for (const l of lessons)
    for (const id of l.prerequisites)
      if (!ids.has(id)) throw new Error(`Missing prerequisite ${l.id}:${id}`);
  for (const [id, path] of Object.entries(paths.pathDetails)) {
    if (new Set(path.ids).size !== path.ids.length)
      throw new Error(`Duplicate path member ${id}`);
    for (const lesson of path.ids)
      if (!ids.has(lesson))
        throw new Error(`Unknown path member ${id}:${lesson}`);
  }
  const objectives = JSON.parse(
    readFileSync(join(root, 'src/content/objectives.json'), 'utf8'),
  );
  const toolSource = readFileSync(join(root, 'src/webmcp/register.ts'), 'utf8');
  const tools = [...toolSource.matchAll(/name: '([^']+)'/g)].map((m) => m[1]);
  const features = [
    'learn-fiber-preview',
    'diagnostic-all-correct',
    'diagnostic-first-missed',
    'path-selection-persistence',
    'explore-search',
    'sidebar-search',
    'chapter-disclosures',
    'checkpoint-answer-reveal',
    'studio-lab-index',
    'catalog-query-chapter-empty-states',
    'continue-selected-route',
    'section-jump-reload-same-lesson',
    'progress-text-backup-restore',
    'original-figures-text-alternatives',
    'reference-claim-index',
    'course-current-historical',
    'lesson-prerequisite-next-links',
    'claim-recall',
    'practice-hints-answer',
    'account-mark-complete-review-clear',
    'practice-review-queue',
    'proof-notebook-session',
    'proof-notebook-source-recovery',
    'proof-notebook-export-reset',
    'progress-export-copy-backup',
    'progress-import-roundtrip',
    'progress-reset-reload',
    'progress-invalid-atomic',
    'legacy-device-storage-denied-corrupt',
    'account-public-reading-sign-in',
    'account-progress-persistence-isolation',
    'account-origin-identity-rejection',
    'account-stale-bulk-conflict',
    'account-uncertain-save-reload',
    'legacy-device-import-account-wins',
    'account-signout-clear',
    'mobile-drawer-focus-escape',
    'skip-link-keyboard',
    'print-proof-math',
    'forced-colors-reduced-motion',
    'webmcp-absent-human-flow',
    'webmcp-native-discovery',
    'webmcp-abort-remount',
    'webmcp-stale-extra-invalid-atomic',
    'legacy-url-lab-reload',
    'back-forward',
    'unknown-route',
    'p00-proof-repair',
    'c02-reasoning-ladder',
    'q04-proof-check',
    'r07-unit-classification',
  ];
  const journeys = [
    'new-learner-diagnostic-proof-practice-mark',
    'returning-learner-review-queue',
    'search-prerequisite-lab-share-reload',
    'progress-transfer-reset',
    'agent-compute-set-visible-parity',
    'mobile-keyboard-reading',
    'account-save-fresh-session',
    'account-conflict-recovery',
    'proof-notebook-attempt-compare-revise',
  ];
  const map = {
    schemaVersion: 1,
    lessons: lessons.map((l) => ({
      id: l.id,
      title: l.title,
      route: routes.lessonPath(l.id),
      legacyRoute: `/?view=lesson&lesson=${l.id}`,
      chapter: l.cluster,
      prerequisites: l.prerequisites,
      lab: l.lab ?? null,
      objective: objectives[l.id],
      claimId: `${l.id}.claim`,
      exerciseId: `${l.id}.practice`,
      proofStepCount: teaching[l.id].proofSteps.length,
      notebookRoute: `/practice?proof=${l.id}#proof-notebook`,
      figure: Boolean(figures[l.id]),
      readingAnchors: [
        'intuition',
        'definition',
        'theorem',
        'proof',
        'example',
        ...(l.lab ? ['lab'] : []),
        'practice',
        'boundary',
      ],
      teaching: [
        'intuition',
        'definition',
        'theorem',
        'hypotheses',
        'proof',
        'proof-notes',
        'reasoning-check',
        'example',
        'practice',
        'boundary',
        'source',
      ],
    })),
    views: ['/', '/explore', '/practice', '/studio', '/reference', '/course'],
    paths: Object.fromEntries(
      Object.entries(paths.pathDetails).map(([id, p]) => [id, p.ids]),
    ),
    checkpoints: Object.fromEntries(
      Object.entries(checkpoints.chapterCheckpoints).map(([id, c]) => [
        id,
        c.links,
      ]),
    ),
    prerequisiteClosure: prerequisiteClosure(lessons, paths.pathDetails),
    tools,
    toolEffects: Object.fromEntries(
      tools.map((name) => [
        name,
        {
          prerequisites: [
            'public page loaded',
            'native WebMCP available; otherwise use human controls',
          ],
          reads: [
            'public lesson content or bounded exact inputs or visible study context',
          ],
          writes:
            name.startsWith('set_') || name.startsWith('open_')
              ? ['visible route/study state', 'shareable URL/history']
              : [],
          contractSource:
            'src/webmcp/register.ts; native fetchTools exposes exact schemas',
        },
      ]),
    ),
    figures: Object.keys(figures),
    features,
    retiredFeatures: [
      {
        id: 'progress-export-download',
        replacement: 'progress-export-copy-backup',
        reason:
          'In-app browser download stopped during actual QA; copyable schema1 JSON provides a verifiable transfer path. JSON file import remains compatible.',
      },
    ],
    journeys,
  };
  map.requiredCoverage = [
    ...map.lessons.map((l) => `route:${l.id}`),
    ...map.lessons.map((l) => `proof-notebook-source:${l.id}`),
    ...map.views.map((v) => `view:${v}`),
    ...map.views.flatMap((v) =>
      ['390x844', '768x1024', '1440x900'].map(
        (size) => `view-layout:${v}:${size}`,
      ),
    ),
    ...map.figures.map((id) => `figure:${id}`),
    ...Object.keys(map.checkpoints).map((chapter) => `checkpoint:${chapter}`),
    ...map.lessons.filter((l) => l.lab).map((l) => `lab:${l.id}`),
    ...Object.keys(map.paths).map((p) => `path:${p}`),
    ...tools.map((t) => `tool:${t}`),
    ...features.map((f) => `feature:${f}`),
    ...journeys.map((j) => `journey:${j}`),
    ...map.lessons.flatMap((l) =>
      [
        'claim-recall',
        'hints-answer',
        'marks',
        'reasoning-wrong-correct',
        'proof-notes',
      ].map((action) => `practice:${l.id}:${action}`),
    ),
    ...map.lessons.flatMap((l) =>
      ['390x844', '768x1024', '1440x900'].map(
        (v) => `lesson-layout:${l.id}:${v}`,
      ),
    ),
    ...['320x844', '390x844', '768x1024', '1440x900', '720x900'].map(
      (v) => `viewport:${v}`,
    ),
    'assertion:no-document-overflow',
    'assertion:no-console-network-errors',
    'assertion:no-katex-errors-raw-delimiters',
    'assertion:accessible-control-header-names',
  ];
  map.scopeHash = hash(JSON.stringify(map));
  return map;
}
export function runStage(name, root, runner = spawnSync) {
  if (!Object.hasOwn(catalog, name)) throw new Error(`Unknown command ${name}`);
  if (name === 'public') buildFingerprint(root);
  const [command, args] = catalog[name];
  const startedAt = new Date().toISOString();
  const result = runner(command, args, {
    cwd: root,
    encoding: 'utf8',
    shell: false,
    env: { ...process.env, NUMBERTHEORY_REPO: root },
  });
  return {
    stage: name,
    command: [command, ...args],
    startedAt,
    finishedAt: new Date().toISOString(),
    status: result.status === 0 && !result.error ? 'passed' : 'failed',
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.error?.message ?? result.stderr ?? '',
  };
}
export async function verify(
  root,
  browserPath,
  semanticPath,
  release = false,
  runner = spawnSync,
) {
  const source = fingerprint(root),
    stages = [];
  const boundary = {
    scope: release ? 'release' : 'automated',
    releaseReady: false,
    manualGates: [
      { stage: 'browser', status: 'not-evaluated', requiredFor: 'release' },
      { stage: 'semantic', status: 'not-evaluated', requiredFor: 'release' },
    ],
  };
  let frozenBuild;
  if (release) {
    try {
      frozenBuild = buildFingerprint(root);
    } catch (error) {
      return {
        schemaVersion: 1,
        status: 'failed',
        ...boundary,
        identity: source,
        stages: [
          { stage: 'frozen-build', status: 'failed', error: error.message },
        ],
      };
    }
  }
  const install = runStage('install', root, runner);
  stages.push(install);
  let map;
  try {
    map = await scopeMap(root);
  } catch (error) {
    return {
      schemaVersion: 1,
      status: 'failed',
      scope: release ? 'release' : 'automated',
      releaseReady: false,
      identity: source,
      stages: [
        ...stages,
        { stage: 'scope', status: 'failed', error: error.message },
      ],
    };
  }
  for (const stage of Object.keys(catalog).filter(
    (name) => name !== 'install',
  )) {
    if (release && stage === 'build') {
      stages.push(frozenBuildStage(root, frozenBuild, 'frozen-build'));
      continue;
    }
    let result;
    try {
      result = runStage(stage, root, runner);
    } catch (error) {
      result = { stage, status: 'failed', exitCode: 1, error: error.message };
    }
    stages.push(result);
  }
  let build = frozenBuild ?? {};
  if (!release) {
    try {
      build = buildFingerprint(root);
    } catch (error) {
      stages.push({
        stage: 'build-identity',
        status: 'failed',
        error: error.message,
      });
    }
  }
  const identity = { ...source, ...build, scopeHash: map.scopeHash };
  if (release) {
    for (const [kind, file] of [
      ['browser', browserPath],
      ['semantic', semanticPath],
    ]) {
      try {
        validateEvidence(
          file && JSON.parse(readFileSync(file, 'utf8')),
          identity,
          map,
          kind,
        );
        stages.push({ stage: kind, status: 'passed' });
      } catch (error) {
        stages.push({ stage: kind, status: 'failed', error: error.message });
      }
    }
    boundary.manualGates = stages.filter((s) =>
      ['browser', 'semantic'].includes(s.stage),
    );
  }
  const current = fingerprint(root);
  if (
    current.sourceHash !== source.sourceHash ||
    current.lockHash !== source.lockHash
  )
    stages.push({
      stage: 'source-stability',
      status: 'failed',
      error: 'Source changed during verification.',
    });
  if (release)
    stages.push(frozenBuildStage(root, frozenBuild, 'build-stability'));
  const status = stages.every((s) => s.status === 'passed')
    ? 'passed'
    : 'failed';
  return {
    schemaVersion: 1,
    status,
    ...boundary,
    releaseReady: release && status === 'passed',
    identity,
    map,
    stages,
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const { runCli } = await import('./cli.mjs');
  process.exitCode = await runCli(process.argv.slice(2), {
    fingerprint,
    buildFingerprint,
    scopeMap,
    verify,
  });
}
