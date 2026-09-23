import order from './order.json';
import part1 from './part1.json';
import part2 from './part2.json';
import part3 from './part3.json';
import part4 from './part4.json';
import part5 from './part5.json';
import part6 from './part6.json';
import part7 from './part7.json';
import part8 from './part8.json';
import part9 from './part9.json';
import part10 from './part10.json';
import type { Lesson } from './types';

const foundations: Lesson[] = [
  {
    id: 'P00',
    title: 'How number-theoretic proofs work',
    cluster: 'Foundations',
    question:
      'What turns a convincing pattern into a statement about every integer?',
    prerequisites: [],
    summary:
      'A theorem needs its domain, assumptions, and a reason that covers every case. Well-ordering and induction turn a first case into a general argument.',
    definition: [
      'A universal claim such as \\(\\forall n\\in\\mathbb N,\\ P(n)\\) asks for every allowed input. One counterexample refutes it; a finite table cannot establish it.',
      'Well-ordering says every nonempty subset of \\(\\mathbb Z_{\\ge0}\\) has a least member. Induction proves a base case and a step from \\(P(n)\\) to \\(P(n+1)\\). Both depend on a lower bound.',
    ],
    theorem:
      'Every nonempty subset \\(S\\subseteq\\mathbb Z_{\\ge0}\\) has a least element. Consequently, if \\(P(0)\\) holds and \\(P(n)\\Rightarrow P(n+1)\\) for every \\(n\\ge0\\), then \\(P(n)\\) holds for every \\(n\\ge0\\).',
    proof: [
      'For the well-ordering claim, suppose a nonempty \\(S\\subseteq\\mathbb Z_{\\ge0}\\) has no least member. Choose \\(s_0\\in S\\). Among the finite set \\(S\\cap\\{0,1,\\ldots,s_0\\}\\), choose its smallest element; it is also smallest in \\(S\\), a contradiction.',
      'For induction, assume the base and step but suppose some \\(P(n)\\) fails. The set \\(F=\\{n\\ge0:P(n)\\text{ fails}\\}\\) has a least element \\(m\\). The base gives \\(m\\ne0\\), so \\(m-1\\ge0\\) and \\(P(m-1)\\) holds by minimality. The step gives \\(P(m)\\), a contradiction. Thus \\(F\\) is empty. \\(\\square\\)',
    ],
    example: {
      prompt:
        'Does a table showing \\(n^2+n+41\\) prime for several inputs prove it is prime for every \\(n\\ge0\\)?',
      steps: [
        'The quantifier “every” asks about integers beyond the table.',
        'At \\(n=41\\), the expression is \\(41^2+41+41=41(41+2)\\), which is composite.',
      ],
      conclusion:
        'One counterexample disproves the universal claim. It says nothing about which earlier entries are prime.',
    },
    practice: {
      prompt:
        'A draft proof says “the nonempty set \\(T=\\{-1,-2,-3,\\ldots\\}\\) has a least integer by well-ordering.” Identify the faulty assumption and repair it for a nonempty set of nonnegative integers.',
      hints: [
        'Check whether \\(T\\) is bounded below.',
        'State the domain where well-ordering applies, then use a finite initial segment containing a chosen member.',
      ],
      answer:
        'The set \\(T\\) has no least integer because for every \\(t\\in T\\), also \\(t-1\\in T\\). If \\(S\\subseteq\\mathbb Z_{\\ge0}\\) is nonempty, choose \\(s_0\\in S\\); the finite nonempty set \\(S\\cap\\{0,\\ldots,s_0\\}\\) has a smallest member, and no member of \\(S\\) below it exists.',
    },
    caution:
      'Check whether a statement says “for all” or “there exists,” and whether each assumption is used. A necessary condition need not be sufficient.',
    bridge:
      'Proof assumptions matter for concrete rings too: a cancellation step is valid only when its factor has the needed property.',
    sourceNote:
      'Original proof, example, and practice authored for this site. Foundations align with current official MH3210 Handout 01; exact theorem/page locator remains provisional.',
  },
  {
    id: 'D01',
    title: 'Divisibility and integer structure',
    cluster: 'Divisibility',
    question: 'What does it mean for one integer to divide another?',
    prerequisites: ['P00'],
    summary:
      'Divisibility is a claim about an integer witness. That simple definition controls every later argument about common divisors.',
    definition: [
      'For integers \\(a,b\\), write \\(a\\mid b\\) when there is an integer \\(k\\) with \\(b=ak\\). The witness \\(k\\) is part of the claim.',
      'Under this definition, \\(a\\mid0\\) for every integer \\(a\\), including \\(a=0\\). But \\(0\\mid b\\) holds only when \\(b=0\\).',
    ],
    theorem:
      'If \\(d\\mid a\\) and \\(d\\mid b\\), then \\(d\\mid (xa+yb)\\) for all \\(x,y\\in\\mathbb Z\\).',
    proof: [
      'Choose integer witnesses \\(u,v\\) with \\(a=du\\) and \\(b=dv\\).',
      'Then \\(xa+yb=d(xu+yv)\\). Since \\(xu+yv\\in\\mathbb Z\\), this is the required witness. \\(\\square\\)',
    ],
    example: {
      prompt:
        'Why must every common divisor of \\(252\\) and \\(105\\) also divide \\(42\\)?',
      steps: [
        'Use \\(42=252-2\\cdot105\\).',
        'The linear-combination theorem applies with \\(x=1\\) and \\(y=-2\\).',
      ],
      conclusion:
        'Any common divisor divides \\(42\\); this prepares the Euclidean step.',
    },
    practice: {
      prompt:
        'Decide whether \\(0\\mid0\\), \\(0\\mid5\\), and \\(5\\mid0\\), giving a witness or explaining why none exists.',
      hints: [
        'Use the equation \\(b=ak\\), not division by \\(a\\).',
        'When \\(a=0\\), the right side is always \\(0\\).',
      ],
      answer:
        '\\(0\\mid0\\) with any integer witness, and \\(5\\mid0\\) with \\(k=0\\). But \\(0\\nmid5\\) because \\(5\\ne0k\\) for every integer \\(k\\).',
    },
    caution:
      'Divisibility is not numerical ordering: \\(-3\\mid12\\) even though \\(-3<12\\). This site allows \\(0\\mid0\\) by the witness definition; MH3210 Handout 01 restricts the divisor to nonzero integers, so use that convention when following the course.',
    bridge:
      'The multiples \\(a\\mathbb Z\\) form a set. Saying \\(a\\mid b\\) is the same as saying \\(b\\in a\\mathbb Z\\).',
    sourceNote:
      'Original proof, example, and practice authored for this site. Topic alignment: current official MH3210 Handout 01. Topic mapping reviewed 2026-09-23; exact theorem/page locator remains provisional.',
  },
  {
    id: 'D02',
    title: 'Division with remainder',
    cluster: 'Divisibility',
    question: 'Why does every integer have one standard remainder?',
    prerequisites: ['D01'],
    summary:
      'A positive divisor partitions the integers into blocks of equal width. Each integer has exactly one representative in the standard remainder range.',
    definition: [
      'For \\(a\\in\\mathbb Z\\) and \\(b\\in\\mathbb Z_{>0}\\), division with remainder means finding integers \\(q,r\\) such that \\(a=bq+r\\) and \\(0\\le r<b\\). The sign of \\(a\\) is unrestricted.',
    ],
    theorem:
      'For every \\(a\\in\\mathbb Z\\) and \\(b>0\\), there exist unique integers \\(q,r\\) with \\(a=bq+r\\) and \\(0\\le r<b\\).',
    proof: [
      'Consider the nonnegative integers of the form \\(a-bq\\), where \\(q\\in\\mathbb Z\\). The set is nonempty: choose \\(q\\) sufficiently negative. By well-ordering it has a least member \\(r=a-bq\\).',
      'If \\(r\\ge b\\), then \\(r-b=a-b(q+1)\\) is a smaller nonnegative member, impossible. Thus \\(0\\le r<b\\).',
      'For uniqueness, if \\(bq+r=bq^{\\prime}+r^{\\prime}\\) with both remainders in the stated range, then \\(b(q-q^{\\prime})=r^{\\prime}-r\\). The right side has absolute value below \\(b\\), so the only possible multiple of \\(b\\) is \\(0\\). Hence \\(r=r^{\\prime}\\) and \\(q=q^{\\prime}\\). \\(\\square\\)',
    ],
    example: {
      prompt: 'Divide \\(-17\\) by \\(5\\) with a standard remainder.',
      steps: [
        '\\(-17=5(-4)+3\\).',
        'The remainder \\(3\\) satisfies \\(0\\le3<5\\).',
      ],
      conclusion:
        'The pair is \\(q=-4\\), \\(r=3\\); truncating toward zero would give a forbidden negative remainder.',
    },
    practice: {
      prompt:
        'Find standard quotients and remainders for \\(-22\\) divided by \\(7\\) and for \\(-35\\) divided by \\(7\\).',
      hints: [
        'The remainder must lie in \\(\\{0,1,\\dots,6\\}\\).',
        'Use a floor quotient.',
      ],
      answer: '\\(-22=7(-4)+6\\) and \\(-35=7(-5)+0\\).',
    },
    caution:
      'A programming language’s remainder operator may use a negative remainder. Normalize it before treating it as a residue.',
    bridge:
      'The unique remainder is a canonical representative of a congruence class modulo \\(b\\).',
    sourceNote:
      'Original proof, example, and practice authored for this site. Topic alignment: current official MH3210 Handout 01. Topic mapping reviewed 2026-09-23; exact theorem/page locator remains provisional.',
  },
  {
    id: 'D03',
    title: 'Gcd and Bézout',
    cluster: 'Divisibility',
    question: 'Can the greatest common divisor be built from the inputs?',
    prerequisites: ['D02'],
    summary:
      'The gcd is the least positive integer combination of two nonzero inputs. This produces a certificate before we discuss a fast algorithm.',
    definition: [
      'For integers \\(a,b\\), not both zero, \\(\\gcd(a,b)\\) is the greatest positive common divisor. Its sign is always positive.',
    ],
    theorem:
      'For integers \\(a,b\\), not both zero, the set \\(a\\mathbb Z+b\\mathbb Z=\\{ax+by:x,y\\in\\mathbb Z\\}\\) equals \\(d\\mathbb Z\\), where \\(d=\\gcd(a,b)\\). In particular, \\(d=ax+by\\) for some integers \\(x,y\\).',
    proof: [
      'There is a positive combination: use \\(|a|\\) when \\(a\\ne0\\), otherwise \\(|b|\\). Let \\(d=ax_0+by_0\\) be the least positive combination by well-ordering.',
      'Divide \\(a\\) by \\(d\\): \\(a=qd+r\\), \\(0\\le r<d\\). The remainder \\(r=a-q(ax_0+by_0)\\) is also a combination. Minimality forces \\(r=0\\), so \\(d\\mid a\\). Likewise \\(d\\mid b\\).',
      'Every common divisor of \\(a,b\\) divides \\(ax_0+by_0=d\\). Thus \\(d\\) is the gcd. Every combination is a multiple of \\(d\\), and every multiple of \\(d\\) is a combination by scaling \\((x_0,y_0)\\). \\(\\square\\)',
    ],
    example: {
      prompt: 'Certify \\(\\gcd(252,198)=18\\).',
      steps: [
        '\\(252=14\\cdot18\\) and \\(198=11\\cdot18\\), so \\(18\\) is common.',
        '\\(18=4\\cdot252-5\\cdot198\\), so every common divisor divides \\(18\\).',
      ],
      conclusion:
        'The divisibility and combination checks together certify the gcd.',
    },
    practice: {
      prompt:
        'Explain why \\(\\gcd(a,b)=\\gcd(a,a+b)\\) when \\(a,b\\) are not both zero.',
      hints: [
        'Compare common divisors in both directions.',
        'Recover \\(b\\) by subtraction.',
      ],
      answer:
        'A divisor common to \\(a,b\\) divides \\(a+b\\). A divisor common to \\(a,a+b\\) divides \\(b=(a+b)-a\\). The common-divisor sets coincide, so their positive maxima coincide.',
    },
    caution:
      'A combination certificate alone does not prove that its value divides both inputs.',
    bridge:
      'The equality \\(a\\mathbb Z+b\\mathbb Z=d\\mathbb Z\\) is the concrete integer case of a principal ideal.',
    sourceNote:
      'Original proof, example, and practice authored for this site. Topic alignment: current official MH3210 Handout 01. Topic mapping reviewed 2026-09-23; exact theorem/page locator remains provisional.',
  },
  {
    id: 'D04',
    title: 'Euclid and extended Euclid',
    cluster: 'Divisibility',
    question:
      'How can repeated division preserve the gcd and recover a certificate?',
    prerequisites: ['D03'],
    summary:
      'Each division reduces the size of the problem but keeps its common divisors. Back substitution recovers a Bézout certificate.',
    definition: [
      'For integers \\(a,b\\), not both zero, begin with \\((|a|,|b|)\\). At a step \\(a=bq+r\\) with \\(b>0\\) and \\(0\\le r<b\\), replace \\((a,b)\\) by \\((b,r)\\).',
    ],
    theorem:
      'If \\(a=bq+r\\), the pairs \\((a,b)\\) and \\((b,r)\\) have exactly the same common divisors. For inputs not both zero, repeated replacement stops and its final nonzero entry is \\(\\gcd(a,b)\\).',
    proof: [
      'If \\(d\\mid a\\) and \\(d\\mid b\\), then \\(d\\mid(a-bq)=r\\). Conversely, if \\(d\\mid b\\) and \\(d\\mid r\\), then \\(d\\mid(bq+r)=a\\). The sets of common divisors therefore agree.',
      'Every positive remainder is strictly smaller than the preceding positive divisor. An infinite decreasing sequence of positive integers is impossible, so a remainder is eventually \\(0\\). At that point the positive entry divides itself and zero, hence it is the gcd preserved by every step. \\(\\square\\)',
    ],
    example: {
      prompt: 'Compute \\(\\gcd(252,105)\\) and a Bézout certificate.',
      steps: [
        '\\(252=2\\cdot105+42\\).',
        '\\(105=2\\cdot42+21\\).',
        '\\(42=2\\cdot21+0\\).',
        'Back substitute: \\(21=105-2(252-2\\cdot105)=5\\cdot105-2\\cdot252\\).',
      ],
      conclusion: '\\(\\gcd(252,105)=21=-2\\cdot252+5\\cdot105\\).',
    },
    practice: {
      prompt:
        'Run Euclid on \\(391\\) and \\(299\\), then find integers \\(x,y\\) with \\(\\gcd(391,299)=391x+299y\\).',
      hints: [
        'Start with \\(391=299+92\\).',
        'Continue until the remainder is zero, then substitute backward.',
      ],
      answer:
        '\\(299=3\\cdot92+23\\) and \\(92=4\\cdot23\\). Thus \\(23=299-3(391-299)=4\\cdot299-3\\cdot391\\), so \\(x=-3,y=4\\).',
    },
    caution:
      'The invariant proves preservation; decreasing remainders prove termination. Both are needed.',
    bridge:
      'The gcd is the generator of the integer combinations of the inputs; Euclid finds it efficiently.',
    sourceNote:
      'Original proof, example, and practice authored for this site. Topic alignment: current official MH3210 Handout 01. Topic mapping reviewed 2026-09-23; exact theorem/page locator remains provisional.',
    lab: 'euclid',
  },
];

export const lessons: Lesson[] = [
  ...foundations,
  ...(part1 as Lesson[]),
  ...(part2 as Lesson[]),
  ...(part3 as Lesson[]),
  ...(part4 as Lesson[]),
  ...(part5 as Lesson[]),
  ...(part6 as Lesson[]),
  ...(part7 as Lesson[]),
  ...(part8 as Lesson[]),
  ...(part9 as Lesson[]),
  ...(part10 as Lesson[]),
].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
