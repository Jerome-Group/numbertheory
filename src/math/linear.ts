import { extendedEuclid, parseBoundedInteger } from './euclid.ts';

export type LinearResult = {
  a: string;
  b: string;
  n: string;
  gcd: string;
  solvable: boolean;
  count: string;
  base?: string;
  step?: string;
  sample: string[];
  reason: string;
};
const mod = (a: bigint, n: bigint) => ((a % n) + n) % n;
export function solveLinear(
  aText: string,
  bText: string,
  nText: string,
): LinearResult {
  const a = parseBoundedInteger(aText),
    b = parseBoundedInteger(bText),
    n = parseBoundedInteger(nText);
  if (n < 1n || n > 1_000_000n)
    throw new Error('The modulus must be between 1 and 1,000,000.');
  const g = BigInt(extendedEuclid(a.toString(), n.toString()).gcd);
  const common = {
    a: a.toString(),
    b: b.toString(),
    n: n.toString(),
    gcd: g.toString(),
  };
  if (b % g !== 0n)
    return {
      ...common,
      solvable: false,
      count: '0',
      sample: [],
      reason:
        'The gcd of the coefficient and modulus does not divide the target.',
    };
  const step = n / g;
  const inverse = BigInt(extendedEuclid((a / g).toString(), step.toString()).x);
  const base = mod((b / g) * inverse, step);
  const sample = Array.from({ length: Number(g < 12n ? g : 12n) }, (_, i) =>
    (base + BigInt(i) * step).toString(),
  );
  return {
    ...common,
    solvable: true,
    count: g.toString(),
    base: base.toString(),
    step: step.toString(),
    sample,
    reason:
      'All solution classes are the base class plus multiples of the reduced modulus.',
  };
}
