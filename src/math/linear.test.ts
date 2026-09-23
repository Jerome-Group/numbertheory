import assert from 'node:assert/strict';
import test from 'node:test';
import { solveLinear } from './linear.ts';

test('noncoprime linear congruence has exactly gcd-many residues', () => {
  const r = solveLinear('6', '8', '14');
  assert.equal(r.count, '2');
  assert.deepEqual(r.sample, ['6', '13']);
  for (const x of r.sample) assert.equal((6n * BigInt(x) - 8n) % 14n, 0n);
});
test('incompatible, zero coefficient and modulus one', () => {
  assert.equal(solveLinear('6', '7', '14').solvable, false);
  assert.equal(solveLinear('0', '0', '7').count, '7');
  assert.equal(solveLinear('0', '3', '7').count, '0');
  assert.deepEqual(solveLinear('-3', '2', '1').sample, ['0']);
});
