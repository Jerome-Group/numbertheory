export type Gaussian = { re: bigint; im: bigint };
export type GaussianDivision = {
  alpha: { re: string; im: string };
  beta: { re: string; im: string };
  quotient: { re: string; im: string };
  remainder: { re: string; im: string };
  denominator: string;
  rationalQuotient: { reNumerator: string; imNumerator: string };
  remainderNorm: string;
  divisorNorm: string;
};

function boundedInteger(value: string): bigint {
  if (!/^-?(0|[1-9][0-9]*)$/.test(value) || value.length > 4)
    throw new Error('Gaussian coordinates must be bounded integers.');
  const result = BigInt(value);
  if (result < -100n || result > 100n)
    throw new Error('Gaussian coordinates must be between -100 and 100.');
  return result;
}
function nearest(numerator: bigint, denominator: bigint): bigint {
  const floor =
    numerator >= 0n
      ? numerator / denominator
      : -((-numerator + denominator - 1n) / denominator);
  const remainder = numerator - floor * denominator;
  return floor + (2n * remainder >= denominator ? 1n : 0n);
}
function norm(value: Gaussian): bigint {
  return value.re * value.re + value.im * value.im;
}
export function divideGaussian(
  alphaRe: string,
  alphaIm: string,
  betaRe: string,
  betaIm: string,
): GaussianDivision {
  const alpha = { re: boundedInteger(alphaRe), im: boundedInteger(alphaIm) };
  const beta = { re: boundedInteger(betaRe), im: boundedInteger(betaIm) };
  const divisorNorm = norm(beta);
  if (divisorNorm === 0n)
    throw new Error('The Gaussian divisor must be nonzero.');
  const reNumerator = alpha.re * beta.re + alpha.im * beta.im;
  const imNumerator = alpha.im * beta.re - alpha.re * beta.im;
  const quotient = {
    re: nearest(reNumerator, divisorNorm),
    im: nearest(imNumerator, divisorNorm),
  };
  const remainder = {
    re: alpha.re - (quotient.re * beta.re - quotient.im * beta.im),
    im: alpha.im - (quotient.re * beta.im + quotient.im * beta.re),
  };
  const remainderNorm = norm(remainder);
  if (remainderNorm >= divisorNorm)
    throw new Error('Gaussian division certificate failed.');
  const pair = (value: Gaussian) => ({
    re: value.re.toString(),
    im: value.im.toString(),
  });
  return {
    alpha: pair(alpha),
    beta: pair(beta),
    quotient: pair(quotient),
    remainder: pair(remainder),
    denominator: divisorNorm.toString(),
    rationalQuotient: {
      reNumerator: reNumerator.toString(),
      imNumerator: imNumerator.toString(),
    },
    remainderNorm: remainderNorm.toString(),
    divisorNorm: divisorNorm.toString(),
  };
}
