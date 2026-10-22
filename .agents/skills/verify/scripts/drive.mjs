#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  mkdir,
  readdir,
  readFile,
  realpath,
  stat,
  writeFile,
} from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planPractice } from '../../../../scripts/verification/practice-partitions.mjs';
import { loadRepositoryModule } from '../../../../scripts/verification/repo-loader.mjs';
import {
  parseShard,
  planTeaching,
  teachingShardAlgorithm,
} from '../../../../scripts/verification/teaching-shards.mjs';
import {
  buildFingerprint,
  fingerprint,
  scopeMap,
} from '../../../../scripts/verification/verify.mjs';
import { profiles } from './browser.mjs';
import { discovery } from './discovery.mjs';
import { labs } from './labs.mjs';
import { practice } from './practice.mjs';
import {
  cleanup,
  doctor,
  hash,
  launch,
  registerBrowser,
  runtimePrerequisites,
  save,
} from './runtime.mjs';
import { teaching } from './teaching.mjs';
import { urls } from './urls.mjs';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const features = { discovery, teaching, practice, labs, urls };
const usage =
  'node .agents/skills/verify/scripts/drive.mjs (--feature all|discovery|teaching|practice|labs|urls|--launch-only|--doctor|--cleanup) --output /absolute/directory; --feature also accepts [--profile phone|tablet|desktop] [--channel chrome]; teaching or practice with explicit profile accepts [--shard I/N]';

function parse(argv) {
  if (argv.length === 1 && argv[0] === '--help') return { help: true };
  const options = {};
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    assert(
      [
        '--feature',
        '--output',
        '--channel',
        '--profile',
        '--shard',
        '--launch-only',
        '--doctor',
        '--cleanup',
      ].includes(argument),
      `Unknown argument ${argument}`,
    );
    const key = argument.slice(2);
    assert(!Object.hasOwn(options, key), `Duplicate argument ${argument}`);
    if (['launch-only', 'doctor', 'cleanup'].includes(key)) options[key] = true;
    else {
      const value = argv[++index];
      assert(value && !value.startsWith('--'), `Missing value for ${argument}`);
      options[key] = value;
    }
  }
  assert.equal(
    ['feature', 'launch-only', 'doctor', 'cleanup'].filter(
      (key) => options[key],
    ).length,
    1,
    'Choose exactly one mode',
  );
  assert(
    options.output && isAbsolute(options.output),
    'Output must be an absolute directory',
  );
  if (options.feature)
    assert(
      options.feature === 'all' || Object.hasOwn(features, options.feature),
      'Unknown feature',
    );
  if (options.profile) {
    assert(options.feature, 'Profile applies only to a feature drive');
    assert(Object.hasOwn(profiles, options.profile), 'Unknown profile');
  }
  if (options.channel)
    assert.equal(
      options.channel,
      'chrome',
      'Only explicit chrome channel is supported',
    );
  if (!options.feature)
    assert(!options.channel, 'Channel applies only to a feature drive');
  return { ...options, shard: parseShard(options) };
}

async function freshOutput(output) {
  const parent = await realpath(resolve(output, '..'));
  const resolved = join(
    parent,
    relative(resolve(output, '..'), resolve(output)),
  );
  const inside = relative(await realpath(root), resolved);
  assert(
    inside.startsWith(`..${sep}`) || isAbsolute(inside),
    'Evidence must be outside the public repository',
  );
  await mkdir(resolved);
  return resolved;
}

async function installedPackages() {
  const lock = JSON.parse(
    await readFile(join(root, 'package-lock.json'), 'utf8'),
  );
  const mismatches = [];
  let checked = 0;
  for (const [path, entry] of Object.entries(lock.packages)) {
    if (!path || !entry.version) continue;
    try {
      const installed = JSON.parse(
        await readFile(join(root, path, 'package.json'), 'utf8'),
      );
      checked++;
      if (installed.version !== entry.version)
        mismatches.push({
          path,
          expected: entry.version,
          actual: installed.version,
        });
    } catch (error) {
      if (!entry.optional) throw error;
    }
  }
  assert.deepEqual(
    mismatches,
    [],
    'Installed dependencies differ from the lock; run npm ci',
  );
  return {
    playwright: JSON.parse(
      await readFile(
        join(root, 'node_modules/playwright/package.json'),
        'utf8',
      ),
    ).version,
    playwrightLockVersion:
      lock.packages['node_modules/playwright']?.version ?? null,
    lockedPackagesChecked: checked,
  };
}

