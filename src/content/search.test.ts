import assert from 'node:assert/strict';
import test from 'node:test';
import { lessonMatches } from './search.ts';
import type { Lesson } from './types.ts';

const lesson: Lesson = {
  id: 'A04',
  title: 'Möbius inversion',
  cluster: 'Arithmetic functions',
  question: 'How can a divisor sum be undone?',
  prerequisites: [],
  summary: 'The totient function can be reconstructed.',
  definition: ['Dirichlet convolution uses a finite divisor sum.'],
  theorem: 'The \\(\\mu\\) function inverts the constant-one function.',
  proof: ['A proof.'],
  example: { prompt: 'Example', steps: ['Step'], conclusion: 'Done' },
  practice: {
    prompt: 'Explain the convolution identity.',
    hints: ['Hint'],
    answer: 'Answer',
  },
  caution: 'Check the domain.',
  sourceNote: 'Original.',
};

test('search covers aliases, accents, notation, methods, and questions', () => {
  for (const query of [
    'A04',
    'mobius',
    'phi',
    'mu',
    'Dirichlet',
    'convolution identity',
    'divisor sum',
  ])
    assert.equal(lessonMatches(query, lesson), true, query);
  assert.equal(lessonMatches('Pell equation', lesson), false);
});
