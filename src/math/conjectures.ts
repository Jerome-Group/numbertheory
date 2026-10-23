export type InvestigationSelection =
  | { id: 'C02'; condition: 'all' | 'nonzero' | 'unit' }
  | { id: 'C06'; condition: 'all' | 'nonzero' | 'unit' }
  | { id: 'C07'; condition: 'all' | 'distinct' | 'coprime' }
  | { id: 'F01'; condition: 'all' | 'odd' | 'prime' }
  | { id: 'Q06'; condition: 'all' | 'squarefree' | 'prime' };
export type InvestigationId = InvestigationSelection['id'];
type SelectionFor<I extends InvestigationId> = Extract<
  InvestigationSelection,
  { id: I }
>;
export type InvestigationRoute = {
  selection: InvestigationSelection;
  searched: boolean;
};
type DescriptorFor<I extends InvestigationId> = {
  id: I;
  title: string;
  statement: string;
  accessibleStatement: string;
  qualifier: string;
  domain: string;
  order: string;
  choices: readonly {
    selection: SelectionFor<I>;
    label: string;
    detail: string;
  }[];
  bridge: string;
  proofLessonId: string;
  notebookLessonId: string;
};
export type InvestigationDescriptor = {
  [I in InvestigationId]: DescriptorFor<I>;
}[InvestigationId];