function coverageReport(map, cases) {
  return map.requiredCoverage.map((id) => {
    const matching = cases.filter((item) => item.coverage.includes(id));
    return {
      id,
      status: matching.length
        ? matching.every((item) => item.status === 'passed')
          ? 'passed'
          : 'failed'
        : 'not-evaluated',
      cases: matching.map((item) => `${item.profile}/${item.id}`),
      ...(!matching.length
        ? {
            reason:
              id.startsWith('tool:') || /webmcp-(native|abort|stale)/.test(id)
                ? 'Native IAB WebMCP prerequisite; use features/urls.md'
                : 'No complete automated proof for this obligation; consult maintained feature map and independent browser review',
          }
        : {}),
    };
  });
}

async function main() {
  const options = parse(process.argv.slice(2));
  if (options.help)
    return {
      usage,
      effects: {
        launch:
          'owns fresh built Worker and local D1 migration groups; does not launch a browser',
        doctor:
          'read-only receipt, process, source, lock, build and served asset checks',
        drive: 'fresh browser contexts; no inherited instance',
        evidence:
          'writes a fresh external directory including disposable local D1',
        cleanup:
          'signals only verified owned process groups; retains all artifacts',
      },
    };
  if (options.doctor) return doctor(options.output);
  if (options.cleanup) return cleanup(options.output);
  const lessonIds =
    options.shard && options.feature === 'teaching'
      ? JSON.parse(await readFile(join(root, 'src/content/order.json'), 'utf8'))
      : null;
  const teachingCases = lessonIds
    ? planTeaching(lessonIds, options.shard).map((item) => item.id)
    : null;
  const map = await scopeMap(root);
  const practicePlans =
    options.feature === 'practice'
      ? Object.fromEntries(
          (options.profile ? [options.profile] : Object.keys(profiles)).map(
            (profile) => [
              profile,
              planPractice(map.lessons, profile, options.shard),
            ],
          ),
        )
      : undefined;
  const prerequisites = runtimePrerequisites();
  const packages = await installedPackages();
  assert.equal(
    packages.playwright,
    '1.64.1',
    'Install locked playwright 1.64.1 explicitly',
  );
  const { chromium } = await import('playwright');
  if (options.feature && !options.channel)
    await stat(chromium.executablePath());
  await stat(join(root, 'dist/server/wrangler.json'));
  await stat(join(root, 'dist/server/index.js'));
  const identity = {
    ...fingerprint(root),
    ...buildFingerprint(root),
    scopeHash: map.scopeHash,
  };
  const data = {
    map,
    ...(await loadRepositoryModule(root, 'src/content/lessons.ts')),
    ...(await loadRepositoryModule(root, 'src/content/paths.ts')),
    ...(await loadRepositoryModule(root, 'src/content/checkpoints.ts')),
    teaching: JSON.parse(
      await readFile(join(root, 'src/content/teaching.json'), 'utf8'),
    ),
    experiences: JSON.parse(
      await readFile(join(root, 'src/content/experiences.json'), 'utf8'),
    ),
  };
  if (lessonIds)
    assert.deepEqual(
      data.map.lessons.map((lesson) => lesson.id),
      lessonIds,
      'Teaching map differs from source order',
    );
  const output = await freshOutput(options.output);
  const report = {
    schemaVersion: 1,
    status: 'running',
    lane: 'playwright',
    proofLane: 'local-playwright-built-worker-d1',
    releaseReady: false,
    identity,
    packages,
    prerequisites,
    requested: options.feature ?? 'launch-only',
    profiles: options.profile
      ? { [options.profile]: profiles[options.profile] }
      : profiles,
    cases: [],
    ...(practicePlans ? { practicePlans } : {}),
    ...(teachingCases
      ? {
          shard: {
            ...options.shard,
            algorithm: teachingShardAlgorithm,
            expectedCaseIds: teachingCases,
          },
        }
      : {}),
    nativeWebMCP: {
      status: 'not-evaluated',
      reason:
        'Requires native IAB tool discovery; Playwright does not establish native or production proof',
    },
    semanticReview: { status: 'not-evaluated' },
    production: { status: 'not-evaluated' },
    hostedAuthentication: {
      status: 'not-evaluated',
      reason:
        'Built local Wrangler has no Sites authentication dispatcher; invented identity headers are local fixtures only',
    },
    startedAt: new Date().toISOString(),
  };
  await save(join(output, 'report.json'), report);
  let runtime;
  let browserServer;
  let browser;
  let interrupted;
  const featureCases = new Map();
  const abort = new AbortController();
  const signal = (name) => {
    interrupted = name;
    abort.abort();
    void browser?.close().catch(() => {});
  };
  const onInt = () => signal('SIGINT');
  const onTerm = () => signal('SIGTERM');
  const onHup = () => signal('SIGHUP');
  process.on('SIGINT', onInt);
  process.on('SIGTERM', onTerm);
  process.on('SIGHUP', onHup);
  try {
    runtime = await launch(root, output, identity, abort.signal);
    report.doctor = await doctor(output);
    if (options['launch-only']) {
      process.stdout.write(
        `${JSON.stringify({ ...report.doctor, status: 'ready', output })}\n`,
      );
      await new Promise((resolve) => {
        if (abort.signal.aborted) resolve();
        else abort.signal.addEventListener('abort', resolve, { once: true });
      });
    } else {
      browserServer = await chromium.launchServer({
        headless: true,
        ...(options.channel ? { channel: options.channel } : {}),
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false,
      });
      await registerBrowser(runtime, browserServer);
      browser = await chromium.connect(browserServer.wsEndpoint());
      report.browser = {
        family: 'Chromium',
        version: browser.version(),
        channel: options.channel ?? 'playwright-chromium',
        executable: browserServer.process().spawnfile,
        arguments: browserServer.process().spawnargs.slice(1),
        nativeIAB: false,
      };
      const suite = {
        browser,
        profiles: options.profile ? [options.profile] : Object.keys(profiles),
        origin: runtime.instance.origin,
        output,
        data,
        report,
        signal: abort.signal,
        ...(practicePlans ? { practicePlans } : {}),
        ...(teachingCases ? { teachingCaseIds: new Set(teachingCases) } : {}),
      };
      for (const [name, drive] of Object.entries(features)) {
        if (interrupted) break;
        if (options.feature === 'all' || options.feature === name) {
          const firstCase = report.cases.length;
          try {
            await drive(suite);
          } finally {
            featureCases.set(name, report.cases.slice(firstCase));
          }
        }
      }
    }
    assert.equal(
      fingerprint(root).sourceHash,
      identity.sourceHash,
      'Source changed during verification',
    );
    assert.equal(
      buildFingerprint(root).buildHash,
      identity.buildHash,
      'Build changed during verification',
    );
    report.status = interrupted
      ? 'interrupted'
      : report.cases.every((item) => item.status === 'passed')
        ? 'passed'
        : 'failed';
  } catch (error) {
    report.status = interrupted ? 'interrupted' : 'failed';
    report.error = error.stack ?? String(error);
    if (error.cleanup) report.cleanup = error.cleanup;
    process.stderr.write(`${error.message}\n`);
  } finally {
    try {
      await browser?.close();
    } catch {}
    try {
      await browserServer?.close();
    } catch {}
    if (runtime) {
      try {
        report.cleanup = await cleanup(output, true);
      } catch (error) {
        report.cleanup = { status: 'failed', error: error.stack };
        report.status = 'failed';
      }
      await writeFile(
        join(output, 'server.log'),
        Buffer.concat(runtime.chunks),
      );
    }
    report.coverage = coverageReport(map, report.cases);
    report.features = Object.keys(features)
      .filter((name) => options.feature === 'all' || options.feature === name)
      .map((name) => {
        const records = featureCases.get(name) ?? [];
        return {
          feature: name,
          status: !records.length
            ? 'not-evaluated'
            : records.some((item) => item.status === 'failed')
              ? 'failed'
              : interrupted
                ? 'interrupted'
                : 'passed',
          cases: records.length,
        };
      });
    const featureTotal = report.features.reduce(
      (total, feature) => total + feature.cases,
      0,
    );
    if (featureTotal !== report.cases.length) {
      report.status = 'failed';
      report.error = [
        report.error,
        `Feature summaries account for ${featureTotal} of ${report.cases.length} observed cases`,
      ]
        .filter(Boolean)
        .join('\n');
    }
    report.finishedAt = new Date().toISOString();
    report.interruptedBy = interrupted ?? null;
    report.artifacts = [];
    for (const file of [
      ...report.cases.flatMap((item) => item.artifacts),
      ...(await readdir(output))
        .filter((name) => name === 'instance.json' || name.endsWith('.log'))
        .map((name) => join(output, name)),
    ]) {
      const bytes = await readFile(file);
      report.artifacts.push({
        path: file,
        bytes: bytes.length,
        sha256: hash(bytes),
      });
    }
    await save(join(output, 'report.json'), report);
    assert(
      (await stat(join(output, 'report.json'))).size > 0,
      'Evidence missing after cleanup',
    );
    process.off('SIGINT', onInt);
    process.off('SIGTERM', onTerm);
    process.off('SIGHUP', onHup);
  }
  process.exitCode =
    report.status === 'passed'
      ? 0
      : interrupted === 'SIGINT'
        ? 130
        : interrupted === 'SIGTERM'
          ? 143
          : 1;
  return { ...report, output };
}

try {
  const result = await main();
  process.stdout.write(`${JSON.stringify(result)}\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n${usage}\n`);
  process.stdout.write(
    `${JSON.stringify({ schemaVersion: 1, status: 'failed', error: error.message })}\n`,
  );
  process.exitCode = 2;
}
