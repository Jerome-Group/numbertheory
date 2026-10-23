import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fingerprint } from '../verification/verify.mjs';
import { explore } from './explore.mjs';
import { checkMutations } from './mutations.mjs';
import {
  checkModelControl,
  locateVerifier,
  modelCheck,
  verifier,
} from './tlc.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const skill = join(root, '.agents/skills/progress-lifecycle');
const args = process.argv.slice(2);
if (
  args.length &&
  (args.length !== 2 || args[0] !== '--output' || !isAbsolute(args[1]))
) {
  throw new Error(
    'Usage: npm run formal:progress -- [--output /absolute/evidence/path]',
  );
}
const output = args[1]
  ? resolve(args[1])
  : mkdtempSync(join(tmpdir(), 'numbertheory-progress-formal-'));
if (args[1] && existsSync(output))
  throw new Error(
    'Choose a new evidence directory; existing evidence is preserved.',
  );
const within = relative(root, output);
if (!(within === '..' || within.startsWith(`..${sep}`) || isAbsolute(within)))
  throw new Error('Keep formal evidence outside the public checkout.');
mkdirSync(output, { recursive: true });
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const digest = (path) => hash(readFileSync(join(root, path)));

try {
  const coverage = JSON.parse(
    readFileSync(join(skill, 'coverage.json'), 'utf8'),
  );
  const sourceFiles = Object.fromEntries(
    Object.keys(coverage.sourceFiles).map((path) => [path, digest(path)]),
  );
  const drift = Object.keys(sourceFiles).filter(
    (path) => sourceFiles[path] !== coverage.sourceFiles[path],
  );
  const source = {
    ...fingerprint(root),
    syncCommit: coverage.syncCommit,
    sourceFiles,
    drift,
  };
  const jar = await locateVerifier();
  const modelDirectory = join(skill, 'model');
  const model = modelCheck(jar, modelDirectory, join(output, 'model'));
  const modelControl = checkModelControl(
    jar,
    modelDirectory,
    join(output, 'model-control'),
  );
  const replay = await explore(root);
  const mutations = await checkMutations(root, join(output, 'mutations'));
  const finalSource = fingerprint(root);
  const sourceUnchanged =
    finalSource.sourceHash === source.sourceHash &&
    finalSource.lockHash === source.lockHash;
  const result = {
    passed:
      !drift.length &&
      sourceUnchanged &&
      model.passed &&
      modelControl.caught &&
      replay.passed &&
      mutations.passed,
    property: coverage.property,
    source,
    sourceUnchanged,
    verifier,
    modelFiles: Object.fromEntries(
      ['ProgressLifecycle.tla', 'ProgressLifecycle.cfg'].map((name) => [
        name,
        hash(readFileSync(join(modelDirectory, name))),
      ]),
    ),
    model,
    modelControl,
    replay,
    mutations,
  };
  writeFileSync(
    join(output, 'result.json'),
    `${JSON.stringify(result, null, 2)}\n`,
  );
  console.log(
    JSON.stringify(
      {
        passed: result.passed,
        sourceDrift: drift,
        modelDistinctStates: model.distinctStates,
        replayPrefixes: replay.checked,
        mutationControls: mutations.results.map(({ name, caught }) => ({
          name,
          caught,
        })),
        evidence: join(output, 'result.json'),
      },
      null,
      2,
    ),
  );
  process.exitCode = result.passed ? 0 : 1;
} catch (error) {
  writeFileSync(
    join(output, 'error.json'),
    `${JSON.stringify({ passed: false, error: error.stack }, null, 2)}\n`,
  );
  console.error(error.message);
  console.error(`Evidence: ${join(output, 'error.json')}`);
  process.exitCode = 1;
}
