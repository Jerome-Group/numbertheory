import assert from 'node:assert/strict';
import test from 'node:test';
import {
  comparePreserved,
  defaultInvestigation,
  encodeInvestigationRoute,
  type InvestigationSelection,
  inspectInvestigation,
  investigationCatalog,
  parseInvestigationRoute,
  type SearchReport,
} from './conjectures.ts';

function coprime(a: number, b: number): boolean {
  for (let d = 2; d <= Math.min(a, b); d++)
    if (a % d === 0 && b % d === 0) return false;
  return a !== 0 || b === 1;
}
function divisorGcd(a: number, b: number): number {
  if (a === 0) return b;
  for (let d = Math.min(a, b); d >= 1; d--)
    if (a % d === 0 && b % d === 0) return d;
  throw new Error('Positive integers have a common divisor.');
}
function totient(n: number): number {
  return Array.from({ length: n }, (_, a) => a).filter((a) => coprime(a, n))
    .length;
}
function isPrime(n: number): boolean {
  return (
    n > 1 &&
    Array.from({ length: n - 2 }, (_, i) => i + 2).every((d) => n % d !== 0)
  );
}
function isSquarefree(n: number): boolean {
  for (let d = 2; d * d <= n; d++) if (n % (d * d) === 0) return false;
  return true;
}
function squareSet(n: number): number[] {
  return [...new Set(Array.from({ length: n }, (_, x) => (x * x) % n))].sort(
    (a, b) => a - b,
  );
}
function jacobiFromLocalSquares(a: number, modulus: number): number {
  let sign = 1,
    n = modulus;
  for (let p = 3; p <= modulus; p += 2) {
    if (!isPrime(p)) continue;
    while (n % p === 0) {
      sign *= squareSet(p).includes(a % p) ? 1 : -1;
      n /= p;
    }
  }
  return sign;
}
function rootCountFromCrt(modulus: number): number {
  let n = modulus,
    twoPower = 0,
    count = 1;
  while (n % 2 === 0) {
    n /= 2;
    twoPower++;
  }
  if (twoPower === 2) count = 2;
  if (twoPower >= 3) count = 4;
  for (let p = 3; p <= n; p += 2)
    if (n % p === 0) {
      count *= 2;
      while (n % p === 0) n /= p;
    }
  return count;
}
function oracle(selection: InvestigationSelection) {
  let admittedTuples = 0,
    premiseMatches = 0,
    counterexamples = 0;
  switch (selection.id) {
    case 'C02':
      for (let n = 2; n <= 18; n++)
        for (let c = 0; c < n; c++) {
          const d = divisorGcd(c, n);
          if (
            (selection.condition === 'nonzero' && c === 0) ||
            (selection.condition === 'unit' && d !== 1)
          )
            continue;
          admittedTuples += n * n;
          premiseMatches += n * d;
          counterexamples += n * (d - 1);
        }
      break;
    case 'C06':
      for (let n = 2; n <= 24; n++)
        for (let a = 0; a < n; a++) {
          if (
            (selection.condition === 'nonzero' && a === 0) ||
            (selection.condition === 'unit' && !coprime(a, n))
          )
            continue;
          admittedTuples++;
          premiseMatches++;
          if (BigInt(a) ** BigInt(totient(n)) % BigInt(n) !== 1n)
            counterexamples++;
        }
      break;
    case 'C07':
      for (let m = 2; m <= 16; m++)
        for (let n = 2; n <= 16; n++) {
          if (
            (selection.condition === 'distinct' && m === n) ||
            (selection.condition === 'coprime' && !coprime(m, n))
          )
            continue;
          admittedTuples++;
          premiseMatches++;
          if (totient(m * n) !== totient(m) * totient(n)) counterexamples++;
        }
      break;
    case 'F01':
      for (let n = 2; n <= 31; n++) {
        if (
          (selection.condition === 'odd' && n % 2 === 0) ||
          (selection.condition === 'prime' && !isPrime(n))
        )
          continue;
        admittedTuples++;
        premiseMatches++;
        if (rootCountFromCrt(n) > 2) counterexamples++;
      }
      break;
    case 'Q06':
      for (let n = 3; n <= 35; n += 2)
        for (let a = 1; a < n; a++) {
          if (
            !coprime(a, n) ||
            (selection.condition === 'squarefree' && !isSquarefree(n)) ||
            (selection.condition === 'prime' && !isPrime(n))
          )
            continue;
          admittedTuples++;
          if (jacobiFromLocalSquares(a, n) !== 1) continue;
          premiseMatches++;
          if (!squareSet(n).includes(a)) counterexamples++;
        }
      break;
    default: {
      const exhaustive: never = selection;
      return exhaustive;
    }
  }
  return { admittedTuples, premiseMatches, counterexamples };
}

