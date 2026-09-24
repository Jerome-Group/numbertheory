import { parseBoundedInteger } from './euclid.ts';

export type MultiplicationFiber = { output: number; inputs: number[] };
export type CancellationMap = {
  modulus: number;
  factor: string;
  gcd: number;
  reducedModulus: number;
  fibers: MultiplicationFiber[];
  rows: { input: number; output: number }[];
};

function gcd(a: bigint, b: bigint): bigint {
  while (b !== 0n) [a, b] = [b, a % b];
  return a < 0n ? -a : a;
}

export function buildCancellationMap(
  modulusText: string,
  factorText: string,
): CancellationMap {
  const n = parseBoundedInteger(modulusText);
  const factor = parseBoundedInteger(factorText);
  if (n < 2n || n > 60n) throw new Error('Choose a modulus from 2 through 60.');
  const modulus = Number(n);
  const fibers = new Map<number, number[]>();
  const rows = Array.from({ length: modulus }, (_, input) => {
    const output = Number((((factor * BigInt(input)) % n) + n) % n);
    const inputs = fibers.get(output) ?? [];
    inputs.push(input);
    fibers.set(output, inputs);
    return { input, output };
  });
  const d = Number(gcd(factor, n));
  return {
    modulus,
    factor: factor.toString(),
    gcd: d,
    reducedModulus: modulus / d,
    rows,
    fibers: [...fibers].map(([output, inputs]) => ({ output, inputs })),
  };
}
