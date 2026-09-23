import { parseBoundedInteger } from './euclid.ts';

export type ArithmeticFunction = 'one' | 'identity' | 'mobius' | 'totient';

export type DivisorIncidenceRow = {
  divisor: string;
  complementaryDivisor: string;
  leftValue: string;
  rightValue: string;
  convolutionTerm: string;
  mobiusValue: string;
  transformedComplement: string;
  inversionTerm: string;
};

export type DivisorIncidenceStudy = {
  n: number;
  leftFunction: ArithmeticFunction;
  rightFunction: ArithmeticFunction;
  primePowerFactors: { prime: string; exponent: number; value: string }[];
  rows: DivisorIncidenceRow[];
  divisorCount: string;
  convolutionValue: string;
  divisorSumValue: string;
  mobiusDivisorSum: string;
  mobiusIdentityValue: string;
  inversionValue: string;
  sourceValue: string;
  coprimeProductCheck: {
    leftFactor: string;
    rightFactor: string;
    gcd: string;
    leftConvolution: string;
    rightConvolution: string;
    product: string;
    fullConvolution: string;
    isNontrivial: boolean;
    matches: boolean;
  };
};

const arithmeticFunctions: ArithmeticFunction[] = [
  'one',
  'identity',
  'mobius',
  'totient',
];

function boundedInput(text: string, label: string, min: bigint, max: bigint) {
  const value = parseBoundedInteger(text);
  if (value < min || value > max)
    throw new Error(`${label} must be between ${min} and ${max}.`);
  return value;
}

function divisorsOf(n: bigint) {
  const small: bigint[] = [];
  const large: bigint[] = [];
  for (let divisor = 1n; divisor * divisor <= n; divisor += 1n) {
    if (n % divisor !== 0n) continue;
    small.push(divisor);
    const complement = n / divisor;
    if (complement !== divisor) large.push(complement);
  }
  return small.concat(large.reverse());
}

function primePowerDecomposition(n: bigint) {
  let remaining = n;
  const factors: { prime: bigint; exponent: number; value: bigint }[] = [];
  for (let prime = 2n; prime * prime <= remaining; prime += 1n) {
    if (remaining % prime !== 0n) continue;
    let power = 1n;
    let exponent = 0;
    while (remaining % prime === 0n) {
      remaining /= prime;
      power *= prime;
      exponent += 1;
    }
    factors.push({ prime, exponent, value: power });
  }
  if (remaining > 1n)
    factors.push({ prime: remaining, exponent: 1, value: remaining });
  return factors;
}

