export type RationalDivision = {
  index: number;
  dividend: string;
  divisor: string;
  quotient: string;
  remainder: string;
};

export type RationalConvergent = {
  index: number;
  coefficient: string;
  numerator: string;
  denominator: string;
  determinantWithPrevious: string;
  errorNumerator: string;
  errorDenominator: string;
  errorSide: 'below' | 'above' | 'exact';
};

export type RationalContinuedFraction = {
  kind: 'rational';
  numerator: string;
  denominator: string;
  coefficients: string[];
  divisions: RationalDivision[];
  convergents: RationalConvergent[];
  canonical: string;
  alternative: string;
};

export type SqrtState = {
  index: number;
  m: string;
  d: string;
  coefficient: string;
};

export type SqrtConvergent = {
  index: number;
  coefficient: string;
  numerator: string;
  denominator: string;
  determinantWithPrevious: string;
  normDifference: string;
  errorSide: 'below' | 'above';
  nextDenominator: string;
  errorBoundDenominator: string;
};

export type SqrtContinuedFraction = {
  kind: 'sqrt';
  radicand: string;
  integerPart: string;
  period: string[];
  periodLength: number;
  states: SqrtState[];
  convergents: SqrtConvergent[];
};

export type PellSolution = {
  index: number;
  x: string;
  y: string;
  norm: string;
};

export type PellOrbit = {
  radicand: string;
  integerPart: string;
  period: string[];
  periodLength: number;
  fundamentalIndex: number;
  fundamental: { x: string; y: string; norm: string };
  negative: { x: string; y: string; norm: string } | null;
  solutions: PellSolution[];
};

const MAX_RATIONAL_INPUT = 999n;
const MAX_RADICAND = 9_999n;
const MAX_CF_TERMS = 16n;
const MAX_PELL_SOLUTIONS = 8n;

function parseInteger(
  input: string,
  min: bigint,
  max: bigint,
  label: string,
): bigint {
  const valueText = input.trim();
  if (!/^-?(0|[1-9][0-9]*)$/.test(valueText))
    throw new Error(`${label}: enter a whole number in standard decimal form.`);
  const value = BigInt(valueText);
  if (value < min || value > max)
    throw new Error(`${label}: use a value from ${min} to ${max}.`);
  return value;
}

function abs(value: bigint): bigint {
  return value < 0n ? -value : value;
}