const expectedWitnesses = {
  C02: ['n = 2, c = 0, a = 0, b = 1', 'n = 4, c = 2, a = 0, b = 2'],
  C06: ['n = 2, a = 0', 'n = 4, a = 2'],
  C07: ['m = 2, n = 2', 'm = 2, n = 4'],
  F01: ['n = 8; roots = {1, 3, 5, 7}', 'n = 15; roots = {1, 4, 11, 14}'],
  Q06: ['n = 9, a = 2', 'n = 15, a = 2'],
};
function verifyWitness(report: Extract<SearchReport, { kind: 'refuted' }>) {
  const witness = report.firstWitness;
  switch (witness.investigationId) {
    case 'C02':
      assert.equal((witness.c * witness.a) % witness.n, witness.productResidue);
      assert.equal((witness.c * witness.b) % witness.n, witness.productResidue);
      assert.notEqual(witness.a % witness.n, witness.b % witness.n);
      assert.equal(
        Number(witness.gcd),
        divisorGcd(Number(witness.c), Number(witness.n)),
      );
      assert.equal(witness.survivingModulus * witness.gcd, witness.n);
      break;
    case 'C06':
      assert.equal(Number(witness.phi), totient(Number(witness.n)));
      assert.equal(witness.a ** witness.phi % witness.n, witness.powerResidue);
      assert.notEqual(witness.powerResidue, 1n);
      assert.equal(
        Number(witness.gcd),
        divisorGcd(Number(witness.a), Number(witness.n)),
      );
      assert.deepEqual(
        witness.units.map(Number),
        Array.from({ length: Number(witness.n) }, (_, a) => a).filter((a) =>
          coprime(a, Number(witness.n)),
        ),
      );
      break;
    case 'C07':
      assert.equal(Number(witness.phiM), totient(Number(witness.m)));
      assert.equal(Number(witness.phiN), totient(Number(witness.n)));
      assert.equal(
        Number(witness.phiProduct),
        totient(Number(witness.m * witness.n)),
      );
      assert.notEqual(witness.phiProduct, witness.phiM * witness.phiN);
      assert.equal(
        Number(witness.gcd),
        divisorGcd(Number(witness.m), Number(witness.n)),
      );
      break;
    case 'F01':
      assert.equal(witness.roots.length, rootCountFromCrt(Number(witness.n)));
      assert.ok(witness.roots.length > 2);
      break;
    case 'Q06':
      assert.equal(
        jacobiFromLocalSquares(Number(witness.a), Number(witness.n)),
        1,
      );
      assert.equal(
        squareSet(Number(witness.n)).includes(Number(witness.a)),
        false,
      );
      break;
    default: {
      const exhaustive: never = witness;
      return exhaustive;
    }
  }
}
for (const descriptor of investigationCatalog()) {
  for (const [index, choice] of descriptor.choices.entries()) {
    test(`${descriptor.id} ${choice.selection.condition} exhausts the stated domain against an independent oracle`, () => {
      const report = inspectInvestigation(choice.selection);
      assert.deepEqual(report.scope, oracle(choice.selection));
      assert.ok(
        report.scope.premiseMatches > 0,
        'The hypothesis is tested nonvacuously.',
      );
      assert.ok(report.scope.admittedTuples >= report.scope.premiseMatches);
      assert.ok(report.scope.premiseMatches >= report.scope.counterexamples);
      if (index === 2) {
        assert.equal(report.kind, 'no-counterexample-within-bounds');
        assert.equal('firstWitness' in report, false);
        assert.equal(report.scope.counterexamples, 0);
      } else {
        assert.equal(report.kind, 'refuted');
        if (report.kind !== 'refuted') return;
        verifyWitness(report);
        assert.equal(
          report.display.summary,
          expectedWitnesses[descriptor.id][index],
        );
        assert.ok(report.display.premise.length);
        assert.ok(report.display.contradiction.length);
        assert.equal(
          comparePreserved(choice.selection, report)?.kind,
          'admitted',
        );
        assert.equal(
          comparePreserved(descriptor.choices[2].selection, report)?.kind,
          'excluded',
        );
      }
    });
  }
  test(`${descriptor.id} kept witness arithmetic survives a condition change and reverse change`, () => {
    const original = inspectInvestigation(descriptor.choices[0].selection);
    assert.equal(original.kind, 'refuted');
    if (original.kind !== 'refuted') return;
    const before = structuredClone(original);
    const comparison = comparePreserved(
      descriptor.choices[2].selection,
      original,
    );
    assert.equal(comparison?.kind, 'excluded');
    assert.match(comparison?.reason ?? '', /excludes this witness/);
    inspectInvestigation(descriptor.choices[2].selection);
    assert.deepEqual(original, before);
    assert.equal(
      comparePreserved(descriptor.choices[0].selection, original)?.kind,
      'admitted',
    );
  });
}

