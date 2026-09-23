import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extendedEuclid } from './euclid.ts';

for (const [a, b, g] of [
  ['252', '105', '21'],
  ['391', '299', '23'],
  ['-17', '5', '1'],
  ['0', '42', '42'],
  ['42', '0', '42'],
  ['-48', '-18', '6'],
  ['5', '5', '5'],
]) {
  test(`extended Euclid ${a}, ${b}`, () => {
    const result = extendedEuclid(a, b);
    assert.equal(result.gcd, g);
    assert.equal(
      BigInt(a) * BigInt(result.x) + BigInt(b) * BigInt(result.y),
      BigInt(g),
    );
    for (const [index, step] of result.steps.entries()) {
      if (index > 0) {
        assert.equal(step.dividend, result.steps[index - 1].divisor);
        assert.equal(step.divisor, result.steps[index - 1].remainder);
      }
      assert.equal(
        BigInt(step.dividend),
        BigInt(step.quotient) * BigInt(step.divisor) + BigInt(step.remainder),
      );
      assert.ok(
        BigInt(step.remainder) >= 0n &&
          BigInt(step.remainder) < BigInt(step.divisor),
      );
    }
    if (result.steps.length) assert.equal(result.steps.at(-1)?.divisor, g);
  });
}
test('rejects undefined and malformed inputs', () => {
  assert.throws(() => extendedEuclid('0', '0'));
  assert.throws(() => extendedEuclid('1.5', '2'));
  assert.throws(() => extendedEuclid('1000000000001', '2'));
});
