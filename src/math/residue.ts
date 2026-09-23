export type ResidueOperation = 'add' | 'multiply';
export type ResidueClockCell = {
  integer: string;
  residue: number;
  isFirst: boolean;
  isResult: boolean;
};
export type ResidueClass = {
  residue: number;
  isUnit: boolean;
  isFirst: boolean;
  isSecond: boolean;
  isResult: boolean;
};
export type ResidueClockResult = {
  modulus: number;
  first: string;
  second: string;
  firstClass: number;
  secondClass: number;
  operation: ResidueOperation;
  resultClass: number;
  shiftedFirst: string;
  shiftedSecond: string;
  shiftedResultClass: number;
  classes: ResidueClass[];
  cells: ResidueClockCell[];
};
export type QuadraticPair = { root: number; opposite: number; square: number };
export type QuadraticRow = {
  input: number;
  square: number;
  selectedRoot: boolean;
};
export type QuadraticResidueResult = {
  prime: number;
  input: string;
  target: number;
  symbol: -1 | 0 | 1;
  roots: number[];
  nonzeroSquares: number[];
  pairs: QuadraticPair[];
  rows: QuadraticRow[];
  closure: {
    left: number;
    right: number;
    product: number;
    productRoot: number;
  };
};

const MAX_INPUT = 1_000_000_000_000n;
function integer(
  text: string,
  min: bigint,
  max: bigint,
  label: string,
): bigint {
  if (!/^-?(0|[1-9][0-9]*)$/.test(text.trim()))
    throw new Error(`${label}: enter a whole number in standard decimal form.`);
  const value = BigInt(text.trim());
  if (value < min || value > max)
    throw new Error(`${label}: use a value from ${min} to ${max}.`);
  return value;
}
function residue(value: bigint, modulus: bigint): number {
  return Number(((value % modulus) + modulus) % modulus);
}
function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}
function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}

/** Exact arithmetic; only bounded residues and display coordinates become Number values. */
export function buildResidueClock(
  modulusText: string,
  firstText: string,
  secondText: string,
  operation: ResidueOperation,
  startText: string,
  endText: string,
): ResidueClockResult {
  const modulus = Number(integer(modulusText, 1n, 24n, 'Modulus'));
  if (operation !== 'add' && operation !== 'multiply')
    throw new Error('Choose addition or multiplication.');
  const first = integer(firstText, -MAX_INPUT, MAX_INPUT, 'First integer');
  const second = integer(secondText, -MAX_INPUT, MAX_INPUT, 'Second integer');
  const start = Number(integer(startText, -48n, 48n, 'Range start'));
  const end = Number(integer(endText, -48n, 48n, 'Range end'));
  if (start > end || end - start > 48)
    throw new Error('Choose an increasing range with at most 49 integers.');
  const n = BigInt(modulus);
  const firstClass = residue(first, n);
  const secondClass = residue(second, n);
  const resultClass = residue(
    operation === 'add' ? first + second : first * second,
    n,
  );
  const shiftedFirst = first + n;
  const shiftedSecond = second - n;
  const shiftedResultClass = residue(
    operation === 'add'
      ? shiftedFirst + shiftedSecond
      : shiftedFirst * shiftedSecond,
    n,
  );
  return {
    modulus,
    first: first.toString(),
    second: second.toString(),
    firstClass,
    secondClass,
    operation,
    resultClass,
    shiftedFirst: shiftedFirst.toString(),
    shiftedSecond: shiftedSecond.toString(),
    shiftedResultClass,
    classes: Array.from({ length: modulus }, (_, r) => ({
      residue: r,
      isUnit: gcd(r, modulus) === 1,
      isFirst: r === firstClass,
      isSecond: r === secondClass,
      isResult: r === resultClass,
    })),
    cells: Array.from({ length: end - start + 1 }, (_, i) => {
      const value = start + i;
      const r = residue(BigInt(value), n);
      return {
        integer: String(value),
        residue: r,
        isFirst: r === firstClass,
        isResult: r === resultClass,
      };
    }),
  };
}

/** The prime restriction is deliberate: two-root and Legendre claims need a field. */
export function buildQuadraticResidueMap(
  primeText: string,
  targetText: string,
): QuadraticResidueResult {
  const prime = Number(integer(primeText, 3n, 31n, 'Prime'));
  if (prime % 2 === 0 || !isPrime(prime))
    throw new Error('Choose an odd prime from 3 to 31.');
  const input = integer(targetText, -MAX_INPUT, MAX_INPUT, 'Residue');
  const p = BigInt(prime);
  const target = residue(input, p);
  const rows = Array.from({ length: prime }, (_, x) => ({
    input: x,
    square: residue(BigInt(x) * BigInt(x), p),
    selectedRoot: false,
  }));
  const roots = rows
    .filter((row) => row.square === target)
    .map((row) => row.input);
  for (const row of rows) row.selectedRoot = roots.includes(row.input);
  const pairs = Array.from({ length: (prime - 1) / 2 }, (_, i) => {
    const root = i + 1;
    return {
      root,
      opposite: prime - root,
      square: residue(BigInt(root) * BigInt(root), p),
    };
  });
  const nonzeroSquares = [...new Set(pairs.map((pair) => pair.square))].sort(
    (a, b) => a - b,
  );
  const leftRoot = pairs[0].root;
  const rightRoot = pairs[Math.min(1, pairs.length - 1)].root;
  const left = pairs[0].square;
  const right = pairs[Math.min(1, pairs.length - 1)].square;
  const productRoot = residue(BigInt(leftRoot) * BigInt(rightRoot), p);
  const product = residue(BigInt(left) * BigInt(right), p);
  return {
    prime,
    input: input.toString(),
    target,
    symbol: target === 0 ? 0 : roots.length === 0 ? -1 : 1,
    roots,
    nonzeroSquares,
    pairs,
    rows,
    closure: { left, right, product, productRoot },
  };
}