const registry = {
  C02: {
    id: 'C02',
    title: 'Cancel a factor',
    statement: 'If ca ≡ cb (mod n), then a ≡ b (mod n).',
    accessibleStatement:
      'If c times a is congruent to c times b modulo n, then a is congruent to b modulo n.',
    qualifier:
      'Does multiplying by c preserve the difference between two residue classes?',
    domain: '2 ≤ n ≤ 18; every 0 ≤ c, a, b < n.',
    order: 'Increasing n, c, a, b.',
    choices: [
      {
        selection: { id: 'C02', condition: 'all' },
        label: 'No extra condition',
        detail: 'Every factor c is allowed.',
      },
      {
        selection: { id: 'C02', condition: 'nonzero' },
        label: 'Exclude the zero factor',
        detail: 'Require c ≠ 0.',
      },
      {
        selection: { id: 'C02', condition: 'unit' },
        label: 'Require an invertible factor',
        detail: 'Require gcd(c, n) = 1.',
      },
    ],
    bridge:
      'If gcd(c,n)=1, Bézout gives an inverse for c modulo n. Multiplying both sides by that inverse preserves the congruence. C02 also proves the general cancellation rule modulo n/gcd(c,n).',
    proofLessonId: 'C02',
    notebookLessonId: 'C02',
  },
  C06: {
    id: 'C06',
    title: 'Make powers return',
    statement: 'a^φ(n) ≡ 1 (mod n).',
    accessibleStatement:
      'a raised to the totient of n is congruent to one modulo n.',
    qualifier:
      'The totient φ(n) counts unit classes. Does its exponent work for every residue?',
    domain: '2 ≤ n ≤ 24; every residue 0 ≤ a < n.',
    order: 'Increasing n, a.',
    choices: [
      {
        selection: { id: 'C06', condition: 'all' },
        label: 'No extra condition',
        detail: 'Every residue a is allowed.',
      },
      {
        selection: { id: 'C06', condition: 'nonzero' },
        label: 'Exclude zero',
        detail: 'Require a ≠ 0.',
      },
      {
        selection: { id: 'C06', condition: 'unit' },
        label: 'Require an invertible residue',
        detail: 'Require gcd(a, n) = 1.',
      },
    ],
    bridge:
      'A unit permutes the unit classes by multiplication. Comparing their products and cancelling their invertible product gives Euler’s congruence. Coprimality makes that cancellation valid.',
    proofLessonId: 'C06',
    notebookLessonId: 'C06',
  },
  C07: {
    id: 'C07',
    title: 'Multiply totients',
    statement: 'φ(mn) = φ(m) · φ(n).',
    accessibleStatement:
      'The totient of m times n equals the totient of m times the totient of n.',
    qualifier:
      'Each totient counts integers coprime to its argument. When do these counts multiply?',
    domain:
      'Every ordered integer pair 2 ≤ m, n ≤ 16. Products are at most 256.',
    order: 'Increasing m, n.',
    choices: [
      {
        selection: { id: 'C07', condition: 'all' },
        label: 'No extra condition',
        detail: 'Every pair of moduli is allowed.',
      },
      {
        selection: { id: 'C07', condition: 'distinct' },
        label: 'Use two different moduli',
        detail: 'Require m ≠ n.',
      },
      {
        selection: { id: 'C07', condition: 'coprime' },
        label: 'Require coprime moduli',
        detail: 'Require gcd(m, n) = 1.',
      },
    ],
    bridge:
      'For coprime m and n, the Chinese remainder map gives a bijection between unit classes modulo mn and pairs of unit classes modulo m and n. Counting those pairs proves the product formula.',
    proofLessonId: 'C07',
    notebookLessonId: 'C07',
  },
  F01: {
    id: 'F01',
    title: 'Count polynomial roots',
    statement: 'x² − 1 has at most two roots modulo n.',
    accessibleStatement:
      'x squared minus one has at most two distinct roots modulo n.',
    qualifier:
      'This fixes one monic, nonzero polynomial of formal degree two. It does not search all polynomials.',
    domain: '2 ≤ n ≤ 31; test every residue 0 ≤ x < n for x² − 1.',
    order: 'Increasing n; every x from 0 to n−1.',
    choices: [
      {
        selection: { id: 'F01', condition: 'all' },
        label: 'No extra condition',
        detail: 'Every modulus is allowed.',
      },
      {
        selection: { id: 'F01', condition: 'odd' },
        label: 'Exclude even moduli',
        detail: 'Require n to be odd.',
      },
      {
        selection: { id: 'F01', condition: 'prime' },
        label: 'Work over a field',
        detail: 'Require n to be prime.',
      },
    ],
    bridge:
      'Over a field, a second root b of (x−a)g(x) gives (b−a)g(b)=0. The nonzero difference b−a is invertible, so g(b)=0. This cancellation supports the general bound on polynomial roots.',
    proofLessonId: 'F01',
    notebookLessonId: 'F01',
  },
  Q06: {
    id: 'Q06',
    title: 'Trust a Jacobi sign?',
    statement: 'If J(a,n) = 1, then x² ≡ a (mod n) has a solution.',
    accessibleStatement:
      'If the Jacobi symbol of a over n is one, then x squared is congruent to a modulo n has a solution.',
    qualifier:
      'The Jacobi symbol multiplies local Legendre signs. This tests a proposed converse, not Q06’s theorem.',
    domain:
      'Odd 3 ≤ n ≤ 35; every 1 ≤ a < n with gcd(a,n)=1. Count J(a,n)=1 separately as the premise.',
    order: 'Increasing n, a; every possible root x from 0 to n−1.',
    choices: [
      {
        selection: { id: 'Q06', condition: 'all' },
        label: 'No extra condition',
        detail: 'Every odd modulus in the range is allowed.',
      },
      {
        selection: { id: 'Q06', condition: 'squarefree' },
        label: 'Remove repeated prime factors',
        detail: 'Require n to be squarefree.',
      },
      {
        selection: { id: 'Q06', condition: 'prime' },
        label: 'Use a single prime modulus',
        detail: 'Require n to be prime.',
      },
    ],
    bridge:
      'At an odd prime the Jacobi symbol is the Legendre symbol. A value of 1 means a nonzero square. At composite moduli, negative local signs can multiply to 1. Q01 proves the prime equivalence; Q06 explains the lost information.',
    proofLessonId: 'Q01',
    notebookLessonId: 'Q06',
  },
} satisfies { [I in InvestigationId]: DescriptorFor<I> };

export function investigationCatalog(): readonly InvestigationDescriptor[] {
  return Object.values(registry);
}
export function investigationFor(id: InvestigationId): InvestigationDescriptor {
  return registry[id];
}
export function defaultInvestigation(id: InvestigationId): InvestigationRoute {
  return { selection: registry[id].choices[0].selection, searched: false };
}
export type SelectionParse =
  | { kind: 'absent' }
  | { kind: 'valid'; route: InvestigationRoute }
  | { kind: 'invalid'; message: string };
