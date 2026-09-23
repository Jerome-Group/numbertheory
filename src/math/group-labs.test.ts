import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildDivisorIncidenceStudy,
  buildReciprocityLattice,
  buildUnitOrderSpectrum,
} from './group-labs.ts';

test('divisor incidence pairs each divisor with its complement', () => {
  const result = buildDivisorIncidenceStudy('12');
  assert.deepEqual(
    result.rows.map((row) => [row.divisor, row.complementaryDivisor]),
    [
      ['1', '12'],
      ['2', '6'],
      ['3', '4'],
      ['4', '3'],
      ['6', '2'],
      ['12', '1'],
    ],
  );
  assert.equal(result.convolutionValue, '6');
  assert.equal(result.divisorCount, '6');
  assert.equal(result.mobiusDivisorSum, '0');
  assert.equal(result.mobiusIdentityValue, '0');
});

test('Dirichlet convolution keeps its finite summands and is commutative', () => {
  const identityThenOne = buildDivisorIncidenceStudy('12', 'identity', 'one');
  const oneThenIdentity = buildDivisorIncidenceStudy('12', 'one', 'identity');
  assert.equal(identityThenOne.convolutionValue, '28');
  assert.equal(oneThenIdentity.convolutionValue, '28');
  assert.deepEqual(
    identityThenOne.rows.map((row) => row.convolutionTerm),
    ['1', '2', '3', '4', '6', '12'],
  );
});

test('Möbius inversion reconstructs the source function', () => {
  const phi = buildDivisorIncidenceStudy('12', 'totient');
  assert.equal(phi.divisorSumValue, '12');
  assert.equal(phi.sourceValue, '4');
  assert.equal(phi.inversionValue, '4');
  assert.deepEqual(
    phi.rows.map((row) => [row.divisor, row.mobiusValue, row.inversionTerm]),
    [
      ['1', '1', '12'],
      ['2', '-1', '-6'],
      ['3', '-1', '-4'],
      ['4', '0', '0'],
      ['6', '1', '2'],
      ['12', '0', '0'],
    ],
  );
});

test('the divisor-sum inverse holds across every bounded input and source', () => {
  for (let n = 1; n <= 80; n += 1) {
    for (const fn of ['one', 'identity', 'mobius', 'totient'] as const) {
      const result = buildDivisorIncidenceStudy(String(n), fn);
      assert.equal(result.inversionValue, result.sourceValue, `${fn} at ${n}`);
      assert.equal(
        result.mobiusDivisorSum,
        result.mobiusIdentityValue,
        `mu divisor sum at ${n}`,
      );
      assert.equal(result.coprimeProductCheck.gcd, '1', `split gcd at ${n}`);
      assert.equal(
        result.coprimeProductCheck.matches,
        true,
        `coprime multiplicativity at ${fn}, ${n}`,
      );
      assert.equal(
        BigInt(result.coprimeProductCheck.leftFactor) *
          BigInt(result.coprimeProductCheck.rightFactor),
        BigInt(n),
        `prime-power split at ${n}`,
      );
    }
  }
});

test('divisor study enforces positive bounded inputs and supported functions', () => {
  assert.throws(() => buildDivisorIncidenceStudy('0'));
  assert.throws(() => buildDivisorIncidenceStudy('121'));
  assert.throws(() => buildDivisorIncidenceStudy('1.5'));
  assert.throws(() =>
    buildDivisorIncidenceStudy('12', 'totient', 'not-a-function' as never),
  );
});

test('the primitive-root cycle visits every nonzero class exactly once', () => {
  const result = buildUnitOrderSpectrum('7', '3');
  assert.equal(result.candidateOrder, 6);
  assert.equal(result.isPrimitiveRoot, true);
  assert.deepEqual(
    result.cycle.map((entry) => entry.residue),
    [1, 3, 2, 6, 4, 5],
  );
  assert.equal(result.returnExponent, 6);
  assert.deepEqual(result.missedUnits, []);
  assert.deepEqual(result.primitiveRoots, [3, 5]);
  assert.deepEqual(result.primitivePowerExponents, [1, 5]);
  assert.deepEqual(result.primitivePowerValues, [3, 5]);
  assert.ok(result.generatorTests.every((test) => test.residue !== 1));
});