function gcd(a: bigint, b: bigint) {
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

function mobius(n: bigint) {
  let remaining = n;
  let distinctPrimeCount = 0;
  for (let prime = 2n; prime * prime <= remaining; prime += 1n) {
    if (remaining % prime !== 0n) continue;
    remaining /= prime;
    if (remaining % prime === 0n) return 0n;
    while (remaining % prime === 0n) remaining /= prime;
    distinctPrimeCount += 1;
  }
  if (remaining > 1n) distinctPrimeCount += 1;
  return distinctPrimeCount % 2 === 0 ? 1n : -1n;
}

function totient(n: bigint) {
  let count = 0n;
  for (let candidate = 1n; candidate <= n; candidate += 1n)
    if (gcd(candidate, n) === 1n) count += 1n;
  return count;
}

function functionValue(name: ArithmeticFunction, n: bigint) {
  switch (name) {
    case 'one':
      return 1n;
    case 'identity':
      return n;
    case 'mobius':
      return mobius(n);
    case 'totient':
      return totient(n);
  }
}

function sumDivisors(n: bigint, term: (divisor: bigint) => bigint) {
  return divisorsOf(n).reduce((sum, divisor) => sum + term(divisor), 0n);
}

/** Build the complementary-divisor sum and its Möbius-inversion certificate. */
export function buildDivisorIncidenceStudy(
  nText: string,
  leftFunction: ArithmeticFunction = 'one',
  rightFunction: ArithmeticFunction = 'one',
): DivisorIncidenceStudy {
  const n = boundedInput(nText, 'n', 1n, 120n);
  if (!arithmeticFunctions.includes(leftFunction))
    throw new Error('Choose a supported arithmetic function for f.');
  if (!arithmeticFunctions.includes(rightFunction))
    throw new Error('Choose a supported arithmetic function for g.');

  const divisors = divisorsOf(n);
  const primePowerFactors = primePowerDecomposition(n);
  const transformed = new Map<string, bigint>();
  const transformAt = (value: bigint) => {
    const key = value.toString();
    const cached = transformed.get(key);
    if (cached !== undefined) return cached;
    const result = sumDivisors(value, (divisor) =>
      functionValue(leftFunction, divisor),
    );
    transformed.set(key, result);
    return result;
  };
  const rows = divisors.map((divisor) => {
    const complement = n / divisor;
    const leftValue = functionValue(leftFunction, divisor);
    const rightValue = functionValue(rightFunction, complement);
    const mobiusValue = mobius(divisor);
    const transformedComplement = transformAt(complement);
    return {
      divisor: divisor.toString(),
      complementaryDivisor: complement.toString(),
      leftValue: leftValue.toString(),
      rightValue: rightValue.toString(),
      convolutionTerm: (leftValue * rightValue).toString(),
      mobiusValue: mobiusValue.toString(),
      transformedComplement: transformedComplement.toString(),
      inversionTerm: (mobiusValue * transformedComplement).toString(),
    };
  });
  const convolutionValue = rows.reduce(
    (sum, row) => sum + BigInt(row.convolutionTerm),
    0n,
  );
  const divisorSumValue = rows.reduce(
    (sum, row) => sum + BigInt(row.leftValue),
    0n,
  );
  const mobiusDivisorSum = rows.reduce(
    (sum, row) => sum + BigInt(row.mobiusValue),
    0n,
  );
  const inversionValue = rows.reduce(
    (sum, row) => sum + BigInt(row.inversionTerm),
    0n,
  );
  const convolutionAt = (value: bigint) =>
    sumDivisors(
      value,
      (divisor) =>
        functionValue(leftFunction, divisor) *
        functionValue(rightFunction, value / divisor),
    );
  const firstFactor = primePowerFactors[0]?.value ?? 1n;
  const secondFactor = n / firstFactor;
  const leftConvolution = convolutionAt(firstFactor);
  const rightConvolution = convolutionAt(secondFactor);
  const coprimeProduct = leftConvolution * rightConvolution;

  return {
    n: Number(n),
    leftFunction,
    rightFunction,
    primePowerFactors: primePowerFactors.map((factor) => ({
      prime: factor.prime.toString(),
      exponent: factor.exponent,
      value: factor.value.toString(),
    })),
    rows,
    divisorCount: String(divisors.length),
    convolutionValue: convolutionValue.toString(),
    divisorSumValue: divisorSumValue.toString(),
    mobiusDivisorSum: mobiusDivisorSum.toString(),
    mobiusIdentityValue: n === 1n ? '1' : '0',
    inversionValue: inversionValue.toString(),
    sourceValue: functionValue(leftFunction, n).toString(),
    coprimeProductCheck: {
      leftFactor: firstFactor.toString(),
      rightFactor: secondFactor.toString(),
      gcd: gcd(firstFactor, secondFactor).toString(),
      leftConvolution: leftConvolution.toString(),
      rightConvolution: rightConvolution.toString(),
      product: coprimeProduct.toString(),
      fullConvolution: convolutionValue.toString(),
      isNontrivial: firstFactor > 1n && secondFactor > 1n,
      matches: coprimeProduct === convolutionValue,
    },
  };
}

export type UnitOrderRow = {
  unit: number;
  order: number;
  isPrimitiveRoot: boolean;
};

export type UnitOrderSpectrum = {
  prime: number;
  candidate: number;
  candidateOrder: number;
  groupOrder: number;
  isPrimitiveRoot: boolean;
  cycle: { exponent: number; residue: number }[];
  returnExponent: number;
  powerOrders: {
    exponent: number;
    residue: number;
    gcd: number;
    predictedOrder: number;
    computedOrder: number;
  }[];
  generatorTests: { primeDivisor: number; exponent: number; residue: number }[];
  units: UnitOrderRow[];
  orderCounts: { order: number; count: number }[];
  primitiveRoots: number[];
  primitivePowerExponents: number[];
  primitivePowerValues: number[];
  missedUnits: number[];
};

function isPrime(n: number) {
  if (n < 2) return false;
  for (let divisor = 2; divisor * divisor <= n; divisor += 1)
    if (n % divisor === 0) return false;
  return true;
}

function primeDivisors(n: number) {
  const result: number[] = [];
  for (let divisor = 2; divisor * divisor <= n; divisor += 1) {
    if (n % divisor !== 0) continue;
    result.push(divisor);
    while (n % divisor === 0) n /= divisor;
  }
  if (n > 1) result.push(n);
  return result;
}

function gcdNumber(a: number, b: number) {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

function modularPower(base: number, exponent: number, modulus: number) {
  let factor = BigInt(base);
  let power = BigInt(exponent);
  const mod = BigInt(modulus);
  let result = 1n;
  while (power > 0n) {
    if (power % 2n === 1n) result = (result * factor) % mod;
    factor = (factor * factor) % mod;
    power /= 2n;
  }
  return Number(result);
}

function orderOf(unit: number, prime: number) {
  for (let exponent = 1; exponent <= prime - 1; exponent += 1)
    if (modularPower(unit, exponent, prime) === 1) return exponent;
  throw new Error('A unit power must return to one modulo a prime.');
}

/** Enumerate a prime field's unit orders and verify the power-order formula. */
export function buildUnitOrderSpectrum(
  primeText: string,
  candidateText: string,
): UnitOrderSpectrum {
  const prime = Number(boundedInput(primeText, 'Prime', 3n, 31n));
  if (prime % 2 === 0 || !isPrime(prime))
    throw new Error('Choose an odd prime from 3 to 31.');
  const candidate = Number(
    boundedInput(candidateText, 'Candidate', 1n, BigInt(prime - 1)),
  );
  const groupOrder = prime - 1;
  const candidateOrder = orderOf(candidate, prime);
  const cycle = Array.from({ length: candidateOrder }, (_, exponent) => ({
    exponent,
    residue: modularPower(candidate, exponent, prime),
  }));
  const powerOrders = Array.from({ length: candidateOrder }, (_, exponent) => {
    const divisor = gcdNumber(candidateOrder, exponent);
    const residue = modularPower(candidate, exponent, prime);
    return {
      exponent,
      residue,
      gcd: divisor,
      predictedOrder: candidateOrder / divisor,
      computedOrder: orderOf(residue, prime),
    };
  });
  const units = Array.from({ length: groupOrder }, (_, index) => {
    const unit = index + 1;
    const order = orderOf(unit, prime);
    return { unit, order, isPrimitiveRoot: order === groupOrder };
  });
  const allOrders = new Set(units.map((unit) => unit.order));
  const orderCounts = [...allOrders]
    .sort((a, b) => a - b)
    .map((order) => ({
      order,
      count: units.filter((unit) => unit.order === order).length,
    }));
  const primitiveRoots = units
    .filter((unit) => unit.isPrimitiveRoot)
    .map((unit) => unit.unit);
  const primitivePowerExponents =
    candidateOrder === groupOrder
      ? Array.from({ length: groupOrder }, (_, exponent) => exponent).filter(
          (exponent) => gcdNumber(exponent, groupOrder) === 1,
        )
      : [];
  const generatorTests = primeDivisors(groupOrder).map((primeDivisor) => {
    const exponent = groupOrder / primeDivisor;
    return {
      primeDivisor,
      exponent,
      residue: modularPower(candidate, exponent, prime),
    };
  });
  const cycleResidues = new Set(cycle.map((entry) => entry.residue));
  return {
    prime,
    candidate,
    candidateOrder,
    groupOrder,
    isPrimitiveRoot: candidateOrder === groupOrder,
    cycle,
    returnExponent: candidateOrder,
    powerOrders,
    generatorTests,
    units,
    orderCounts,
    primitiveRoots,
    primitivePowerExponents,
    primitivePowerValues: primitivePowerExponents.map((exponent) =>
      modularPower(candidate, exponent, prime),
    ),
    missedUnits: units
      .map((unit) => unit.unit)
      .filter((unit) => !cycleResidues.has(unit)),
  };
}

export type ReciprocityLattice = {
  p: number;
  q: number;
  mP: number;
  mQ: number;
  cells: { x: number; y: number; region: 'below' | 'above' }[];
  pRows: { x: number; floor: string; belowCount: number }[];
  qRows: { y: number; floor: string; aboveCount: number }[];
  countBelow: number;
  countAbove: number;
  floorSumPq: string;
  floorSumQp: string;
  legendrePq: -1 | 1;
  legendreQp: -1 | 1;
  gaussSignPq: -1 | 1;
  gaussSignQp: -1 | 1;
  symbolProduct: -1 | 1;
  reciprocitySign: -1 | 1;
  parityExponent: number;
  noDiagonalPoints: boolean;
  countMatchesFloorSums: boolean;
  gaussBridgeMatches: boolean;
  reciprocityMatches: boolean;
};

function legendreSymbol(value: number, prime: number): -1 | 1 {
  return modularPower(value, (prime - 1) / 2, prime) === 1 ? 1 : -1;
}

/** Count both strict regions of the half-rectangle used in reciprocity. */
export function buildReciprocityLattice(
  pText: string,
  qText: string,
): ReciprocityLattice {
  const p = Number(boundedInput(pText, 'p', 3n, 31n));
  const q = Number(boundedInput(qText, 'q', 3n, 31n));
  if (p % 2 === 0 || !isPrime(p))
    throw new Error('p must be an odd prime from 3 to 31.');
  if (q % 2 === 0 || !isPrime(q))
    throw new Error('q must be an odd prime from 3 to 31.');
  if (p === q) throw new Error('Choose distinct odd primes.');

  const mP = (p - 1) / 2;
  const mQ = (q - 1) / 2;
  const bigP = BigInt(p);
  const bigQ = BigInt(q);
  const pRows = Array.from({ length: mP }, (_, index) => {
    const x = BigInt(index + 1);
    const floor = (bigQ * x) / bigP;
    return { x: index + 1, floor: floor.toString(), belowCount: Number(floor) };
  });
  const qRows = Array.from({ length: mQ }, (_, index) => {
    const y = BigInt(index + 1);
    const floor = (bigP * y) / bigQ;
    return { y: index + 1, floor: floor.toString(), aboveCount: Number(floor) };
  });
  const cells: ReciprocityLattice['cells'] = [];
  for (let x = 1; x <= mP; x += 1) {
    for (let y = 1; y <= mQ; y += 1) {
      const pY = bigP * BigInt(y);
      const qX = bigQ * BigInt(x);
      cells.push({ x, y, region: pY < qX ? 'below' : 'above' });
    }
  }

  const floorSumPq = pRows.reduce((sum, row) => sum + BigInt(row.floor), 0n);
  const floorSumQp = qRows.reduce((sum, row) => sum + BigInt(row.floor), 0n);
  const countBelow = cells.filter((cell) => cell.region === 'below').length;
  const countAbove = cells.length - countBelow;
  const gaussSignPq: -1 | 1 = floorSumPq % 2n === 0n ? 1 : -1;
  const gaussSignQp: -1 | 1 = floorSumQp % 2n === 0n ? 1 : -1;
  const legendrePq = legendreSymbol(q, p);
  const legendreQp = legendreSymbol(p, q);
  const parityExponent = mP * mQ;
  const reciprocitySign: -1 | 1 = parityExponent % 2 === 0 ? 1 : -1;
  const symbolProduct: -1 | 1 = legendrePq * legendreQp === 1 ? 1 : -1;
  const noDiagonalPoints = cells.every(
    (cell) => bigP * BigInt(cell.y) !== bigQ * BigInt(cell.x),
  );
  const countMatchesFloorSums =
    countBelow === Number(floorSumPq) && countAbove === Number(floorSumQp);
  const gaussBridgeMatches =
    legendrePq === gaussSignPq && legendreQp === gaussSignQp;

  return {
    p,
    q,
    mP,
    mQ,
    cells,
    pRows,
    qRows,
    countBelow,
    countAbove,
    floorSumPq: floorSumPq.toString(),
    floorSumQp: floorSumQp.toString(),
    legendrePq,
    legendreQp,
    gaussSignPq,
    gaussSignQp,
    symbolProduct,
    reciprocitySign,
    parityExponent,
    noDiagonalPoints,
    countMatchesFloorSums,
    gaussBridgeMatches,
    reciprocityMatches: symbolProduct === reciprocitySign,
  };
}
