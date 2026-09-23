export type EuclidStep = {
  dividend: string;
  divisor: string;
  quotient: string;
  remainder: string;
};
export type EuclidResult = {
  a: string;
  b: string;
  gcd: string;
  x: string;
  y: string;
  steps: EuclidStep[];
};

const MAX_ABS = 1_000_000_000_000n;
export function parseBoundedInteger(input: string): bigint {
  if (!/^-?(0|[1-9][0-9]*)$/.test(input))
    throw new Error('Enter a whole number in standard decimal form.');
  const value = BigInt(input);
  if (value < -MAX_ABS || value > MAX_ABS)
    throw new Error(
      'Use an integer with absolute value at most 1,000,000,000,000.',
    );
  return value;
}

export function extendedEuclid(aText: string, bText: string): EuclidResult {
  const a = parseBoundedInteger(aText);
  const b = parseBoundedInteger(bText);
  if (a === 0n && b === 0n)
    throw new Error(
      'The gcd of two zero inputs is not defined in this lesson.',
    );
  let oldR = a < 0n ? -a : a;
  let r = b < 0n ? -b : b;
  let oldS = 1n,
    s = 0n,
    oldT = 0n,
    t = 1n;
  const steps: EuclidStep[] = [];
  while (r !== 0n) {
    const q = oldR / r;
    const nextR = oldR - q * r;
    steps.push({
      dividend: oldR.toString(),
      divisor: r.toString(),
      quotient: q.toString(),
      remainder: nextR.toString(),
    });
    [oldR, r] = [r, nextR];
    [oldS, s] = [s, oldS - q * s];
    [oldT, t] = [t, oldT - q * t];
  }
  const x = a < 0n ? -oldS : oldS;
  const y = b < 0n ? -oldT : oldT;
  return {
    a: a.toString(),
    b: b.toString(),
    gcd: oldR.toString(),
    x: x.toString(),
    y: y.toString(),
    steps,
  };
}
