import assert from 'node:assert/strict';
import test from 'node:test';
import { validateLearningContent } from './learning-content.mjs';

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
