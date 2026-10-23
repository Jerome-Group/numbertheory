import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from 'node:path';

const digest = /^[a-f0-9]{64}$/;
const identityKeys = [
  'commit',
  'sourceHash',
  'lockHash',
  'buildHash',
  'scopeHash',
  'dirty',
];

export function regularBytes(path) {
  assert.equal(
    realpathSync(path),
    resolve(path),
    `Symlink in artifact path ${path}`,
  );
  const stat = lstatSync(path);
  assert(
    stat.isFile() && stat.size > 0,
    `Expected nonempty regular artifact ${path}`,
  );
  return readFileSync(path);
}

export function discoverCaseArtifacts(directory) {
  assert(isAbsolute(directory), 'Case artifact directory must be absolute');
  assert.equal(
    realpathSync(directory),
    resolve(directory),
    'Symlink in case artifact directory',
  );
  const files = readdirSync(directory)
    .sort()
    .map((name) => {
      const file = join(directory, name);
      regularBytes(file);
      return file;
    });
  assert(files.length > 0, 'Case artifact directory is empty');
  return files;
}

function within(root, path) {
  const local = relative(root, path);
  assert(
    local && local !== '..' && !local.startsWith('../') && !isAbsolute(local),
    `Artifact outside its bundle ${path}`,
  );
  return local;
}

export function validateArtifacts(report, directory) {
  assert(
    Array.isArray(report.artifacts) && report.artifacts.length > 0,
    'Report requires artifacts',
  );
  const instances = report.artifacts.filter(
    (artifact) =>
      typeof artifact?.path === 'string' &&
      basename(artifact.path) === 'instance.json',
  );
  assert.equal(
    instances.length,
    1,
    'Report requires exactly one instance artifact',
  );
  const original = dirname(instances[0].path);
  assert(isAbsolute(original), 'Original artifact root must be absolute');
  const artifacts = new Map();
  const destinations = new Set();
  for (const artifact of report.artifacts) {
    assert(
      typeof artifact?.path === 'string' &&
        isAbsolute(artifact.path) &&
        digest.test(artifact.sha256),
      'Invalid artifact path or digest',
    );
    const destination = join(directory, within(original, artifact.path));
    assert(
      !artifacts.has(artifact.path) && !destinations.has(destination),
      'Duplicate artifact path',
    );
    const bytes = regularBytes(destination);
    assert.equal(artifact.bytes, bytes.length, 'Artifact byte count differs');
    assert.equal(
      createHash('sha256').update(bytes).digest('hex'),
      artifact.sha256,
      'Artifact digest differs',
    );
    artifacts.set(artifact.path, destination);
    destinations.add(destination);
  }
  const references = new Set();
  const caseDirectories = new Set();
  for (const record of report.cases) {
    assert(
      Array.isArray(record.artifacts) && record.artifacts.length > 0,
      `Case ${record.id} requires artifacts`,
    );
    assert(
      !record.captureErrors?.length,
      `Case ${record.id} has capture errors`,
    );
    for (const path of record.artifacts) {
      assert(artifacts.has(path), `Case references unknown artifact ${path}`);
      assert(
        !references.has(path),
        `Duplicate case artifact reference ${path}`,
      );
      references.add(path);
    }
    const actions = record.artifacts.filter(
      (path) => basename(path) === 'actions.json',
    );
    assert.equal(actions.length, 1, 'Case requires one actions artifact');
    within(original, dirname(actions[0]));
    const caseDirectory = dirname(artifacts.get(actions[0]));
    assert(!caseDirectories.has(caseDirectory), 'Duplicate case directory');
    caseDirectories.add(caseDirectory);
    const physical = discoverCaseArtifacts(caseDirectory);
    assert.deepEqual(
      record.artifacts.map((path) => artifacts.get(path)).sort(),
      physical,
      `Case artifact inventory differs for ${record.id}`,
    );
    assert.deepEqual(
      [...artifacts.values()]
        .filter((path) => dirname(path) === caseDirectory)
        .sort(),
      physical,
      `Global artifact inventory differs for ${record.id}`,
    );
  }
  return {
    instance: JSON.parse(regularBytes(artifacts.get(instances[0].path))),
    artifacts,
  };
}

export function validateStoppedRuntime(report, instance, label) {
  assert.equal(
    report.cleanup?.status,
    'stopped',
    `${label} cleanup did not stop`,
  );
  assert.deepEqual(
    report.cleanup.listenerPids,
    [],
    `${label} listener remains`,
  );
  assert(
    instance.schemaVersion === 1 &&
      instance.runtime === 'vinext-worker-d1' &&
      instance.status === 'stopped',
    'Expected stopped Worker instance',
  );
  for (const key of identityKeys)
    assert.equal(
      instance.identity?.[key],
      report.identity[key],
      `Instance ${key} differs`,
    );
  assert.deepEqual(
    instance.processes,
    report.cleanup.processes,
    'Cleanup process ownership differs',
  );
  assert(
    Array.isArray(instance.processes) && instance.processes.length > 0,
    'Missing owned process receipt',
  );
}