export function parseInvestigationRoute(
  query: URLSearchParams,
): SelectionParse {
  const keys = ['investigate', 'condition', 'searched'];
  if (keys.every((key) => !query.has(key))) return { kind: 'absent' };
  const invalid: SelectionParse = {
    kind: 'invalid',
    message:
      'Unknown investigation or condition in this link. Choose a Conjecture Clinic investigation below.',
  };
  if (keys.some((key) => query.getAll(key).length > 1)) return invalid;
  const descriptor = investigationCatalog().find(
    (item) => item.id === query.get('investigate'),
  );
  const condition = query.get('condition') ?? 'all';
  const choice = descriptor?.choices.find(
    (item) => item.selection.condition === condition,
  );
  const searched = query.get('searched');
  if (!choice || (searched !== null && searched !== '1')) return invalid;
  return {
    kind: 'valid',
    route: { selection: choice.selection, searched: searched === '1' },
  };
}
export function encodeInvestigationRoute(
  route: InvestigationRoute,
): URLSearchParams {
  const query = new URLSearchParams({ investigate: route.selection.id });
  if (route.selection.condition !== 'all')
    query.set('condition', route.selection.condition);
  if (route.searched) query.set('searched', '1');
  return query;
}

type SquareRow = { x: bigint; residue: bigint };
type LocalSign = { prime: bigint; exponent: number; sign: -1 | 1 };
type WitnessById = {
  C02: {
    investigationId: 'C02';
    n: bigint;
    c: bigint;
    a: bigint;
    b: bigint;
    productResidue: bigint;
    gcd: bigint;
    survivingModulus: bigint;
  };
  C06: {
    investigationId: 'C06';
    n: bigint;
    a: bigint;
    phi: bigint;
    powerResidue: bigint;
    gcd: bigint;
    units: readonly bigint[];
  };
  C07: {
    investigationId: 'C07';
    m: bigint;
    n: bigint;
    phiM: bigint;
    phiN: bigint;
    phiProduct: bigint;
    gcd: bigint;
  };
  F01: {
    investigationId: 'F01';
    n: bigint;
    roots: readonly bigint[];
    squareTable: readonly SquareRow[];
    rootA: bigint;
    rootB: bigint;
  };
  Q06: {
    investigationId: 'Q06';
    n: bigint;
    a: bigint;
    factors: readonly LocalSign[];
    squareTable: readonly SquareRow[];
    squareResidues: readonly bigint[];
    obstructingPrime: bigint;
  };
};
export type InvestigationWitness = WitnessById[InvestigationId];
export type EvidenceDisplay = {
  summary: string;
  premise: readonly string[];
  contradiction: readonly string[];
  explanation: string;
  details: readonly string[];
  tables: readonly {
    title: string;
    headings: readonly string[];
    rows: readonly (readonly string[])[];
  }[];
};
type Counts = {
  admittedTuples: number;
  premiseMatches: number;
  counterexamples: number;
};
type ReportFor<I extends InvestigationId> = {
  investigationId: I;
  selection: SelectionFor<I>;
} & (
  | {
      kind: 'refuted';
      scope: Counts;
      firstWitness: WitnessById[I];
      display: EvidenceDisplay;
    }
  | {
      kind: 'no-counterexample-within-bounds';
      scope: Omit<Counts, 'counterexamples'> & { counterexamples: 0 };
    }
);
export type SearchReport = {
  [I in InvestigationId]: ReportFor<I>;
}[InvestigationId];
export type RefutedReport = Extract<SearchReport, { kind: 'refuted' }>;
export type KeptWitnesses = ReadonlyMap<InvestigationId, RefutedReport>;

