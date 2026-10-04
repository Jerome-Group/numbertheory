import assert from 'node:assert/strict';
import test from 'node:test';
import { validateLearningContent } from './learning-content.mjs';
import { validateMathSurface } from './math-surface.mjs';

const lesson = { id: 'A', proof: ['argument'], prerequisites: [] };
const record = {
  intuition: 'idea',
  strategy: 'plan',
  hypotheses: ['condition'],
  proofSteps: [{ label: 'Step', reason: 'reason' }],
  check: {
    prompt: 'Why?',
    choices: [
      { text: 'Yes', correct: true, feedback: 'Because' },
      { text: 'No', correct: false, feedback: 'Counterexample' },
      { text: 'Maybe', correct: false, feedback: 'Missing premise' },
    ],
  },
};
const run = (lessons, teaching, paths = {}) =>
  validateLearningContent(lessons, teaching, paths, {}, { lessonIds: ['A'] });
test('valid authored record accepted; scope cannot grow or silently lose a record', () => {
  assert.deepEqual(run([lesson], { A: record }), []);
  assert.ok(run([lesson], {}).length);
  assert.ok(run([lesson], { A: record, B: record }).length);
  assert.ok(run([lesson, { ...lesson, id: 'B' }], { A: record }).length);
});
test('wrong proof alignment, malformed math and false diagnostic shape fail', () => {
  for (const mutation of [
    (r) => (r.proofSteps = []),
    (r) => (r.intuition = '\\(\\undefinedCommand\\)'),
    (r) => (r.strategy = '\\(x'),
    (r) => (r.check.choices[1].correct = true),
    (r) => (r.check.choices[0].correct = 'true'),
    (r) => (r.check.choices[2].feedback = ''),
  ]) {
    const copy = structuredClone(record);
    mutation(copy);
    assert.ok(run([lesson], { A: copy }).length);
  }
});
test('missing, late, and duplicate path prerequisites fail', () => {
  const dependent = { ...lesson, id: 'B', prerequisites: ['A'] };
  for (const ids of [['B'], ['B', 'A'], ['A', 'B', 'B'], ['A', 'missing']])
    assert.ok(
      run(
        [lesson, dependent],
        { A: record, B: record },
        { route: { ids } },
      ).some((error) => /prerequisite|duplicate|unknown/.test(error)),
    );
});
test('mathematical choices require a readable control label', () => {
  const copy = structuredClone(record);
  copy.check.choices[0].text = '\\(x^2\\)';
  for (const label of [undefined, '', '\\(x^2\\)']) {
    copy.check.choices[0].label = label;
    assert.ok(
      run([lesson], { A: copy }).some((error) => /spoken label/.test(error)),
    );
  }
  copy.check.choices[0].label = 'x squared';
  assert.deepEqual(run([lesson], { A: copy }), []);
});

test('mathematical question headings require complete spoken prompt labels', () => {
  const copy = structuredClone(record);
  copy.check.prompt = 'Why does \\(d\\mid a,b\\) imply \\(d\\mid xa+yb\\)?';
  for (const label of [
    undefined,
    null,
    '',
    '   ',
    '\\(d\\mid a\\)',
    'd = a',
    'x²',
  ]) {
    copy.check.promptLabel = label;
    assert.ok(
      run([lesson], { A: copy }).some((error) =>
        /spoken prompt label/.test(error),
      ),
    );
  }
  copy.check.promptLabel =
    'Why does d dividing both a and b imply that d divides x times a plus y times b?';
  assert.deepEqual(run([lesson], { A: copy }), []);
  assert.deepEqual(run([lesson], { A: record }), []);
  copy.check.prompt = 'Why?';
  copy.check.promptLabel = '';
  assert.ok(run([lesson], { A: copy }).length);
});

test('figure header names cannot disappear or drift from their table dimensions', () => {
  const figure = {
    title: 'Powers',
    caption: 'Compare an exact value.',
    headers: ['Input'],
    headerLabels: ['Input'],
    rows: [['\\(p^2\\)']],
    rowLabels: ['Prime p squared'],
  };
  const validate = (candidate) =>
    validateLearningContent(
      [lesson],
      { A: record },
      {},
      { A: candidate },
      {
        lessonIds: ['A'],
      },
    );
  assert.deepEqual(validate(figure), []);
  for (const key of ['headerLabels', 'rowLabels']) {
    for (const labels of [undefined, [], [''], ['\\(p^2\\)'], ['One', 'Two']]) {
      assert.ok(
        validate({ ...figure, [key]: labels }).some((error) =>
          /aligned plain spoken labels/.test(error),
        ),
      );
    }
  }
});

test('named math surfaces require spoken labels; source checks do not stand in for native AX', () => {
  for (const attributes of [
    '',
    'aria-label=""',
    'aria-label="   "',
    'aria-label="x^2 = 1"',
    'aria-label="x ≠ y"',
    'aria-label={""}',
    'aria-label={"\\\\(p^k\\\\)"}',
    'aria-label={name}',
  ]) {
    const source =
      '<h3 ' + attributes + '><MathText text={"\\\\(p^k\\\\)"} /></h3>';
    assert.ok(
      validateMathSurface(source).some((error) =>
        error.includes('MathText-bearing named surface'),
      ),
    );
  }
  for (const source of [
    '<h3 aria-label="Modulo eight"><MathText text={"\\\\(p^k\\\\)"} /></h3>',
    '<h3 aria-label={"Modulo eight"}><MathText text={"\\\\(p^k\\\\)"} /></h3>',
    '<h3 aria-label={\u0060Local modulus \u0024{prime} to the power \u0024{exponent}\u0060}><><MathText text={"\\\\(p^k\\\\)"} /></></h3>',
  ]) {
    assert.deepEqual(validateMathSurface(source), []);
  }
  for (const [tag, owner] of [
    ['h2', null],
    ['legend', 'fieldset'],
    ['caption', 'table'],
    ['figcaption', 'figure'],
  ]) {
    const body = 'For <MathText text={"\\\\(x^2\\\\)"} />, what happens?';
    assert.ok(
      validateMathSurface('<' + tag + '>' + body + '</' + tag + '>').length,
    );
    const labeled = owner
      ? `<${owner} aria-label="For x squared, what happens?"><${tag}>${body}</${tag}></${owner}>`
      : `<${tag} aria-label="For x squared, what happens?">${body}</${tag}>`;
    assert.deepEqual(validateMathSurface(labeled), []);
    if (owner) {
      assert.ok(
        validateMathSurface(
          `<${owner}><${tag} aria-label="For x squared, what happens?">${body}</${tag}></${owner}>`,
        ).length,
      );
    }
  }
  for (const source of [
    '<h3><MathText text={prompt} /></h3>',
    '<h3><MathText text={"Compare the roots"} /></h3>',
  ])
    assert.deepEqual(validateMathSurface(source), []);
  assert.ok(validateMathSurface('<h3><MathText /></h2>').length);
});
