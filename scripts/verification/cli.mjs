import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { constants } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = { value: 'DIR', required: true };
const channel = { value: 'CHANNEL', choices: ['chrome'] };
const profile = { value: 'PROFILE', choices: ['phone', 'tablet', 'desktop'] };
const repository = [{ name: 'REPO', required: false }];
const automatedWrites = [
  'node_modules via npm ci',
  'npm cache',
  'dist via npm run build:bundle',
  'temporary test fixtures',
  'stdout',
];
const browserPrerequisites = [
  'Node24',
  'POSIX with ps and lsof on PATH',
  'installed locked dependencies and Playwright browser',
  'current built application',
  'skill-owned browser helper',
];
const browserWrites = [
  'owned loopback server and browser processes',
  'output directory with retained reports and artifacts',
  'stdout',
  'stderr diagnostics',
];

export const commands = Object.freeze({
  help: {
    aliases: ['--help'],
    positionals: [{ name: 'COMMAND', required: false }],
    options: {},
    prerequisites: [],
    reads: [],
    writes: ['stdout'],
    purpose: 'Discover command syntax, effects, and boundaries.',
    execute: ({ positionals }) => describe(positionals[0]),
  },
  catalog: {
    positionals: [],
    options: {},
    prerequisites: [],
    reads: [],
    writes: ['stdout'],
    purpose: 'Machine-readable command catalog without repository reads.',
    execute: () => describe(),
  },
  map: {
    positionals: repository,
    options: {},
    prerequisites: ['Node24', 'installed locked repo dependencies'],
    reads: ['repo source', 'lesson-inventory.json'],
    writes: ['stdout'],
    purpose: 'Exhaustive content, routes, interaction and prerequisite map.',
    execute: ({ positionals, api }) => api.scopeMap(checkout(positionals[0])),
  },
  fingerprint: {
    positionals: repository,
    options: {},
    prerequisites: [
      'Node24',
      'Git',
      'installed locked dependencies',
      'dist/index.html',
    ],
    reads: ['tracked and nonignored source', 'lockfile', 'dist', 'scope'],
    writes: ['stdout'],
    purpose: 'Exact source/build/scope identity.',
    execute: ({ positionals, api }) => identity(checkout(positionals[0]), api),
  },
  verify: {
    positionals: repository,
    options: {},
    prerequisites: ['Node24/npm on PATH', 'Git', 'registry access for npm ci'],
    reads: ['repo source', 'node_modules'],
    writes: automatedWrites,
    purpose: 'All automated gates only; no release or manual-pass claim.',
    execute: ({ positionals, api }) => api.verify(checkout(positionals[0])),
  },
  'verify:release': {
    positionals: [
      { name: 'REPO', required: true },
      { name: 'BROWSER_JSON', required: true },
      { name: 'SEMANTIC_JSON', required: true },
    ],
    options: {},
    prerequisites: [
      'verify prerequisites',
      'actual current CUA browser evidence',
      'independent semantic evidence',
    ],
    reads: ['repo source', 'node_modules', 'evidence JSON and artifact files'],
    writes: automatedWrites,
    purpose:
      'Automated checks plus exact fresh manual evidence; no deployment.',
    execute: ({ positionals, api }) =>
      api.verify(
        checkout(positionals[0]),
        positionals[1],
        positionals[2],
        true,
      ),
  },
  doctor: {
    positionals: [],
    options: { output: { value: 'DIR' } },
    prerequisites: ['Node24; missing prerequisites are reported'],
    reads: [
      'repo prerequisites',
      'build',
      'browser executable availability',
      'optional existing output ownership receipt',
    ],
    writes: ['stdout', 'stderr diagnostics'],
    purpose:
      'Read-only prerequisite checks; browser presence does not prove launch.',
    execute: ({ options, api }) =>
      options.output ? driveHelper(options, ['--doctor']) : doctor(api),
  },
  launch: {
    positionals: [],
    options: { output },
    prerequisites: [
      'Node24',
      'POSIX with ps and lsof on PATH',
      'installed locked dependencies',
      'current built application',
      'skill-owned browser helper',
    ],
    reads: ['built application', 'repo identity', 'browser helper'],
    writes: [
      'owned loopback server',
      'output directory and receipts',
      'stdout',
      'stderr diagnostics',
    ],
    purpose:
      'Foreground owned application launch; no browser or release proof.',
    execute: ({ options }) => driveHelper(options, ['--launch-only']),
  },
  drive: {
    positionals: [],
    options: {
      feature: {
        value: 'FEATURE',
        required: true,
        choices: ['all', 'discovery', 'teaching', 'practice', 'labs', 'urls'],
      },
      output,
      profile,
      channel,
    },
    prerequisites: browserPrerequisites,
    reads: [
      'built application',
      'repo identity',
      'source-derived coverage',
      'browser helper',
    ],
    writes: browserWrites,
    purpose:
      'Scoped Playwright automation; no native, semantic, release, or deployment claim.',
    execute: ({ options }) =>
      driveHelper(options, ['--feature', options.feature]),
  },
  evidence: {
    positionals: [],
    options: { output },
    prerequisites: [
      'current source/build/scope identity',
      'existing output/report.json',
    ],
    reads: ['current repo identity', 'Playwright report', 'artifact bytes'],
    writes: ['stdout', 'stderr diagnostics'],
    purpose:
      'Validate scoped Playwright report integrity; no new observation or release proof.',
    execute: ({ options, api }) => evidence(resolve(options.output), api),
  },
  cleanup: {
    positionals: [],
    options: { output },
    prerequisites: [
      'existing output directory and ownership receipt',
      'skill-owned browser helper',
    ],
    reads: ['output ownership receipt', 'live process ownership'],
    writes: [
      'stop only verified owned processes',
      'cleanup receipt',
      'stdout',
      'stderr diagnostics',
    ],
    purpose:
      'Receipt-checked cleanup that retains artifacts and refuses uncertain ownership.',
    execute: ({ options }) => driveHelper(options, ['--cleanup']),
  },
});

