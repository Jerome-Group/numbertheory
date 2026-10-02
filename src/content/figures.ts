export type Figure = {
  title: string;
  headers: string[];
  rows: string[][];
  caption: string;
};
export const figures: Record<string, Figure> = {
  D01: {
    title: 'A witness travels through the calculation',
    headers: ['First multiple', 'Second multiple', 'Integer combination'],
    rows: [
      [
        '\\(252=7\\cdot36\\)',
        '\\(105=7\\cdot15\\)',
        '\\(252-2\\cdot105=7(36-2\\cdot15)=42\\)',
      ],
    ],
    caption:
      'The new witness is an integer because the coefficients and old witnesses are integers. This proves divisibility, without dividing by the common divisor.',
  },
  D02: {
    title: 'Place the integer inside one block',
    headers: ['Left endpoint', 'Dividend', 'Next endpoint'],
    rows: [['\\(-20=5(-4)\\)', '\\(-17=-20+3\\)', '\\(-15=5(-3)\\)']],
    caption:
      'The dividend sits in the half-open block from minus twenty to minus fifteen. Its offset from the left endpoint is the standard remainder, three. Truncation toward zero chooses the wrong block.',
  },
  D06: {
    title: 'Read gcd and lcm one prime at a time',
    headers: ['Integer', '\\(v_2\\)', '\\(v_3\\)', '\\(v_5\\)'],
    rows: [
      ['\\(72\\)', '\\(3\\)', '\\(2\\)', '\\(0\\)'],
      ['\\(120\\)', '\\(3\\)', '\\(1\\)', '\\(1\\)'],
      ['gcd: take minima', '\\(3\\)', '\\(1\\)', '\\(0\\)'],
      ['lcm: take maxima', '\\(3\\)', '\\(2\\)', '\\(1\\)'],
    ],
    caption:
      'A common divisor cannot use more copies of a prime than either input. A common multiple needs enough copies for both. The rows give gcd twenty-four and lcm three hundred sixty.',
  },
  C08: {
    title: 'Pair the units; leave the fixed classes',
    headers: ['Pair modulo seven', 'Product modulo seven', 'Role'],
    rows: [
      ['\\(2\\leftrightarrow4\\)', '\\(1\\)', 'Distinct inverse pair'],
      ['\\(3\\leftrightarrow5\\)', '\\(1\\)', 'Distinct inverse pair'],
      ['\\(1\\leftrightarrow1\\)', '\\(1\\)', 'Self-inverse'],
      ['\\(6\\leftrightarrow6\\)', '\\(1\\)', 'Self-inverse'],
    ],
    caption:
      'Each distinct pair contributes one. The two fixed classes each occur only once in the factorial, so their remaining product is minus one modulo seven. A fixed class must never be counted twice.',
  },
  A05: {
    title: 'Primes alone do not determine the function',
    headers: ['Input, for prime \\(p\\)', '\\(\\tau\\)', '\\(2^{\\omega}\\)'],
    rows: [
      ['\\(p\\)', '\\(2\\)', '\\(2\\)'],
      ['\\(p^2\\)', '\\(3\\)', '\\(2\\)'],
      ['\\(p^3\\)', '\\(4\\)', '\\(2\\)'],
    ],
    caption:
      'The functions agree at every prime and are both multiplicative, yet disagree at prime squares. A proof by prime powers must cover every exponent, including the identity input.',
  },
  N08: {
    title: 'The basis closes under multiplication',
    headers: [
      'Quadratic ring for \\(d=5\\)',
      'Reduce a square',
      'Stay in the basis',
    ],
    rows: [
      [
        '\\(\\theta=(1+\\sqrt5)/2\\)',
        '\\(\\theta^2=\\theta+1\\)',
        '\\(a+b\\theta\\), with \\(a,b\\in\\mathbb Z\\)',
      ],
    ],
    caption:
      'Multiply two integer combinations of the basis. The only new term is the square of theta; replacing it by theta plus one leaves integer coefficients. This explains closure rather than assuming it from the name “ring.”',
  },
  N09: {
    title: 'The same element, incompatible factor lists',
    headers: [
      'Factorization in \\(\\mathbb Z[\\sqrt{-5}]\\)',
      'Norms of the factors',
    ],
    rows: [
      ['\\(6=2\\cdot3\\)', '\\(4,9\\)'],
      ['\\(6=(1+\\sqrt{-5})(1-\\sqrt{-5})\\)', '\\(6,6\\)'],
    ],
    caption:
      'Both norm products are thirty-six, as multiplicativity demands. Associates have equal norms, so the two irreducible factor lists cannot match even after reordering and multiplying by units. The proof below establishes irreducibility.',
  },
  N12: {
    title: 'A carry must agree at every precision',
    headers: ['Precision', 'First integer', 'Second integer', 'Their sum'],
    rows: [
      ['modulo \\(3\\)', '\\(2\\)', '\\(2\\)', '\\(1\\)'],
      ['modulo \\(9\\)', '\\(2\\)', '\\(2\\)', '\\(4\\)'],
      ['modulo \\(27\\)', '\\(2\\)', '\\(2\\)', '\\(4\\)'],
    ],
    caption:
      'Four reduces to one modulo three, so the sum is compatible. In base three the carried result has units digit one and next digit one. This finite table illustrates a prefix; a p-adic integer requires compatibility at every level.',
  },
};
