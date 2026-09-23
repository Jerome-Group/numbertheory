import assert from 'node:assert/strict';
import { test } from 'node:test';
import { solveCrt } from './crt.ts';

for (const [a, m, b, n, x, period] of [
  ['2', '3', '3', '5', '8', '15'],
  ['2', '6', '8', '9', '8', '18'],
  ['-1', '4', '1', '6', '7', '12'],
  ['0', '1', '3', '7', '3', '7'],
]) {
  test(`CRT ${a} mod ${m}, ${b} mod ${n}`, () => {
    const r = solveCrt(a, m, b, n);
    assert.equal(r.compatible, true);
    assert.equal(r.residue, x);
    assert.equal(r.modulus, period);
    assert.equal((BigInt(x) - BigInt(a)) % BigInt(m), 0n);
    assert.equal((BigInt(x) - BigInt(b)) % BigInt(n), 0n);
  });
}
test('incompatible systems and invalid moduli', () => {
  const r = solveCrt('1', '4', '2', '6');
  assert.equal(r.compatible, false);
  assert.equal(r.gcd, '2');
  assert.throws(() => solveCrt('1', '0', '2', '3'));
  assert.throws(() => solveCrt('1', '1000001', '2', '3'));
});
