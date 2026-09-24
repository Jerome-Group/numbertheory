export const chapterCheckpoints: Record<
  string,
  { prompt: string; answer: string; links: [string, string] }
> = {
  Foundations: {
    prompt:
      'Why does a long table fail to prove a universal arithmetic statement, and what can one counterexample do?',
    answer:
      'A table checks finitely many inputs. One counterexample refutes a universal claim; induction or another argument covering every input can prove it.',
    links: ['P00', 'P01'],
  },
  Divisibility: {
    prompt: 'How does a division step preserve the set of common divisors?',
    answer:
      'If \\(a=qb+r\\), then every common divisor of \\(a,b\\) divides \\(r\\), and every common divisor of \\(b,r\\) divides \\(a\\). The two pairs have the same common divisors.',
    links: ['D02', 'D04'],
  },
  'Primes and bounds': {
    prompt:
      'How do prime exponents turn a divisibility question about a factorial into a finite sum?',
    answer:
      'Count multiples of \\(p,p^2,\\ldots\\) separately: \\(v_p(n!)=\\sum_{j\\ge1}\\lfloor n/p^j\\rfloor\\), a finite sum.',
    links: ['B01', 'B02'],
  },
  'Modular arithmetic': {
    prompt:
      'When does multiplying a congruence by a fixed factor lose information?',
    answer:
      'Multiplication by \\(c\\) modulo \\(n\\) is injective exactly when \\(\\gcd(c,n)=1\\). Otherwise each attained output has \\(\\gcd(c,n)\\) inputs.',
    links: ['C02', 'C03'],
  },
  'Arithmetic functions': {
    prompt:
      'Which operation expresses a divisor sum, and how does Möbius inversion undo it?',
    answer:
      'A divisor sum is convolution with the constant-one function \\(\\mathbf1\\). Convolving with \\(\\mu\\) undoes it because \\(\\mathbf1*\\mu\\) is the convolution identity.',
    links: ['A03', 'A04'],
  },
  Applications: {
    prompt:
      'Which mathematical assumptions are needed before a toy RSA power calculation becomes reversible?',
    answer:
      'The modulus is a product of suitable primes, the encryption exponent is coprime to the relevant group exponent, and the inverse exponent is chosen modulo that exponent. A worked toy example does not establish security.',
    links: ['C06', 'C09'],
  },
  'Polynomial congruences': {
    prompt:
      'Why can a root lift uniquely in one case but split or disappear in another?',
    answer:
      'A derivative that is a unit modulo \\(p\\) determines one next digit. When the derivative vanishes modulo \\(p\\), the next congruence may allow all digits or none.',
    links: ['F03', 'F04'],
  },
  'Powers and generators': {
    prompt:
      'What does the order of a unit tell you about its cycle, and when may you use a primitive root?',
    answer:
      'The order is the least positive exponent returning to 1 and equals the cycle length. A primitive root exists only for the allowed cyclic unit groups; it cannot be assumed for every modulus.',
    links: ['U01', 'U04'],
  },
  'Quadratic arithmetic': {
    prompt:
      'Why does a Jacobi symbol of \\(1\\) not certify a square modulo a composite?',
    answer:
      'The Jacobi symbol multiplies local Legendre signs. Two negative local signs multiply to \\(1\\), although the congruence has no root at either prime.',
    links: ['Q01', 'Q06'],
  },
  'Sums of squares': {
    prompt:
      'What changes when a prime \\(3\\pmod4\\) occurs to an odd exponent in a sum of two squares?',
    answer:
      'Such a prime dividing \\(x^2+y^2\\) must divide both \\(x\\) and \\(y\\), so its exponent in \\(x^2+y^2\\) is even. An odd exponent obstructs representation.',
    links: ['S01', 'S04'],
  },
  'Algebra bridges': {
    prompt:
      'How do Gaussian integers reinterpret an ordinary sum of two squares?',
    answer:
      'The norm \\(N(a+bi)=a^2+b^2\\) turns a representation into a norm equation and supports multiplicative arguments.',
    links: ['S04', 'S05'],
  },
  'Continued fractions': {
    prompt:
      'Which determinant identity makes successive convergents tightly spaced?',
    answer:
      'For consecutive convergents \\(p_n/q_n\\) and \\(p_{n-1}/q_{n-1}\\), the cross determinant is \\(\\pm1\\), so their difference has magnitude \\(1/(q_nq_{n-1})\\).',
    links: ['R01', 'R02'],
  },
  'Pell equations': {
    prompt:
      'Why can multiplying by a norm-one solution generate more Pell solutions?',
    answer:
      'Norm is multiplicative. Multiplying elements of norm one stays in the norm-one group; completeness needs a separate minimality argument.',
    links: ['R06', 'R07'],
  },
  'Elementary extensions': {
    prompt:
      'Why does infinite descent require a strictly smaller positive integer at each step?',
    answer:
      'A descending sequence of positive integers cannot continue indefinitely. The proof must construct another valid counterexample with a smaller positive measure.',
    links: ['P02', 'E01'],
  },
  'Further elementary arithmetic': {
    prompt:
      'How can a congruence fail globally before any composite-modulus search?',
    answer:
      'Factor the modulus into prime powers. If one local congruence has no root, CRT shows the composite congruence has no root.',
    links: ['X05', 'C04'],
  },
  'Toward algebraic number theory': {
    prompt: 'Why does nonunique element factorization motivate ideals?',
    answer:
      'In \\(\\mathbb Z[\\sqrt{-5}]\\), \\(6\\) has inequivalent irreducible factorizations. The ideal \\((2,1+\\sqrt{-5})\\) exhibits structure that element factorization alone misses.',
    links: ['N09', 'N10'],
  },
};
