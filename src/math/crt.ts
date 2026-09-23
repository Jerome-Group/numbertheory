import { extendedEuclid, parseBoundedInteger } from './euclid.ts';
export type CrtResult = {
  a: string;
  m: string;
  b: string;
  n: string;
  compatible: boolean;
  gcd: string;
  residue?: string;
  modulus?: string;
  reason: string;
};
const mod = (a: bigint, n: bigint) => ((a % n) + n) % n;
export function solveCrt(
  aText: string,
  mText: string,
  bText: string,
  nText: string,
): CrtResult {
  const a = parseBoundedInteger(aText),
    b = parseBoundedInteger(bText);
  const m = parseBoundedInteger(mText),
    n = parseBoundedInteger(nText);
  if (m < 1n || n < 1n || m > 1_000_000n || n > 1_000_000n)
    throw new Error(
      'Each modulus must be a positive integer at most 1,000,000.',
    );
  const g = BigInt(extendedEuclid(m.toString(), n.toString()).gcd);
  const common = {
    a: mod(a, m).toString(),
    m: m.toString(),
    b: mod(b, n).toString(),
    n: n.toString(),
    gcd: g.toString(),
  };
  if ((b - a) % g !== 0n)
    return {
      ...common,
      compatible: false,
      reason:
        'The residues disagree modulo the gcd of the moduli, so no integer satisfies both congruences.',
    };
  const reducedN = n / g;
  const inverse = BigInt(
    extendedEuclid((m / g).toString(), reducedN.toString()).x,
  );
  const k = mod(((b - a) / g) * inverse, reducedN);
  const lcm = (m / g) * n;
  const x = mod(a + m * k, lcm);
  return {
    ...common,
    compatible: true,
    residue: x.toString(),
    modulus: lcm.toString(),
    reason:
      'Compatible residues determine one class modulo the least common multiple.',
  };
}