function gcd(a: bigint, b: bigint): bigint {
  while (b) [a, b] = [b, a % b];
  return a;
}
function units(n: bigint): bigint[] {
  const values: bigint[] = [];
  for (let a = 1n; a < n; a++) if (gcd(a, n) === 1n) values.push(a);
  return values;
}
function phi(n: bigint): bigint {
  return BigInt(units(n).length);
}
function powerMod(a: bigint, exponent: bigint, n: bigint): bigint {
  let value = 1n;
  for (; exponent; exponent /= 2n, a = (a * a) % n)
    if (exponent % 2n) value = (value * a) % n;
  return value;
}
function factors(n: bigint): { prime: bigint; exponent: number }[] {
  const result: { prime: bigint; exponent: number }[] = [];
  for (let p = 2n; p * p <= n; p++) {
    let exponent = 0;
    while (n % p === 0n) {
      n /= p;
      exponent++;
    }
    if (exponent) result.push({ prime: p, exponent });
  }
  if (n > 1n) result.push({ prime: n, exponent: 1 });
  return result;
}
function prime(n: bigint): boolean {
  return n >= 2n && factors(n).length === 1 && factors(n)[0].exponent === 1;
}
function squarefree(n: bigint): boolean {
  return factors(n).every((factor) => factor.exponent === 1);
}
function squares(n: bigint): SquareRow[] {
  const rows: SquareRow[] = [];
  for (let x = 0n; x < n; x++) rows.push({ x, residue: (x * x) % n });
  return rows;
}
function localSigns(a: bigint, n: bigint): LocalSign[] {
  return factors(n).map((factor) => ({
    ...factor,
    sign: powerMod(a, (factor.prime - 1n) / 2n, factor.prime) === 1n ? 1 : -1,
  }));
}
function finalReport<I extends InvestigationId>(
  selection: SelectionFor<I>,
  scope: Counts,
  witness: WitnessById[I] | null,
): ReportFor<I> {
  return witness === null
    ? {
        investigationId: selection.id,
        selection,
        scope: { ...scope, counterexamples: 0 },
        kind: 'no-counterexample-within-bounds',
      }
    : {
        investigationId: selection.id,
        selection,
        scope,
        kind: 'refuted',
        firstWitness: witness,
        display: describeWitness(witness),
      };
}
function cancellation(selection: SelectionFor<'C02'>): ReportFor<'C02'> {
  const scope: Counts = {
    admittedTuples: 0,
    premiseMatches: 0,
    counterexamples: 0,
  };
  let witness: WitnessById['C02'] | null = null;
  for (let n = 2n; n <= 18n; n++)
    for (let c = 0n; c < n; c++) {
      const d = gcd(c, n);
      if (
        (selection.condition === 'nonzero' && c === 0n) ||
        (selection.condition === 'unit' && d !== 1n)
      )
        continue;
      for (let a = 0n; a < n; a++)
        for (let b = 0n; b < n; b++) {
          scope.admittedTuples++;
          if ((c * a) % n !== (c * b) % n) continue;
          scope.premiseMatches++;
          if (a === b) continue;
          scope.counterexamples++;
          witness ??= {
            investigationId: 'C02',
            n,
            c,
            a,
            b,
            productResidue: (c * a) % n,
            gcd: d,
            survivingModulus: n / d,
          };
        }
    }
  return finalReport<'C02'>(selection, scope, witness);
}
function euler(selection: SelectionFor<'C06'>): ReportFor<'C06'> {
  const scope: Counts = {
    admittedTuples: 0,
    premiseMatches: 0,
    counterexamples: 0,
  };
  let witness: WitnessById['C06'] | null = null;
  for (let n = 2n; n <= 24n; n++)
    for (let a = 0n; a < n; a++) {
      const d = gcd(a, n);
      if (
        (selection.condition === 'nonzero' && a === 0n) ||
        (selection.condition === 'unit' && d !== 1n)
      )
        continue;
      scope.admittedTuples++;
      scope.premiseMatches++;
      const exponent = phi(n),
        residue = powerMod(a, exponent, n);
      if (residue === 1n) continue;
      scope.counterexamples++;
      witness ??= {
        investigationId: 'C06',
        n,
        a,
        phi: exponent,
        powerResidue: residue,
        gcd: d,
        units: units(n),
      };
    }
  return finalReport<'C06'>(selection, scope, witness);
}
function totient(selection: SelectionFor<'C07'>): ReportFor<'C07'> {
  const scope: Counts = {
    admittedTuples: 0,
    premiseMatches: 0,
    counterexamples: 0,
  };
  let witness: WitnessById['C07'] | null = null;
  for (let m = 2n; m <= 16n; m++)
    for (let n = 2n; n <= 16n; n++) {
      const d = gcd(m, n);
      if (
        (selection.condition === 'distinct' && m === n) ||
        (selection.condition === 'coprime' && d !== 1n)
      )
        continue;
      scope.admittedTuples++;
      scope.premiseMatches++;
      const phiM = phi(m),
        phiN = phi(n),
        phiProduct = phi(m * n);
      if (phiProduct === phiM * phiN) continue;
      scope.counterexamples++;
      witness ??= {
        investigationId: 'C07',
        m,
        n,
        phiM,
        phiN,
        phiProduct,
        gcd: d,
      };
    }
  return finalReport<'C07'>(selection, scope, witness);
}
function rootBound(selection: SelectionFor<'F01'>): ReportFor<'F01'> {
  const scope: Counts = {
    admittedTuples: 0,
    premiseMatches: 0,
    counterexamples: 0,
  };
  let witness: WitnessById['F01'] | null = null;
  for (let n = 2n; n <= 31n; n++) {
    if (
      (selection.condition === 'odd' && n % 2n === 0n) ||
      (selection.condition === 'prime' && !prime(n))
    )
      continue;
    scope.admittedTuples++;
    scope.premiseMatches++;
    const squareTable = squares(n),
      roots = squareTable
        .filter((row) => row.residue === 1n)
        .map((row) => row.x);
    if (roots.length <= 2) continue;
    scope.counterexamples++;
    witness ??= {
      investigationId: 'F01',
      n,
      roots,
      squareTable,
      rootA: roots[0],
      rootB: roots[1],
    };
  }
  return finalReport<'F01'>(selection, scope, witness);
}
function jacobiConverse(selection: SelectionFor<'Q06'>): ReportFor<'Q06'> {
  const scope: Counts = {
    admittedTuples: 0,
    premiseMatches: 0,
    counterexamples: 0,
  };
  let witness: WitnessById['Q06'] | null = null;
  for (let n = 3n; n <= 35n; n += 2n) {
    if (
      (selection.condition === 'squarefree' && !squarefree(n)) ||
      (selection.condition === 'prime' && !prime(n))
    )
      continue;
    const squareTable = squares(n),
      squareResidues = [...new Set(squareTable.map((row) => row.residue))].sort(
        (a, b) => (a < b ? -1 : a > b ? 1 : 0),
      );
    for (let a = 1n; a < n; a++) {
      if (gcd(a, n) !== 1n) continue;
      scope.admittedTuples++;
      const signs = localSigns(a, n);
      if (
        signs.reduce(
          (product, factor) => product * factor.sign ** factor.exponent,
          1,
        ) !== 1
      )
        continue;
      scope.premiseMatches++;
      if (squareResidues.includes(a)) continue;
      scope.counterexamples++;
      const obstruction = signs.find((factor) => factor.sign === -1);
      if (!obstruction)
        throw new Error(
          'A Jacobi counterexample requires a negative local sign.',
        );
      witness ??= {
        investigationId: 'Q06',
        n,
        a,
        factors: signs,
        squareTable,
        squareResidues,
        obstructingPrime: obstruction.prime,
      };
    }
  }
  return finalReport<'Q06'>(selection, scope, witness);
}
export function inspectInvestigation(
  selection: InvestigationSelection,
): SearchReport {
  switch (selection.id) {
    case 'C02':
      return cancellation(selection);
    case 'C06':
      return euler(selection);
    case 'C07':
      return totient(selection);
    case 'F01':
      return rootBound(selection);
    case 'Q06':
      return jacobiConverse(selection);
    default: {
      const exhaustive: never = selection;
      return exhaustive;
    }
  }
}

