import assert from 'node:assert/strict';
import test from 'node:test';
import { adaptLessonV1 } from './lesson-v2.ts';
import type { Lesson } from './types.ts';

const old: Lesson = {
  id: 'C02',
  title: 'Cancellation',
  cluster: 'Congruences',
  question: 'Question',
  prerequisites: ['C01'],
  summary: 'Summary',
  definition: ['Definition one', 'Definition two'],
  theorem: 'Claim',
  proof: ['Reason one', 'Reason two'],
  example: { prompt: 'Example', steps: ['Step'], conclusion: 'Conclusion' },
  practice: { prompt: 'Try', hints: ['Hint'], answer: 'Answer' },
  caution: 'Boundary',
  bridge: 'Connection',
  sourceNote: 'Source',
  lab: 'residue',
};
test('legacy adapter retains every teaching field with stable references', () => {
  const adapted = adaptLessonV1(old);
  assert.deepEqual(
    adapted.lesson.blocks.map((block) => block.kind),
    [
      'question',
      'lab',
      'definition',
      'definition',
      'claim',
      'proof',
      'example',
      'practice',
      'boundary',
      'bridge',
      'source',
    ],
  );
  assert.equal(adapted.lesson.migration, 'legacy-adapted');
  assert.equal(adapted.claims[0].statement, old.theorem);
  assert.deepEqual(adapted.claims[0].proof, old.proof);
  assert.deepEqual(adapted.examples[0].steps, old.example.steps);
  assert.equal(adapted.exercises[0].answer, old.practice.answer);
  assert.equal(adapted.lesson.blocks.at(-1)?.kind, 'source');
});
