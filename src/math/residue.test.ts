import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildQuadraticResidueMap, buildResidueClock } from './residue.ts';

test('clock normalizes negative representatives and preserves operations after shifts', () => {
  for (const operation of ['add', 'multiply'] as const) {
    const result = buildResidueClock(
      '7',
      '-8',
      '1000000000000',
      operation,
      '-8',
      '8',
    );
    assert.equal(result.firstClass, 6);
    assert.equal(result.secondClass, 1);
    assert.equal(result.resultClass, operation === 'add' ? 0 : 6);
    assert.equal(result.shiftedResultClass, result.resultClass);
    assert.equal(
      result.cells.find((cell) => cell.integer === '-8')?.residue,
      6,
    );
    assert.equal(result.classes.filter((cell) => cell.isUnit).length, 6);
  }
});
test('modulus one is a single class and bounded ranges reject overload', () => {
  const result = buildResidueClock('1', '-2', '3', 'multiply', '-1', '1');
  assert.equal(result.resultClass, 0);
  assert.equal(result.classes.length, 1);
  assert.equal(result.classes[0].isUnit, true);
  assert.throws(() => buildResidueClock('25', '1', '2', 'add', '0', '5'));
  assert.throws(() => buildResidueClock('7', '1', '2', 'add', '-48', '48'));
});
test('quadratic fibres and Legendre values include zero', () => {
  const square = buildQuadraticResidueMap('7', '2');
  assert.deepEqual(square.roots, [3, 4]);
  assert.equal(square.symbol, 1);
  assert.deepEqual(square.nonzeroSquares, [1, 2, 4]);
  const nonresidue = buildQuadraticResidueMap('7', '3');
  assert.deepEqual(nonresidue.roots, []);
  assert.equal(nonresidue.symbol, -1);
  const zero = buildQuadraticResidueMap('7', '0');
  assert.deepEqual(zero.roots, [0]);
  assert.equal(zero.symbol, 0);
});
test('all bounded odd primes have paired nonzero fibres and closed squares', () => {
  for (const p of [3, 5, 7, 11, 13, 17, 19, 23, 29, 31]) {
    const result = buildQuadraticResidueMap(String(p), '-1000000000000');
    assert.equal(result.pairs.length, (p - 1) / 2);
    assert.equal(result.nonzeroSquares.length, (p - 1) / 2);
    for (const pair of result.pairs) {
      assert.equal((pair.root * pair.root) % p, pair.square);
      assert.equal((pair.opposite * pair.opposite) % p, pair.square);
    }
    for (const a of result.nonzeroSquares)
      for (const b of result.nonzeroSquares) {
        assert.ok(result.nonzeroSquares.includes((a * b) % p));
      }
    assert.ok(result.nonzeroSquares.includes(result.closure.product));
    assert.equal(result.closure.productRoot ** 2 % p, result.closure.product);
  }
  assert.throws(() => buildQuadraticResidueMap('2', '1'));
  assert.throws(() => buildQuadraticResidueMap('9', '1'));
});
