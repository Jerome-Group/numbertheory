import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { loadRepositoryModule } from './repo-loader.mjs';

const root = resolve(process.env.NUMBERTHEORY_REPO ?? process.cwd());
const { sourceFor, reduceNotebook, exportNotebook } =
  await loadRepositoryModule(root, 'src/proof-notebook.ts');
const { lessons } = await loadRepositoryModule(root, 'src/content/lessons.ts');
const teaching = JSON.parse(
  readFileSync(join(root, 'src/content/teaching.json'), 'utf8'),
);

test('all 83 notebook sources retain exact claims, conditions, definitions, proof and annotations', () => {
  assert.equal(lessons.length, 83);
  for (const lesson of lessons) {
    const source = sourceFor(lesson.id);
    assert.equal(source.id, lesson.id);
    assert.equal(source.title, lesson.title);
    assert.equal(source.chapter, lesson.cluster);
    assert.equal(source.claimId, `${lesson.id}.claim`);
    assert.equal(source.claim, lesson.theorem);
    assert.deepEqual(source.conditions, teaching[lesson.id].hypotheses);
    assert.deepEqual(source.definitions, lesson.definition);
    assert.equal(source.strategy, teaching[lesson.id].strategy);
    assert.deepEqual(
      source.proof,
      lesson.proof.map((text, index) => ({
        text,
        ...teaching[lesson.id].proofSteps[index],
      })),
    );
    assert.equal(source.boundary, lesson.caution);
    assert.equal(source.sourceNote, lesson.sourceNote);
    assert.match(
      source.canonicalPath,
      new RegExp(`^/lessons/${lesson.id.toLowerCase()}-`),
    );
  }
  for (const id of ['', 'Z99', 'p00', '__proto__'])
    assert.equal(sourceFor(id), null);
});

test('comparison accepts empty or whitespace text and repeated comparison preserves the capture', () => {
  for (const text of ['', ' \n\t ', 'An alternative valid argument.']) {
    const writing = reduceNotebook(undefined, { kind: 'write', text });
    const compared = reduceNotebook(writing, { kind: 'compare' });
    assert.equal(compared.kind, 'comparing');
    assert.equal(compared.capture.text, text);
    assert.equal(compared.capture.reflection, '');
    assert.equal(reduceNotebook(compared, { kind: 'compare' }), compared);
    assert.equal(
      reduceNotebook(compared, { kind: 'write', text: 'Overwrite original' }),
      compared,
    );
    assert.equal(writing.text, text);
  }
});

test('reflection, revision and a new blank attempt preserve every original and reflection', () => {
  const original = '  Suppose n > 0.\nUse a different route.\n';
  const first = reduceNotebook(
    reduceNotebook(undefined, { kind: 'write', text: original }),
    { kind: 'compare' },
  );
  const reflected = reduceNotebook(first, {
    kind: 'reflect',
    text: 'Need to justify the implication.\n',
  });
  assert.equal(first.capture.reflection, '');
  assert.throws(() => {
    reflected.capture.text = 'Changed';
  }, TypeError);
  const revision = reduceNotebook(reflected, { kind: 'revise' });
  assert.equal(revision.kind, 'writing');
  assert.equal(revision.text, original);
  assert.deepEqual(revision.history, [
    { text: original, reflection: 'Need to justify the implication.\n' },
  ]);
  const edited = reduceNotebook(revision, {
    kind: 'write',
    text: 'Revised proof',
  });
  const second = reduceNotebook(edited, { kind: 'compare' });
  const blank = reduceNotebook(second, { kind: 'new' });
  assert.equal(blank.kind, 'writing');
  assert.equal(blank.text, '');
  assert.deepEqual(blank.history, [
    { text: original, reflection: 'Need to justify the implication.\n' },
    { text: 'Revised proof', reflection: '' },
  ]);
  assert.equal(first.capture.text, original);
  assert.deepEqual(reduceNotebook(blank, { kind: 'reset' }), {
    kind: 'writing',
    text: '',
    history: [],
  });
  assert.equal(blank.history.length, 2);
});

