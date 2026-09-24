import assert from 'node:assert/strict';
import test from 'node:test';
import { divideGaussian } from './gaussian.ts';

test('Gaussian Euclid exemplar has exact quotient and norm certificate', () => {
  const result = divideGaussian('7', '5', '3', '2');
  assert.deepEqual(result.quotient, { re: '2', im: '0' });
  assert.deepEqual(result.remainder, { re: '1', im: '1' });
  assert.equal(result.remainderNorm, '2');
  assert.equal(result.divisorNorm, '13');
  assert.deepEqual(result.rationalQuotient, {
    reNumerator: '31',
    imNumerator: '1',
  });
});

test('bounded Gaussian divisions recompose and strictly decrease norm', () => {
  for (let a = -5; a <= 5; a++)
    for (let b = -5; b <= 5; b++)
      for (let c = -3; c <= 3; c++)
        for (let d = -3; d <= 3; d++) {
          if (c === 0 && d === 0) continue;
          const result = divideGaussian(
            String(a),
            String(b),
            String(c),
            String(d),
          );
          const q = result.quotient;
          const r = result.remainder;
          assert.equal(
            BigInt(q.re) * BigInt(c) - BigInt(q.im) * BigInt(d) + BigInt(r.re),
            BigInt(a),
          );
          assert.equal(
            BigInt(q.re) * BigInt(d) + BigInt(q.im) * BigInt(c) + BigInt(r.im),
            BigInt(b),
          );
          assert.ok(BigInt(result.remainderNorm) < BigInt(result.divisorNorm));
        }
});

test('ties and invalid divisors have explicit behavior', () => {
  assert.deepEqual(divideGaussian('1', '0', '1', '1').quotient, {
    re: '1',
    im: '0',
  });
  assert.throws(() => divideGaussian('1', '0', '0', '0'));
  assert.throws(() => divideGaussian('101', '0', '1', '0'));
  assert.throws(() => divideGaussian('1.5', '0', '1', '0'));
});
