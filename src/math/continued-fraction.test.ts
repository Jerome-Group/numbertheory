import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildPellOrbit,
  buildRationalContinuedFraction,
  buildSqrtContinuedFraction,
} from './continued-fraction.ts';

function evaluate(coefficients: string[]) {
  let numerator = BigInt(coefficients.at(-1) ?? '0');
  let denominator = 1n;
  for (let index = coefficients.length - 2; index >= 0; index--) {
    [numerator, denominator] = [
      BigInt(coefficients[index]) * numerator + denominator,
      numerator,
    ];
  }
  return { numerator, denominator };
}

test('rational Euclidean quotients, convergents, determinants, and errors agree', () => {
  const result = buildRationalContinuedFraction('43', '19');
  assert.equal(result.canonical, '[2;3,1,4]');
  assert.equal(result.alternative, '[2;3,1,3,1]');
  assert.deepEqual(
    result.divisions.map(({ quotient, remainder }) => [quotient, remainder]),
    [
      ['2', '5'],
      ['3', '4'],
      ['1', '1'],
      ['4', '0'],
    ],
  );
  assert.deepEqual(
    result.convergents.map(({ numerator, denominator }) => [
      numerator,
      denominator,
    ]),
    [
      ['2', '1'],
      ['7', '3'],
      ['9', '4'],
      ['43', '19'],
    ],
  );
  assert.deepEqual(
    result.convergents.map((row) => row.determinantWithPrevious),
    ['-1', '1', '-1', '1'],
  );
  assert.deepEqual(
    result.convergents.map((row) => [row.errorNumerator, row.errorDenominator]),
    [
      ['5', '19'],
      ['-4', '57'],
      ['1', '76'],
      ['0', '1'],
    ],
  );
  assert.equal(
    evaluate(result.coefficients).numerator * 19n,
    43n * evaluate(result.coefficients).denominator,
  );
  const alternative = evaluate(['2', '3', '1', '3', '1']);
  assert.equal(alternative.numerator * 19n, 43n * alternative.denominator);
});

test('negative rationals use floor division and integers retain both conventions', () => {
  const negative = buildRationalContinuedFraction('-43', '19');
  assert.equal(negative.canonical, '[-3;1,2,1,4]');
  assert.equal(negative.convergents.at(-1)?.numerator, '-43');
  assert.equal(negative.convergents.at(-1)?.denominator, '19');
  for (const [numerator, denominator] of [
    ['0', '19'],
    ['7', '1'],
    ['-7', '1'],
    ['42', '30'],
  ]) {
    const expansion = buildRationalContinuedFraction(numerator, denominator);
    const canonical = evaluate(expansion.coefficients);
    const alternative = evaluate(
      expansion.alternative.slice(1, -1).split(/[;,]/),
    );
    assert.equal(
      canonical.numerator * alternative.denominator,
      alternative.numerator * canonical.denominator,
    );
  }
  assert.equal(buildRationalContinuedFraction('0', '19').canonical, '[0]');
  assert.equal(buildRationalContinuedFraction('7', '1').alternative, '[6;1]');
});

test('bounded rational samples satisfy division, convergent, and canonical invariants', () => {
  for (let numerator = -25; numerator <= 25; numerator++) {
    for (let denominator = 1; denominator <= 25; denominator++) {
      const result = buildRationalContinuedFraction(
        String(numerator),
        String(denominator),
      );
      const expanded = evaluate(result.coefficients);
      assert.equal(
        expanded.numerator * BigInt(result.denominator),
        BigInt(result.numerator) * expanded.denominator,
      );
      assert.ok(
        BigInt(result.coefficients.at(-1) ?? '1') >= 2n ||
          result.coefficients.length === 1,
      );
      for (const [index, row] of result.divisions.entries()) {
        const dividend = BigInt(row.dividend);
        const divisor = BigInt(row.divisor);
        const quotient = BigInt(row.quotient);
        const remainder = BigInt(row.remainder);
        assert.equal(dividend, quotient * divisor + remainder);
        assert.ok(remainder >= 0n && remainder < divisor);
        if (index + 1 < result.divisions.length) {
          assert.equal(result.divisions[index + 1].dividend, row.divisor);
          assert.equal(result.divisions[index + 1].divisor, row.remainder);
        }
      }
      for (const [index, row] of result.convergents.entries()) {
        assert.equal(
          BigInt(row.determinantWithPrevious),
          index % 2 === 0 ? -1n : 1n,
        );
        assert.equal(
          (BigInt(result.numerator) * BigInt(row.denominator) -
            BigInt(result.denominator) * BigInt(row.numerator)) *
            BigInt(row.errorDenominator),
          BigInt(row.errorNumerator) *
            BigInt(result.denominator) *
            BigInt(row.denominator),
        );
      }
    }
  }
});