function describeWitness(witness: InvestigationWitness): EvidenceDisplay {
  switch (witness.investigationId) {
    case 'C02':
      return {
        summary: `n = ${witness.n}, c = ${witness.c}, a = ${witness.a}, b = ${witness.b}`,
        premise: [
          `${witness.c} · ${witness.a} ≡ ${witness.productResidue} (mod ${witness.n})`,
          `${witness.c} · ${witness.b} ≡ ${witness.productResidue} (mod ${witness.n})`,
        ],
        contradiction: [`${witness.a} ≢ ${witness.b} (mod ${witness.n})`],
        explanation: `Multiplication by ${witness.c} merges different classes. Its gcd with ${witness.n} is ${witness.gcd}. Cancellation preserves a congruence modulo ${witness.survivingModulus}, rather than modulo ${witness.n}.`,
        details: [
          `c(a−b) = ${witness.c * (witness.a - witness.b)} is divisible by ${witness.n}.`,
          `a−b = ${witness.a - witness.b} is not divisible by ${witness.n}.`,
        ],
        tables: [],
      };
    case 'C06':
      return {
        summary: `n = ${witness.n}, a = ${witness.a}`,
        premise: [
          `n = ${witness.n}, a = ${witness.a}, φ(${witness.n}) = ${witness.phi}`,
        ],
        contradiction: [
          `${witness.a}^${witness.phi} ≡ ${witness.powerResidue} ≠ 1 (mod ${witness.n})`,
        ],
        explanation: `gcd(${witness.a},${witness.n}) = ${witness.gcd}. This a is not a unit. Its multiplication does not permute the unit classes, so the proof’s cancellation cannot be used.`,
        details: [
          `The complete unit set modulo ${witness.n} is {${witness.units.join(', ')}}. Its size is ${witness.phi}.`,
          'Powers are computed with exact integer modular multiplication.',
        ],
        tables: [],
      };
    case 'C07':
      return {
        summary: `m = ${witness.m}, n = ${witness.n}`,
        premise: [
          `m = ${witness.m}, n = ${witness.n}`,
          `gcd(${witness.m},${witness.n}) = ${witness.gcd}`,
        ],
        contradiction: [
          `φ(${witness.m * witness.n}) = ${witness.phiProduct}`,
          `φ(${witness.m}) · φ(${witness.n}) = ${witness.phiM} · ${witness.phiN} = ${witness.phiM * witness.phiN}`,
          `${witness.phiProduct} ≠ ${witness.phiM * witness.phiN}`,
        ],
        explanation:
          'Shared factors prevent the Chinese remainder bijection modulo the product. Distinct moduli can still share factors.',
        details: [
          `Each totient counts only coprime residues in a complete residue system. Computing φ(${witness.m * witness.n}) checks all ${witness.m * witness.n} candidates modulo the product.`,
        ],
        tables: [],
      };
    case 'F01':
      return {
        summary: `n = ${witness.n}; roots = {${witness.roots.join(', ')}}`,
        premise: [
          `f(x) = x² − 1 is monic and has formal degree 2.`,
          `n = ${witness.n}`,
        ],
        contradiction: [
          `Roots = {${witness.roots.join(', ')}}`,
          `${witness.roots.length} distinct roots exceed degree 2.`,
        ],
        explanation: `For roots a=${witness.rootA} and b=${witness.rootB}, (b−a)(b+a) = ${witness.rootB - witness.rootA} · ${witness.rootB + witness.rootA} ≡ 0 (mod ${witness.n}). Both factors are nonzero modulo ${witness.n}. The field proof’s cancellation fails.`,
        details: witness.roots.map(
          (x) =>
            `${x}² − 1 = ${x * x - 1n} = ${witness.n} · ${(x * x - 1n) / witness.n}.`,
        ),
        tables: [
          {
            title: `Complete root check modulo ${witness.n}`,
            headings: ['x', 'x² mod n', 'Root of x² − 1?'],
            rows: witness.squareTable.map((row) => [
              String(row.x),
              String(row.residue),
              row.residue === 1n ? 'Yes' : 'No',
            ]),
          },
        ],
      };
    case 'Q06':
      return {
        summary: `n = ${witness.n}, a = ${witness.a}`,
        premise: [
          `gcd(${witness.a},${witness.n}) = 1`,
          `J(${witness.a},${witness.n}) = ${witness.factors.map((factor) => `(${factor.sign})^${factor.exponent}`).join(' · ')} = 1`,
        ],
        contradiction: [
          `Square residues mod ${witness.n} = {${witness.squareResidues.join(', ')}}`,
          `${witness.a} is absent. There is no square root.`,
        ],
        explanation: `A root modulo ${witness.n} would give a root modulo ${witness.obstructingPrime}. Its local Legendre sign is −1. A positive Jacobi product has hidden that local obstruction.`,
        details: [
          `${witness.n} = ${witness.factors.map((factor) => `${factor.prime}^${factor.exponent}`).join(' · ')}`,
          ...witness.factors.flatMap((factor) => [
            `Legendre (${witness.a}/${factor.prime}) = ${factor.sign}, with exponent ${factor.exponent}.`,
            `Squares modulo ${factor.prime} = {${[...new Set(squares(factor.prime).map((row) => row.residue))].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)).join(', ')}}. The residue ${witness.a % factor.prime} is ${factor.sign === 1 ? 'present' : 'absent'}.`,
          ]),
        ],
        tables: [
          {
            title: `Complete square check modulo ${witness.n}`,
            headings: ['x', 'x² mod n'],
            rows: witness.squareTable.map((row) => [
              String(row.x),
              String(row.residue),
            ]),
          },
        ],
      };
    default: {
      const exhaustive: never = witness;
      return exhaustive;
    }
  }
}