function gcd(a: bigint, b: bigint): bigint {
  a = abs(a);
  b = abs(b);
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

function floorDivMod(numerator: bigint, denominator: bigint) {
  let quotient = numerator / denominator;
  let remainder = numerator % denominator;
  if (remainder < 0n) {
    quotient -= 1n;
    remainder += denominator;
  }
  return { quotient, remainder };
}

function integerSquareRoot(value: bigint): bigint {
  if (value < 0n)
    throw new Error('Square root requires a nonnegative integer.');
  if (value < 2n) return value;
  let estimate = value;
  let next = (estimate + value / estimate) >> 1n;
  while (next < estimate) {
    estimate = next;
    next = (estimate + value / estimate) >> 1n;
  }
  return estimate;
}

function parseRadicand(input: string): { value: bigint; root: bigint } {
  const value = parseInteger(input, 2n, MAX_RADICAND, 'D');
  const root = integerSquareRoot(value);
  if (root * root === value)
    throw new Error('D must be positive and not a perfect square.');
  return { value, root };
}

function parseTerms(input: string): number {
  return Number(parseInteger(input, 1n, MAX_CF_TERMS, 'Visible entries'));
}

function convergentPairs(coefficients: bigint[]) {
  let pPreviousPrevious = 0n;
  let pPrevious = 1n;
  let qPreviousPrevious = 1n;
  let qPrevious = 0n;
  return coefficients.map((coefficient, index) => {
    const p = coefficient * pPrevious + pPreviousPrevious;
    const q = coefficient * qPrevious + qPreviousPrevious;
    const determinant = p * qPrevious - pPrevious * q;
    const result = { index, coefficient, p, q, determinant };
    [pPreviousPrevious, pPrevious] = [pPrevious, p];
    [qPreviousPrevious, qPrevious] = [qPrevious, q];
    return result;
  });
}

function continuedFractionCoefficients(numerator: bigint, denominator: bigint) {
  const coefficients: bigint[] = [];
  const divisions: RationalDivision[] = [];
  let dividend = numerator;
  let divisor = denominator;
  while (divisor !== 0n) {
    const { quotient, remainder } = floorDivMod(dividend, divisor);
    coefficients.push(quotient);
    divisions.push({
      index: divisions.length,
      dividend: dividend.toString(),
      divisor: divisor.toString(),
      quotient: quotient.toString(),
      remainder: remainder.toString(),
    });
    if (remainder === 0n) break;
    [dividend, divisor] = [divisor, remainder];
  }
  return { coefficients, divisions };
}

function alternativeExpansion(coefficients: bigint[]): bigint[] {
  const alternative = coefficients.slice();
  const last = alternative.length - 1;
  if (last === 0) return [alternative[0] - 1n, 1n];
  alternative[last] -= 1n;
  alternative.push(1n);
  return alternative;
}

/** Exact canonical finite continued fraction and all Euclidean convergents. */
export function buildRationalContinuedFraction(
  numeratorText: string,
  denominatorText: string,
): RationalContinuedFraction {
  const inputNumerator = parseInteger(
    numeratorText,
    -MAX_RATIONAL_INPUT,
    MAX_RATIONAL_INPUT,
    'Numerator',
  );
  const inputDenominator = parseInteger(
    denominatorText,
    1n,
    MAX_RATIONAL_INPUT,
    'Denominator',
  );
  const common = gcd(inputNumerator, inputDenominator);
  const numerator = inputNumerator / common;
  const denominator = inputDenominator / common;
  const { coefficients, divisions } = continuedFractionCoefficients(
    numerator,
    denominator,
  );
  if (
    coefficients.length > Number(MAX_CF_TERMS) ||
    divisions.length > Number(MAX_CF_TERMS)
  )
    throw new Error('This rational has too many Euclidean steps for the lab.');

  const convergents = convergentPairs(coefficients).map((item) => {
    const errorNumerator = numerator * item.q - denominator * item.p;
    const errorDenominator = denominator * item.q;
    const commonErrorFactor = gcd(errorNumerator, errorDenominator);
    const reducedErrorNumerator = errorNumerator / commonErrorFactor;
    const reducedErrorDenominator = errorDenominator / commonErrorFactor;
    return {
      index: item.index,
      coefficient: item.coefficient.toString(),
      numerator: item.p.toString(),
      denominator: item.q.toString(),
      determinantWithPrevious: item.determinant.toString(),
      errorNumerator: reducedErrorNumerator.toString(),
      errorDenominator: reducedErrorDenominator.toString(),
      errorSide:
        errorNumerator === 0n
          ? ('exact' as const)
          : errorNumerator > 0n
            ? ('below' as const)
            : ('above' as const),
    };
  });

  return {
    kind: 'rational',
    numerator: numerator.toString(),
    denominator: denominator.toString(),
    coefficients: coefficients.map(String),
    divisions,
    convergents,
    canonical:
      coefficients.length === 1
        ? `[${coefficients[0]}]`
        : `[${coefficients[0]};${coefficients.slice(1).join(',')}]`,
    alternative: `[${alternativeExpansion(coefficients)[0]};${alternativeExpansion(coefficients).slice(1).join(',')}]`,
  };
}

function squareRootPeriod(radicand: bigint, integerPart: bigint) {
  let m = 0n;
  let d = 1n;
  let a = integerPart;
  const seen = new Set<string>();
  const period: bigint[] = [];
  // The reduced state has 0 <= m <= floor(sqrt(D)) and d divides D-m², so
  // 1 <= d <= D. A repeated state must occur within this finite state count.
  const limit = Number((integerPart + 1n) * radicand + 1n);
  for (let step = 0; step < limit; step++) {
    const nextM = d * a - m;
    const numerator = radicand - nextM * nextM;
    if (numerator <= 0n || numerator % d !== 0n)
      throw new Error(
        'The square-root state recurrence left the integer domain.',
      );
    const nextD = numerator / d;
    const nextA = (integerPart + nextM) / nextD;
    const key = `${nextM},${nextD}`;
    if (seen.has(key)) break;
    seen.add(key);
    period.push(nextA);
    m = nextM;
    d = nextD;
    a = nextA;
    if (m === integerPart && d === 1n) break;
  }
  if (period.length === 0 || !(m === integerPart && d === 1n))
    throw new Error(
      'The square-root period did not close within its exact bound.',
    );
  return period;
}

function squareRootTerms(
  radicand: bigint,
  integerPart: bigint,
  count: number,
): SqrtState[] {
  const terms: SqrtState[] = [
    { index: 0, m: '0', d: '1', coefficient: integerPart.toString() },
  ];
  let m = 0n;
  let d = 1n;
  let a = integerPart;
  for (let index = 1; index < count; index++) {
    const nextM = d * a - m;
    const nextD = (radicand - nextM * nextM) / d;
    if (nextD <= 0n || (radicand - nextM * nextM) % d !== 0n)
      throw new Error(
        'The square-root state recurrence left the integer domain.',
      );
    const nextA = (integerPart + nextM) / nextD;
    terms.push({
      index,
      m: nextM.toString(),
      d: nextD.toString(),
      coefficient: nextA.toString(),
    });
    [m, d, a] = [nextM, nextD, nextA];
  }
  return terms;
}

/** Exact first terms, periodic state cycle, convergents, signs, and error bounds for √D. */
export function buildSqrtContinuedFraction(
  radicandText: string,
  visibleTermsText = '8',
): SqrtContinuedFraction {
  const { value: radicand, root: integerPart } = parseRadicand(radicandText);
  const visibleTerms = parseTerms(visibleTermsText);
  const period = squareRootPeriod(radicand, integerPart);
  const states = squareRootTerms(radicand, integerPart, visibleTerms + 1);
  const pairs = convergentPairs(
    states.map((state) => BigInt(state.coefficient)),
  );
  const convergents = pairs.slice(0, visibleTerms).map((item, index) => {
    const normDifference = radicand * item.q * item.q - item.p * item.p;
    const nextDenominator = pairs[index + 1].q;
    return {
      index,
      coefficient: item.coefficient.toString(),
      numerator: item.p.toString(),
      denominator: item.q.toString(),
      determinantWithPrevious: item.determinant.toString(),
      normDifference: normDifference.toString(),
      errorSide: normDifference > 0n ? ('below' as const) : ('above' as const),
      nextDenominator: nextDenominator.toString(),
      errorBoundDenominator: (item.q * nextDenominator).toString(),
    };
  });
  return {
    kind: 'sqrt',
    radicand: radicand.toString(),
    integerPart: integerPart.toString(),
    period: period.map(String),
    periodLength: period.length,
    states: states.slice(0, visibleTerms),
    convergents,
  };
}

/** Fundamental and generated positive solutions, with the negative-Pell parity test. */
export function buildPellOrbit(
  radicandText: string,
  countText = '5',
): PellOrbit {
  const { value: radicand, root: integerPart } = parseRadicand(radicandText);
  const count = Number(
    parseInteger(countText, 1n, MAX_PELL_SOLUTIONS, 'Solutions'),
  );
  const period = squareRootPeriod(radicand, integerPart);
  const periodLength = period.length;
  const fundamentalIndex =
    periodLength % 2 === 0 ? periodLength - 1 : 2 * periodLength - 1;
  const neededTerms = fundamentalIndex + 1;
  if (neededTerms > 2 * periodLength)
    throw new Error(
      'The fundamental Pell convergent exceeded the exact period bound.',
    );

  const coefficients: bigint[] = [integerPart];
  for (let index = 1; index < neededTerms; index++)
    coefficients.push(period[(index - 1) % periodLength]);
  const fundamentalPair = convergentPairs(coefficients)[fundamentalIndex];
  const fundamentalNorm =
    fundamentalPair.p * fundamentalPair.p -
    radicand * fundamentalPair.q * fundamentalPair.q;
  if (fundamentalNorm !== 1n)
    throw new Error(
      'The period-selected convergent failed its Pell norm check.',
    );

  let negative: PellOrbit['negative'] = null;
  if (periodLength % 2 === 1) {
    const negativeCoefficients = [
      integerPart,
      ...period.slice(0, periodLength - 1),
    ];
    const negativePair = convergentPairs(negativeCoefficients).at(-1);
    if (!negativePair)
      throw new Error('The negative-Pell convergent is missing.');
    const negativeNorm =
      negativePair.p * negativePair.p -
      radicand * negativePair.q * negativePair.q;
    if (negativeNorm !== -1n)
      throw new Error(
        'The odd-period convergent failed its negative-Pell norm check.',
      );
    negative = {
      x: negativePair.p.toString(),
      y: negativePair.q.toString(),
      norm: negativeNorm.toString(),
    };
  }

  const x1 = fundamentalPair.p;
  const y1 = fundamentalPair.q;
  let x = 1n;
  let y = 0n;
  const solutions: PellSolution[] = [];
  for (let index = 1; index <= count; index++) {
    [x, y] = [x * x1 + radicand * y * y1, x * y1 + y * x1];
    const norm = x * x - radicand * y * y;
    if (norm !== 1n)
      throw new Error(
        'Norm multiplication failed to preserve the Pell equation.',
      );
    solutions.push({
      index,
      x: x.toString(),
      y: y.toString(),
      norm: norm.toString(),
    });
  }
  return {
    radicand: radicand.toString(),
    integerPart: integerPart.toString(),
    period: period.map(String),
    periodLength,
    fundamentalIndex,
    fundamental: {
      x: x1.toString(),
      y: y1.toString(),
      norm: fundamentalNorm.toString(),
    },
    negative,
    solutions,
  };
}