class UsageError extends Error {}

function syntax(name, command) {
  return [
    name,
    ...command.positionals.map(({ name, required }) =>
      required ? name : `[${name}]`,
    ),
    ...Object.entries(command.options).map(([flag, spec]) => {
      const item = `--${flag} ${spec.choices?.join('|') ?? spec.value}`;
      return spec.required ? item : `[${item}]`;
    }),
  ].join(' ');
}

function describe(name) {
  if (name && !Object.hasOwn(commands, name))
    throw new UsageError(`Unknown command ${name}.`);
  return {
    schemaVersion: 1,
    status: 'passed',
    usage: 'node scripts/verification/verify.mjs COMMAND [ARGS]',
    commands: Object.fromEntries(
      (name ? [name] : Object.keys(commands)).map((key) => {
        const { execute, ...metadata } = commands[key];
        return [key, { syntax: syntax(key, metadata), ...metadata }];
      }),
    ),
  };
}

function parse(args) {
  let [name = 'help', ...tokens] = args;
  name =
    Object.keys(commands).find(
      (key) => key === name || commands[key].aliases?.includes(name),
    ) ?? name;
  if (!Object.hasOwn(commands, name))
    throw new UsageError(`Unknown command ${name}.`);
  const command = commands[name],
    options = {},
    positionals = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token) throw new UsageError('Arguments must be nonempty.');
    if (!token.startsWith('-')) {
      positionals.push(token);
      continue;
    }
    const flag = token.slice(2),
      spec = command.options[flag];
    if (!token.startsWith('--') || !Object.hasOwn(command.options, flag))
      throw new UsageError(`Unknown option ${token} for ${name}.`);
    if (Object.hasOwn(options, flag))
      throw new UsageError(`Duplicate option ${token}.`);
    const value = tokens[++i];
    if (!value || value.startsWith('-'))
      throw new UsageError(`Missing value for ${token}.`);
    if (spec.choices && !spec.choices.includes(value))
      throw new UsageError(
        `Invalid ${token}; expected ${spec.choices.join('|')}.`,
      );
    options[flag] = value;
  }
  if (
    positionals.length < command.positionals.filter((p) => p.required).length ||
    positionals.length > command.positionals.length
  )
    throw new UsageError(`Expected ${syntax(name, command)}.`);
  for (const [flag, spec] of Object.entries(command.options))
    if (spec.required && !Object.hasOwn(options, flag))
      throw new UsageError(`Missing required --${flag}.`);
  return { command, positionals, options };
}