function refuted(
  selection: InvestigationSelection,
): Extract<SearchReport, { kind: 'refuted' }> {
  const report = inspectInvestigation(selection);
  if (report.kind !== 'refuted')
    throw new Error('Expected an exact refutation.');
  return report;
}
test('Root and Jacobi certificates enumerate every residue and verify local obstructions independently', () => {
  for (const selection of [
    { id: 'F01', condition: 'all' },
    { id: 'F01', condition: 'odd' },
    { id: 'Q06', condition: 'all' },
    { id: 'Q06', condition: 'squarefree' },
  ] satisfies InvestigationSelection[]) {
    const witness = refuted(selection).firstWitness;
    if (witness.investigationId !== 'F01' && witness.investigationId !== 'Q06')
      throw new Error('Expected square certificate.');
    const n = Number(witness.n);
    assert.equal(witness.squareTable.length, n);
    assert.deepEqual(
      witness.squareTable.map((row) => Number(row.x)),
      Array.from({ length: n }, (_, x) => x),
    );
    for (const row of witness.squareTable)
      assert.equal(Number(row.residue), Number(row.x) ** 2 % n);
    if (witness.investigationId === 'F01') {
      const roots = Array.from({ length: n }, (_, x) => x).filter(
        (x) => (x * x - 1) % n === 0,
      );
      assert.deepEqual(witness.roots.map(Number), roots);
      assert.equal(roots.length, rootCountFromCrt(n));
      assert.notEqual((witness.rootB - witness.rootA) % witness.n, 0n);
      assert.notEqual((witness.rootB + witness.rootA) % witness.n, 0n);
      assert.equal(
        ((witness.rootB - witness.rootA) * (witness.rootB + witness.rootA)) %
          witness.n,
        0n,
      );
    } else {
      assert.deepEqual(witness.squareResidues.map(Number), squareSet(n));
      assert.equal(witness.squareResidues.includes(witness.a), false);
      assert.equal(jacobiFromLocalSquares(Number(witness.a), n), 1);
      assert.equal(
        squareSet(Number(witness.obstructingPrime)).includes(
          Number(witness.a % witness.obstructingPrime),
        ),
        false,
      );
      assert.equal(
        witness.factors.reduce(
          (product, factor) =>
            product * factor.prime ** BigInt(factor.exponent),
          1n,
        ),
        witness.n,
      );
      for (const factor of witness.factors)
        assert.equal(
          factor.sign,
          squareSet(Number(factor.prime)).includes(
            Number(witness.a % factor.prime),
          )
            ? 1
            : -1,
        );
    }
  }
});
test('Jacobi prime search distinguishes admitted inputs from true premises', () => {
  const report = inspectInvestigation({ id: 'Q06', condition: 'prime' });
  assert.ok(report.scope.admittedTuples > report.scope.premiseMatches);
  assert.equal(jacobiFromLocalSquares(2, 3), -1);
  assert.equal(squareSet(3).includes(2), false);
  assert.equal(report.kind, 'no-counterexample-within-bounds');
});
test('Registry choices round-trip through canonical URL configuration', () => {
  assert.equal(investigationCatalog().length, 5);
  for (const descriptor of investigationCatalog())
    for (const choice of descriptor.choices)
      for (const searched of [false, true]) {
        const route = { selection: choice.selection, searched };
        assert.deepEqual(
          parseInvestigationRoute(encodeInvestigationRoute(route)),
          { kind: 'valid', route },
        );
        if (choice.selection.condition === 'all')
          assert.equal(encodeInvestigationRoute(route).has('condition'), false);
      }
  assert.deepEqual(defaultInvestigation('C02'), {
    selection: { id: 'C02', condition: 'all' },
    searched: false,
  });
  assert.deepEqual(parseInvestigationRoute(new URLSearchParams('a=12')), {
    kind: 'absent',
  });
  assert.deepEqual(
    parseInvestigationRoute(new URLSearchParams('investigate=C02')),
    { kind: 'valid', route: defaultInvestigation('C02') },
  );
});
test('Unknown, cross-case, repeated and malformed URL fields recover without a report', () => {
  for (const query of [
    'investigate=C05',
    'investigate=C02&condition=prime',
    'condition=unit',
    'searched=1',
    'investigate=Q06&condition=unit',
    'investigate=C02&condition=',
    'investigate=C02&searched=0',
    'investigate=C02&searched=true',
    'investigate=C02&searched=',
    'investigate=C02&investigate=C06',
    'investigate=C02&condition=all&condition=unit',
    'investigate=C02&searched=1&searched=1',
    'investigate=c02',
    'investigate=%3Cscript%3E',
  ])
    assert.equal(
      parseInvestigationRoute(new URLSearchParams(query)).kind,
      'invalid',
      query,
    );
  assert.equal(
    comparePreserved(
      { id: 'C06', condition: 'all' },
      refuted({ id: 'C02', condition: 'all' }),
    ),
    null,
  );
});
