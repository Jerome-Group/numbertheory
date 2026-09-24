import assert from 'node:assert/strict';
import test from 'node:test';
import { solveLocalSquares } from './local-squares.ts';

test('local square roots agree with direct enumeration for every bounded modulus and target', () => {
  for (let modulus = 2; modulus <= 128; modulus++) {
    for (let target = 0; target < modulus; target++) {
      const result = solveLocalSquares(String(modulus), String(target));
      const expected = Array.from({ length: modulus }, (_, x) => x).filter(
        (x) => (x * x) % modulus === target,
      );
      assert.deepEqual(result.roots, expected, `${target} modulo ${modulus}`);
      assert.equal(result.obstruction === null, expected.length > 0);
    }
  }
});

test('local certificates cover unit, valuation, zero, and negative targets', () => {
  assert.equal(solveLocalSquares('72', '1').roots.length, 8);
  assert.match(solveLocalSquares('32', '12').obstruction ?? '', /modulo 8/i);
  assert.deepEqual(solveLocalSquares('16', '0').roots, [0, 4, 8, 12]);
  assert.deepEqual(solveLocalSquares('7', '-1').roots, []);
  assert.deepEqual(solveLocalSquares('5', '-1').roots, [2, 3]);
});

test('local square solver rejects unbounded or malformed input', () => {
  for (const [modulus, target] of [
    ['1', '0'],
    ['129', '0'],
    ['2.5', '0'],
    ['8', '1e2'],
    ['8', '999999999999999'],
  ])
    assert.throws(() => solveLocalSquares(modulus, target));
});