export function comparePreserved(
  selection: InvestigationSelection,
  kept: RefutedReport,
): { kind: 'admitted' | 'excluded'; reason: string } | null {
  if (selection.id !== kept.investigationId) return null;
  const witness = kept.firstWitness,
    condition = selection.condition;
  let admitted = true,
    reason = 'No extra condition excludes this witness.';
  switch (witness.investigationId) {
    case 'C02':
      if (condition === 'unit') {
        admitted = witness.gcd === 1n;
        reason = `gcd(${witness.c},${witness.n}) = ${witness.gcd}.`;
      }
      if (condition === 'nonzero') {
        admitted = witness.c !== 0n;
        reason = `The factor c = ${witness.c} is ${admitted ? 'nonzero' : 'zero'}.`;
      }
      break;
    case 'C06':
      if (condition === 'unit') {
        admitted = witness.gcd === 1n;
        reason = `gcd(${witness.a},${witness.n}) = ${witness.gcd}.`;
      }
      if (condition === 'nonzero') {
        admitted = witness.a !== 0n;
        reason = `The residue a = ${witness.a} is ${admitted ? 'nonzero' : 'zero'}.`;
      }
      break;
    case 'C07':
      if (condition === 'coprime') {
        admitted = witness.gcd === 1n;
        reason = `gcd(${witness.m},${witness.n}) = ${witness.gcd}.`;
      }
      if (condition === 'distinct') {
        admitted = witness.m !== witness.n;
        reason = `${witness.m} and ${witness.n} are ${admitted ? 'distinct' : 'equal'}.`;
      }
      break;
    case 'F01':
      if (condition === 'prime') {
        admitted = prime(witness.n);
        reason = `${witness.n} is ${admitted ? 'prime' : 'composite'}.`;
      }
      if (condition === 'odd') {
        admitted = witness.n % 2n === 1n;
        reason = `${witness.n} is ${admitted ? 'odd' : 'even'}.`;
      }
      break;
    case 'Q06':
      if (condition === 'prime') {
        admitted = prime(witness.n);
        reason = `${witness.n} is ${admitted ? 'prime' : 'composite'}.`;
      }
      if (condition === 'squarefree') {
        admitted = squarefree(witness.n);
        reason = `${witness.n} is ${admitted ? 'squarefree' : 'not squarefree'}.`;
      }
      break;
    default: {
      const exhaustive: never = witness;
      return exhaustive;
    }
  }
  return {
    kind: admitted ? 'admitted' : 'excluded',
    reason: `${reason} The current condition ${admitted ? 'admits' : 'excludes'} this witness.`,
  };
}

export function spokenMath(text: string): string {
  return text
    .replaceAll('≢', ' is not congruent to ')
    .replaceAll('≡', ' is congruent to ')
    .replaceAll('≠', ' is not equal to ')
    .replaceAll('≤', ' is less than or equal to ')
    .replaceAll('φ', 'totient ')
    .replaceAll('gcd', 'greatest common divisor ')
    .replaceAll('J(', 'Jacobi symbol (')
    .replaceAll('²', ' squared')
    .replaceAll('^', ' raised to ')
    .replaceAll('·', ' times ')
    .replaceAll('−', ' minus ');
}
