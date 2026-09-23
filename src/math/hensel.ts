export type HenselBranchKind = 'unique' | 'none' | 'all';
export type HenselCandidate = {
  digit: number;
  residue: number;
  isRoot: boolean;
};
export type HenselBranch = {
  level: number;
  modulus: number;
  parent: number;
  quotient: string;
  quotientClass: number;
  derivative: string;
  derivativeClass: number;
  kind: HenselBranchKind;
  candidates: HenselCandidate[];
};
export type HenselLevel = { level: number; modulus: number; roots: number[] };
export type HenselTree = {
  prime: number;
  c: string;
  requestedLevels: number;
  levels: HenselLevel[];
  branches: HenselBranch[];
  finalRoots: number[];
};
const MAX_C = 1_000_000_000_000n;
function parseInteger(
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
function isPrime(value: number): boolean {
  if (value < 2) return false;
  for (let divisor = 2; divisor * divisor <= value; divisor++)
    if (value % divisor === 0) return false;
  return true;
}
function mod(value: bigint, modulus: bigint): number {
  return Number(((value % modulus) + modulus) % modulus);
}

/** Complete bounded lift tree for x²-c, with exact integer arithmetic. */
export function buildHenselTree(
  primeText: string,
  cText: string,
  levelsText: string,
): HenselTree {
  const prime = Number(parseInteger(primeText, 3n, 13n, 'Prime'));
  if (prime % 2 === 0 || !isPrime(prime))
    throw new Error('Choose an odd prime from 3 to 13.');
  const c = parseInteger(cText, -MAX_C, MAX_C, 'Constant');
  const requestedLevels = Number(parseInteger(levelsText, 1n, 4n, 'Levels'));
  if (BigInt(prime) ** BigInt(requestedLevels) > 10_000n)
    throw new Error('Choose levels with prime power at most 10,000.');
  const p = BigInt(prime);
  const initialRoots = Array.from({ length: prime }, (_, a) => a).filter(
    (a) => mod(BigInt(a) ** 2n - c, p) === 0,
  );
  const levels: HenselLevel[] = [
    { level: 1, modulus: prime, roots: initialRoots },
  ];
  const branches: HenselBranch[] = [];
  for (let level = 1; level < requestedLevels; level++) {
    const modulus = prime ** level;
    const nextModulus = modulus * prime;
    const roots: number[] = [];
    for (const parent of levels[level - 1].roots) {
      const a = BigInt(parent);
      const f = a * a - c;
      const quotient = f / BigInt(modulus);
      const derivative = 2n * a;
      const quotientClass = mod(quotient, p);
      const derivativeClass = mod(derivative, p);
      const candidates = Array.from({ length: prime }, (_, digit) => {
        const residue = parent + digit * modulus;
        const isRoot =
          mod(BigInt(residue) ** 2n - c, BigInt(nextModulus)) === 0;
        if (isRoot) roots.push(residue);
        return { digit, residue, isRoot };
      });
      const kind: HenselBranchKind =
        derivativeClass !== 0 ? 'unique' : quotientClass === 0 ? 'all' : 'none';
      const expected = kind === 'unique' ? 1 : kind === 'all' ? prime : 0;
      if (
        candidates.filter((candidate) => candidate.isRoot).length !== expected
      )
        throw new Error(
          'Internal lift count disagrees with the digit equation.',
        );
      branches.push({
        level,
        modulus,
        parent,
        quotient: quotient.toString(),
        quotientClass,
        derivative: derivative.toString(),
        derivativeClass,
        kind,
        candidates,
      });
    }
    levels.push({ level: level + 1, modulus: nextModulus, roots });
  }
  return {
    prime,
    c: c.toString(),
    requestedLevels,
    levels,
    branches,
    finalRoots: levels[levels.length - 1].roots,
  };
}
