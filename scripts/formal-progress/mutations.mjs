import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { compileStore, replay } from './boundary.mjs';

function replaceOnce(source, before, after) {
  assert.equal(
    source.split(before).length,
    2,
    `Mutation anchor changed: ${before}`,
  );
  return source.replace(before, after);
}

const headers = { kind: 'headers', request: 0 };
const body = { kind: 'body', request: 0, owner: 0 };
const controls = [
  {
    name: 'reload-keeps-private-state',
    before: "  publish({ kind: 'loading' }, {});\n",
    after: '',
    actions: [{ kind: 'write' }, { kind: 'reload' }],
  },
  {
    name: 'reload-keeps-old-generation',
    before: '  const requestGeneration = ++generation;\n',
    after: '  const requestGeneration = generation;\n',
    actions: [{ kind: 'write' }, { kind: 'reload' }, headers, body],
  },
  {
    name: 'read-body-ignores-generation',
    before:
      '    const document = parseDocument(await response.json());\n    if (requestGeneration !== generation) return;\n',
    after: '    const document = parseDocument(await response.json());\n',
    actions: [{ kind: 'reload' }, headers, { kind: 'clear' }, body],
  },
  {
    name: 'session-keeps-old-generation',
    before: 'function clearSession() {\n  generation++;',
    after: 'function clearSession() {',
    actions: [{ kind: 'write' }, headers, { kind: 'clear' }, body],
  },
];

export async function checkMutations(
  root,
  output,
  sourceFile = join(root, 'src/progress.ts'),
) {
  const original = readFileSync(sourceFile, 'utf8');
  const results = [];
  mkdirSync(output, { recursive: true });
  for (const control of controls) {
    const source = replaceOnce(original, control.before, control.after);
    const scratch = join(output, `${control.name}.ts`);
    writeFileSync(scratch, source);
    const createBoundary = await compileStore(root, scratch);
    const result = await replay(createBoundary, control.actions);
    results.push({
      name: control.name,
      caught: !result.passed && result.property === 'PrivateStateCurrent',
      sourceSha256: createHash('sha256').update(source).digest('hex'),
      scratch,
      result,
    });
  }
  assert.equal(
    readFileSync(sourceFile, 'utf8'),
    original,
    'Product source changed during mutation controls.',
  );
  return { passed: results.every((result) => result.caught), results };
}
