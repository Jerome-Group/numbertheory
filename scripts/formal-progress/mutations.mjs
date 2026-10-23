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

const headers = { kind: 'headers', request: 0, status: 200 };
const body = { kind: 'body', request: 0, body: { kind: 'document', owner: 0 } };
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
    originalActions: [{ kind: 'write' }, { kind: 'reload' }, headers],
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
  ...['clear', 'reload'].map((kind) => ({
    name: `conflict-body-ignores-generation-${kind}`,
    before:
      '      const error: unknown = await response.json();\n      if (requestGeneration !== generation) return false;\n',
    after: '      const error: unknown = await response.json();\n',
    actions: [
      { kind: 'write' },
      { kind: 'headers', request: 0, status: 409 },
      { kind },
      { kind: 'body', request: 0, body: { kind: 'conflict' } },
    ],
  })),
  {
    name: 'write-body-ignores-generation',
    before:
      '    const document = parseDocument(await response.json());\n    if (requestGeneration !== generation) return false;\n',
    after: '    const document = parseDocument(await response.json());\n',
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
  const originalBoundary = await compileStore(root, sourceFile);
  for (const control of controls) {
    const originalResult = await replay(
      originalBoundary,
      control.originalActions ?? control.actions,
    );
    const source = replaceOnce(original, control.before, control.after);
    const scratch = join(output, `${control.name}.ts`);
    writeFileSync(scratch, source);
    const createBoundary = await compileStore(root, scratch);
    const result = await replay(createBoundary, control.actions);
    results.push({
      name: control.name,
      caught:
        originalResult.passed &&
        !result.passed &&
        result.property === 'PrivateStateCurrent',
      originalResult,
      originalActions: control.originalActions ?? control.actions,
      actions: control.actions,
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