function checkout(explicit) {
  const current = realpathSync(root);
  if (explicit && realpathSync(resolve(explicit)) !== current)
    throw new UsageError('REPO must identify this CLI checkout.');
  return current;
}

async function identity(
  selectedRoot,
  { fingerprint, buildFingerprint, scopeMap },
) {
  return {
    ...fingerprint(selectedRoot),
    ...buildFingerprint(selectedRoot),
    scopeHash: (await scopeMap(selectedRoot)).scopeHash,
  };
}

function existingDirectory(path) {
  if (!lstatSync(path).isDirectory())
    throw new Error(
      `Output must be an existing non-symlink directory: ${path}`,
    );
  return path;
}

async function driveHelper(options, mode) {
  const selectedRoot = checkout();
  const helper = join(selectedRoot, '.agents/skills/verify/scripts/drive.mjs');
  if (!lstatSync(helper).isFile())
    throw new Error('Missing regular skill-owned browser helper.');
  const destination = resolve(options.output);
  if (['--doctor', '--cleanup'].includes(mode[0]))
    existingDirectory(destination);
  const args = [helper, ...mode, '--output', destination];
  if (options.channel) args.push('--channel', options.channel);
  if (options.profile) args.push('--profile', options.profile);
  return new Promise((fulfill, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: selectedRoot,
      shell: false,
      stdio: 'inherit',
    });
    const forward = (signal) => child.kill(signal);
    const signals = ['SIGINT', 'SIGTERM'];
    const listeners = signals.map((signal) => () => forward(signal));
    const remove = () => {
      signals.forEach((signal, i) => {
        process.removeListener(signal, listeners[i]);
      });
    };
    signals.forEach((signal, i) => {
      process.on(signal, listeners[i]);
    });
    child.once('error', (error) => {
      remove();
      reject(error);
    });
    child.once('close', (code, signal) => {
      remove();
      fulfill(code ?? 128 + (constants.signals[signal] ?? 1));
    });
  });
}

function doctor({ buildFingerprint }) {
  const selectedRoot = checkout(),
    checks = [];
  const check = (name, inspect) => {
    try {
      checks.push({ name, status: 'passed', detail: inspect() });
    } catch (error) {
      checks.push({ name, status: 'missing', detail: error.message });
    }
  };
  const executable = (name, args) => {
    const result = spawnSync(name, args, {
      cwd: selectedRoot,
      encoding: 'utf8',
      shell: false,
      env: { ...process.env, npm_config_update_notifier: 'false' },
    });
    if (result.error || result.status !== 0)
      throw new Error(
        result.error?.message || result.stderr.trim() || `${name} unavailable`,
      );
    return result.stdout.trim();
  };
  check('node', () => {
    if (Number(process.versions.node.split('.')[0]) < 24)
      throw new Error('Node24 or newer required.');
    return process.version;
  });
  check('npm', () => executable('npm', ['--version']));
  check('process ownership tools', () => {
    if (process.platform === 'win32')
      throw new Error('POSIX process groups required.');
    executable('ps', ['-p', String(process.pid), '-o', 'pid=']);
    executable('lsof', ['-v']);
    return 'POSIX, ps and lsof available.';
  });
  check('git', () => {
    const location = executable('git', ['rev-parse', '--show-toplevel']);
    if (realpathSync(location) !== selectedRoot)
      throw new Error('CLI source is not the checkout root.');
    return location;
  });
  check('locked dependencies', () => {
    const pkg = JSON.parse(
      readFileSync(join(selectedRoot, 'package.json'), 'utf8'),
    );
    const lock = JSON.parse(
      readFileSync(join(selectedRoot, 'package-lock.json'), 'utf8'),
    );
    for (const name of Object.keys({
      ...pkg.dependencies,
      ...pkg.devDependencies,
    })) {
      const installed = JSON.parse(
        readFileSync(
          join(selectedRoot, 'node_modules', name, 'package.json'),
          'utf8',
        ),
      );
      if (installed.version !== lock.packages[`node_modules/${name}`]?.version)
        throw new Error(`Installed ${name} differs from package-lock.json.`);
    }
    return 'Declared dependencies match locked versions.';
  });
  check('browser helper', () => {
    const helper = join(
      selectedRoot,
      '.agents/skills/verify/scripts/drive.mjs',
    );
    if (!lstatSync(helper).isFile())
      throw new Error('Missing regular browser helper.');
    return helper;
  });
  check('playwright chromium', () => {
    const require = createRequire(join(selectedRoot, 'package.json'));
    const entry = require.resolve('playwright');
    if (!entry.startsWith(join(selectedRoot, 'node_modules/')))
      throw new Error('Install locked Playwright in this checkout.');
    const executable = require('playwright').chromium.executablePath();
    if (!lstatSync(executable).isFile())
      throw new Error('Missing Playwright Chromium executable.');
    return executable;
  });
  check('build', () => buildFingerprint(selectedRoot));
  const missing = checks
    .filter((check) => check.status === 'missing')
    .map((check) => check.name);
  return {
    schemaVersion: 1,
    status: missing.length ? 'failed' : 'passed',
    scope: 'prerequisites',
    repo: selectedRoot,
    releaseReady: false,
    browserLaunch: 'not-evaluated',
    checks,
    missing,
  };
}