test('power orders match h/gcd(h,k), including the zeroth power', () => {
  const result = buildUnitOrderSpectrum('7', '3');
  assert.deepEqual(
    result.powerOrders.map((row) => [row.exponent, row.predictedOrder]),
    [
      [0, 1],
      [1, 6],
      [2, 3],
      [3, 2],
      [4, 3],
      [5, 6],
    ],
  );
  assert.ok(
    result.powerOrders.every((row) => row.predictedOrder === row.computedOrder),
  );
});

test('non-generators expose their proper cycle and missed units', () => {
  const result = buildUnitOrderSpectrum('7', '2');
  assert.equal(result.candidateOrder, 3);
  assert.equal(result.isPrimitiveRoot, false);
  assert.deepEqual(
    result.cycle.map((entry) => entry.residue),
    [1, 2, 4],
  );
  assert.deepEqual(result.missedUnits, [3, 5, 6]);
  assert.equal(
    result.generatorTests.find((row) => row.primeDivisor === 2)?.residue,
    1,
  );
});

test('orders divide p-1 and primitive-root counts equal phi(p-1)', () => {
  const primes = [3, 5, 7, 11, 13, 17, 19, 23, 29, 31];
  for (const p of primes) {
    const result = buildUnitOrderSpectrum(String(p), '1');
    assert.ok(result.units.every((unit) => (p - 1) % unit.order === 0));
    const expectedCount = Array.from({ length: p - 1 }, (_, k) => k + 1).filter(
      (k) => gcd(k, p - 1) === 1,
    ).length;
    assert.equal(result.primitiveRoots.length, expectedCount, `p=${p}`);
    assert.equal(
      result.units.filter((unit) => unit.isPrimitiveRoot).length,
      expectedCount,
    );
    for (let candidate = 1; candidate < p; candidate += 1) {
      const candidateResult = buildUnitOrderSpectrum(
        String(p),
        String(candidate),
      );
      assert.ok(
        candidateResult.powerOrders.every(
          (row) => row.predictedOrder === row.computedOrder,
        ),
        `power order formula at p=${p}, a=${candidate}`,
      );
      assert.equal(
        candidateResult.generatorTests.every((row) => row.residue !== 1),
        candidateResult.isPrimitiveRoot,
        `prime-divisor criterion at p=${p}, a=${candidate}`,
      );
    }
  }
});

test('order spectrum rejects composites, nonunits, and oversized primes', () => {
  assert.throws(() => buildUnitOrderSpectrum('9', '2'));
  assert.throws(() => buildUnitOrderSpectrum('2', '1'));
  assert.throws(() => buildUnitOrderSpectrum('37', '2'));
  assert.throws(() => buildUnitOrderSpectrum('7', '7'));
});

test('the 7 by 11 rectangle gives the two floor sums and reciprocity sign', () => {
  const result = buildReciprocityLattice('7', '11');
  assert.equal(result.countBelow, 8);
  assert.equal(result.countAbove, 7);
  assert.equal(result.floorSumPq, '8');
  assert.equal(result.floorSumQp, '7');
  assert.equal(result.parityExponent, 15);
  assert.equal(result.legendrePq, 1);
  assert.equal(result.legendreQp, -1);
  assert.equal(result.symbolProduct, -1);
  assert.equal(result.reciprocitySign, -1);
  assert.equal(result.noDiagonalPoints, true);
  assert.equal(result.countMatchesFloorSums, true);
  assert.equal(result.gaussBridgeMatches, true);
  assert.equal(result.reciprocityMatches, true);
});

test('all distinct odd-prime pairs satisfy the exact count and parity identities', () => {
  const primes = [3, 5, 7, 11, 13, 17, 19, 23, 29, 31];
  for (const p of primes) {
    for (const q of primes) {
      if (p === q) continue;
      const result = buildReciprocityLattice(String(p), String(q));
      assert.equal(result.cells.length, result.mP * result.mQ);
      assert.equal(result.countBelow + result.countAbove, result.cells.length);
      assert.equal(result.noDiagonalPoints, true, `${p}, ${q}`);
      assert.equal(result.countMatchesFloorSums, true, `${p}, ${q}`);
      assert.equal(result.gaussBridgeMatches, true, `${p}, ${q}`);
      assert.equal(result.reciprocityMatches, true, `${p}, ${q}`);
    }
  }
});

test('reciprocity rejects equal, even, composite, and oversized inputs', () => {
  assert.throws(() => buildReciprocityLattice('7', '7'));
  assert.throws(() => buildReciprocityLattice('2', '5'));
  assert.throws(() => buildReciprocityLattice('9', '11'));
  assert.throws(() => buildReciprocityLattice('7', '37'));
});

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}