test('Markdown retains exact user text, history, reflection and canonical source provenance', () => {
  const text =
    '<script>alert("text only")</script>\n```\n\\(a \\mid b\\)\n😀\n\n';
  const reflection = ' Keep  spaces.\r\n````\r\n';
  const first = reduceNotebook(
    reduceNotebook(reduceNotebook(undefined, { kind: 'write', text }), {
      kind: 'compare',
    }),
    { kind: 'reflect', text: reflection },
  );
  const source = sourceFor('D01');
  const compared = exportNotebook({ source, notebook: first });
  assert(compared.includes(`\n\n\`\`\`\`text\n${text}\`\`\`\`\n\n`));
  assert(compared.includes(`\n\n\`\`\`\`\`text\n${reflection}\`\`\`\`\`\n\n`));
  assert(
    compared.includes(`Canonical lesson locator: ${source.canonicalPath}`),
  );
  assert(compared.includes(source.sourceNote));
  assert(compared.includes(`Claim ${source.claimId}.`));
  assert(!compared.includes('Current draft (not compared)'));
  const revision = reduceNotebook(reduceNotebook(first, { kind: 'revise' }), {
    kind: 'write',
    text: 'Current draft\n',
  });
  const markdown = exportNotebook({ source, notebook: revision });
  assert(markdown.includes(text));
  assert(markdown.includes(reflection));
  assert(
    markdown.includes(
      '## Current draft (not compared)\n\n```text\nCurrent draft\n```',
    ),
  );
  assert.equal((markdown.match(/## Captured attempt /g) ?? []).length, 1);
  assert.equal(exportNotebook({ source, notebook: revision }), markdown);
});

test('exports contain the exact authored source for every lesson and leave notebook text unchanged', () => {
  const notebook = reduceNotebook(undefined, {
    kind: 'write',
    text: 'My proof.\n',
  });
  for (const lesson of lessons) {
    const source = sourceFor(lesson.id);
    const markdown = exportNotebook({ source, notebook });
    for (const text of [
      lesson.theorem,
      ...lesson.proof,
      lesson.caution,
      lesson.sourceNote,
    ])
      assert(
        markdown.includes(text),
        `Missing exact source text for ${lesson.id}`,
      );
    for (const paragraph of teaching[lesson.id].proofSteps) {
      assert(markdown.includes(paragraph.label));
      assert(markdown.includes(paragraph.reason));
    }
    assert(markdown.includes('```text\nMy proof.\n```'));
  }
  assert.equal(notebook.text, 'My proof.\n');
});

test('large backtick inputs export exact draft, reflection and history with collision-free fences', () => {
  const text = `${'` '.repeat(150_001)}\n${'`'.repeat(12)}\n`;
  const reflection = `${'` '.repeat(150_001)}\n${'`'.repeat(14)}\n`;
  const source = sourceFor('D01');
  const writing = reduceNotebook(undefined, { kind: 'write', text });
  const textBlock = `${'`'.repeat(13)}text\n${text}${'`'.repeat(13)}`;
  const reflectionBlock = `${'`'.repeat(15)}text\n${reflection}${'`'.repeat(15)}`;
  assert(
    exportNotebook({ source, notebook: writing }).includes(
      `## Current draft (not compared)\n\n${textBlock}\n\n`,
    ),
  );
  const compared = reduceNotebook(
    reduceNotebook(writing, { kind: 'compare' }),
    { kind: 'reflect', text: reflection },
  );
  const captureBlock = `## Captured attempt 1\n\n${textBlock}\n\n### Learner reflection\n\n${reflectionBlock}\n\n`;
  assert(exportNotebook({ source, notebook: compared }).includes(captureBlock));
  const draft = `${text}Revised argument.`;
  const revision = reduceNotebook(
    reduceNotebook(compared, { kind: 'revise' }),
    { kind: 'write', text: draft },
  );
  const markdown = exportNotebook({ source, notebook: revision });
  assert(markdown.includes(captureBlock));
  assert(
    markdown.includes(
      `## Current draft (not compared)\n\n${'`'.repeat(13)}text\n${draft}\n${'`'.repeat(13)}\n\n`,
    ),
  );
  assert.equal(revision.text, draft);
  assert.deepEqual(revision.history, [{ text, reflection }]);
});