function regularFile(path) {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.size === 0)
    throw new Error(`Expected nonempty regular file: ${path}`);
  if (realpathSync(path) !== resolve(path))
    throw new Error(`File path contains a symlink: ${path}`);
  return readFileSync(path);
}

async function evidence(destination, api) {
  existingDirectory(destination);
  const path = join(destination, 'report.json');
  const report = JSON.parse(regularFile(path));
  if (
    report.schemaVersion !== 1 ||
    report.status !== 'passed' ||
    report.lane !== 'playwright'
  )
    throw new Error(
      'Expected a passed schema1 Playwright report; other proof lanes are not accepted.',
    );
  const current = await identity(checkout(), api);
  for (const key of ['sourceHash', 'lockHash', 'buildHash', 'scopeHash'])
    if (report.identity?.[key] !== current[key])
      throw new Error(`Stale Playwright ${key}.`);
  if (!Array.isArray(report.artifacts) || !report.artifacts.length)
    throw new Error('Report requires artifacts.');
  const paths = new Set();
  for (const artifact of report.artifacts) {
    if (
      !artifact ||
      typeof artifact.path !== 'string' ||
      !isAbsolute(artifact.path) ||
      typeof artifact.sha256 !== 'string' ||
      !/^[a-f0-9]{64}$/.test(artifact.sha256) ||
      paths.has(artifact.path)
    )
      throw new Error('Invalid or duplicate artifact path/digest.');
    const within = relative(destination, artifact.path);
    if (within === '..' || within.startsWith('../') || isAbsolute(within))
      throw new Error('Artifact is outside selected output.');
    const actual = createHash('sha256')
      .update(regularFile(artifact.path))
      .digest('hex');
    if (actual !== artifact.sha256)
      throw new Error(`Stale artifact digest: ${artifact.path}`);
    paths.add(artifact.path);
  }
  return {
    schemaVersion: 1,
    status: 'passed',
    scope: 'playwright-artifact-integrity',
    lane: 'playwright',
    releaseReady: false,
    report: path,
    identity: current,
    artifacts: report.artifacts,
    unevaluated: [
      'manual browser observations',
      'native WebMCP',
      'semantic review',
      'release readiness',
      'deployment',
    ],
  };
}

export async function runCli(args, api) {
  try {
    const input = parse(args);
    const result = await input.command.execute({ ...input, api });
    if (typeof result === 'number') return result;
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return result.status === 'failed' ? 1 : 0;
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.stdout.write(
      `${JSON.stringify({ schemaVersion: 1, status: 'failed', code: error instanceof UsageError ? 'usage' : 'execution', error: error.message })}\n`,
    );
    return error instanceof UsageError ? 2 : 1;
  }
}