test('square-root continued fractions expose exact states and alternating error certificates', () => {
  const rootTwo = buildSqrtContinuedFraction('2', '4');
  assert.deepEqual(rootTwo.period, ['2']);
  assert.deepEqual(
    rootTwo.states.map(({ m, d, coefficient }) => [m, d, coefficient]),
    [
      ['0', '1', '1'],
      ['1', '1', '2'],
      ['1', '1', '2'],
      ['1', '1', '2'],
    ],
  );
  assert.deepEqual(
    rootTwo.convergents.map(({ numerator, denominator }) => [
      numerator,
      denominator,
    ]),
    [
      ['1', '1'],
      ['3', '2'],
      ['7', '5'],
      ['17', '12'],
    ],
  );
  assert.deepEqual(
    rootTwo.convergents.map((row) => [
      row.determinantWithPrevious,
      row.errorSide,
      row.normDifference,
    ]),
    [
      ['-1', 'below', '1'],
      ['1', 'above', '-1'],
      ['-1', 'below', '1'],
      ['1', 'above', '-1'],
    ],
  );
  assert.equal(rootTwo.convergents[2].errorBoundDenominator, '60');
  assert.equal(rootTwo.convergents[2].denominator, '5');
  assert.equal(rootTwo.convergents[2].nextDenominator, '12');
  assert.equal(rootTwo.convergents[3].errorBoundDenominator, '348');
  assert.equal(rootTwo.periodLength, 1);

  const rootThree = buildSqrtContinuedFraction('3', '5');
  assert.deepEqual(rootThree.period, ['1', '2']);
  assert.equal(rootThree.periodLength, 2);
  for (const state of rootThree.states.slice(1)) {
    const m = BigInt(state.m);
    const d = BigInt(state.d);
    assert.equal((3n - m * m) % d, 0n);
    assert.equal(BigInt(state.coefficient) * d <= 1n + m, true);
    assert.equal((BigInt(state.coefficient) + 1n) * d > 1n + m, true);
  }
});

test('square-root state period closes beyond the old short heuristic cap', () => {
  const result = buildSqrtContinuedFraction('9949', '1');
  assert.equal(result.periodLength, 217);
  assert.ok(result.periodLength > 2 * 99 + 2);
  let m = 0n;
  let d = 1n;
  let a = BigInt(result.integerPart);
  for (const entry of result.period) {
    const nextM = d * a - m;
    const numerator = 9949n - nextM * nextM;
    assert.equal(numerator % d, 0n);
    const nextD = numerator / d;
    const nextA = (99n + nextM) / nextD;
    assert.equal(nextA, BigInt(entry));
    [m, d, a] = [nextM, nextD, nextA];
  }
  assert.deepEqual([m, d], [99n, 1n]);
});

test('Pell fundamental solutions, negative-Pell parity, and generated norm orbit are exact', () => {
  const rootTwo = buildPellOrbit('2', '4');
  assert.deepEqual(rootTwo.period, ['2']);
  assert.deepEqual(rootTwo.fundamental, { x: '3', y: '2', norm: '1' });
  assert.deepEqual(rootTwo.negative, { x: '1', y: '1', norm: '-1' });
  assert.deepEqual(
    rootTwo.solutions.map(({ x, y, norm }) => [x, y, norm]),
    [
      ['3', '2', '1'],
      ['17', '12', '1'],
      ['99', '70', '1'],
      ['577', '408', '1'],
    ],
  );

  const rootThree = buildPellOrbit('3', '3');
  assert.deepEqual(rootThree.fundamental, { x: '2', y: '1', norm: '1' });
  assert.equal(rootThree.negative, null);
  assert.deepEqual(
    rootThree.solutions.map(({ x, y }) => [x, y]),
    [
      ['2', '1'],
      ['7', '4'],
      ['26', '15'],
    ],
  );

  const rootThirteen = buildPellOrbit('13', '2');
  assert.deepEqual(rootThirteen.fundamental, { x: '649', y: '180', norm: '1' });
  assert.deepEqual(rootThirteen.negative, { x: '18', y: '5', norm: '-1' });
  for (const orbit of [rootTwo, rootThree, rootThirteen]) {
    let previousY = 0n;
    for (const solution of orbit.solutions) {
      const x = BigInt(solution.x);
      const y = BigInt(solution.y);
      assert.equal(x * x - BigInt(orbit.radicand) * y * y, 1n);
      assert.ok(x > 0n && y > previousY);
      previousY = y;
    }
  }
});

test('invalid rational, square-root, and Pell boundaries have explicit errors', () => {
  assert.throws(
    () => buildRationalContinuedFraction('1.2', '3'),
    /whole number/,
  );
  assert.throws(() => buildRationalContinuedFraction('1', '0'), /Denominator/);
  assert.throws(() => buildRationalContinuedFraction('1000', '1'), /Numerator/);
  assert.ok(
    buildRationalContinuedFraction('987', '610').coefficients.length <= 16,
  );
  assert.throws(() => buildSqrtContinuedFraction('4'), /not a perfect square/);
  assert.throws(() => buildSqrtContinuedFraction('1'), /D:/);
  assert.throws(() => buildSqrtContinuedFraction('2', '17'), /Visible entries/);
  assert.throws(() => buildPellOrbit('9'), /not a perfect square/);
  assert.throws(() => buildPellOrbit('0'), /D:/);
  assert.throws(() => buildPellOrbit('2', '0'), /Solutions/);
  assert.throws(() => buildPellOrbit('2', '9'), /Solutions/);
});
