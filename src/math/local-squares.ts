import { solveCrt } from './crt.ts';

export type LocalSquareResult = {
  modulus: number;
  target: string;
  local: {
    prime: number;
    exponent: number;
    modulus: number;
    roots: number[];
    condition: string;
  }[];
  roots: number[];
  obstruction: string | null;
};

function factors(n: number) {
  const output: { prime: number; exponent: number; modulus: number }[] = [];
  for (let p = 2; p * p <= n; p++) {
    if (n % p !== 0) continue;
    let exponent = 0;
    let power = 1;
    while (n % p === 0) {
      n /= p;
      exponent++;
      power *= p;
    }
    output.push({ prime: p, exponent, modulus: power });
  }
  if (n > 1) output.push({ prime: n, exponent: 1, modulus: n });
  return output;
}

function localCondition(a: number, p: number, k: number): string {
  if (a === 0)
    return `Zero target: roots must be divisible by ${p}^${Math.ceil(k / 2)}.`;
  let t = 0;
  let unit = a;
  while (unit % p === 0) {
    t++;
    unit /= p;
  }
  if (t % 2 !== 0) return `Obstruction: valuation ${t} is odd.`;
  const depth = k - t;
  if (p === 2) {
    if (depth >= 3 && unit % 8 !== 1)
      return `Obstruction: the odd unit is ${unit % 8} modulo 8, not 1.`;
    if (depth === 2 && unit % 4 !== 1)
      return `Obstruction: the odd unit is ${unit % 4} modulo 4, not 1.`;
    return `The unit passes the power-of-two square test at depth ${depth}.`;
  }
  const residue = unit % p;
  let isSquare = false;
  for (let x = 1; x < p; x++) if ((x * x) % p === residue) isSquare = true;
  return isSquare
    ? `The unit is a square modulo ${p}; its roots lift.`
    : `Obstruction: the unit is not a square modulo ${p}.`;
}

export function solveLocalSquares(
  modulusText: string,
  targetText: string,
): LocalSquareResult {
  if (!/^[1-9][0-9]*$/.test(modulusText))
    throw new Error('Enter a positive modulus.');
  const modulus = Number(modulusText);
  if (!Number.isSafeInteger(modulus) || modulus < 2 || modulus > 128)
    throw new Error('Modulus must be between 2 and 128.');
  if (!/^-?(0|[1-9][0-9]*)$/.test(targetText) || targetText.length > 14)
    throw new Error('Enter a bounded integer target.');
  const target = BigInt(targetText);
  const local = factors(modulus).map(({ prime, exponent, modulus: power }) => {
    const a = Number(
      ((target % BigInt(power)) + BigInt(power)) % BigInt(power),
    );
    const roots: number[] = [];
    for (let x = 0; x < power; x++) if ((x * x) % power === a) roots.push(x);
    return {
      prime,
      exponent,
      modulus: power,
      roots,
      condition: localCondition(a, prime, exponent),
    };
  });
  let combinations = [{ residue: 0, modulus: 1 }];
  for (const component of local) {
    combinations = combinations.flatMap((previous) =>
      component.roots.map((root) => {
        const combined = solveCrt(
          String(previous.residue),
          String(previous.modulus),
          String(root),
          String(component.modulus),
        );
        if (!combined.compatible || !combined.residue || !combined.modulus)
          throw new Error('CRT reconstruction failed.');
        return {
          residue: Number(combined.residue),
          modulus: Number(combined.modulus),
        };
      }),
    );
  }
  const roots = combinations.map((item) => item.residue).sort((a, b) => a - b);
  const failed = local.find((item) => item.roots.length === 0);
  return {
    modulus,
    target: target.toString(),
    local,
    roots,
    obstruction: failed
      ? `Modulo ${failed.modulus}: ${failed.condition}`
      : null,
  };
}
