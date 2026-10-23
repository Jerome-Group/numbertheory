import assert from 'node:assert/strict';
import { renderedMath, runCase, textIncludes, visible } from './browser.mjs';
import { conjectureClinic } from './conjecture-clinic.mjs';

async function fill(lab, fields) {
  for (const [label, value] of fields)
    await lab
      .getByLabel(label, { exact: typeof label === 'string' })
      .fill(value);
}

async function openDetails(lab, text) {
  const summary = lab.locator('summary').filter({ hasText: text });
  const details = summary.locator('..');
  if ((await details.getAttribute('open')) === null) await summary.click();
  assert.notEqual(await details.getAttribute('open'), null);
}

async function math(lab, expected) {
  const values = await renderedMath(lab);
  const compact = (value) => value.replace(/\s/g, '');
  assert(
    values.some((value) => compact(value) === compact(expected)),
    `Missing exact rendered result ${expected}. Observed ${JSON.stringify(values.slice(-18))}`,
  );
}

async function resultMath(lab) {
  return lab
    .locator('.katex:visible')
    .evaluateAll((elements) =>
      elements
        .filter((element) => !element.closest('form'))
        .map(
          (element) =>
            element.querySelector('annotation[encoding="application/x-tex"]')
              ?.textContent,
        ),
    );
}

const cases = {
  euclid: {
    fields: [
      ['First integer', '240'],
      ['Second integer', '46'],
    ],
    submit: 'Run Euclid',
    verify: async (lab) => {
      await math(lab, '\\gcd(240,46)=2');
      await math(lab, '2=-9(240)+47(46)');
      const trace = [
        ['240', '46', '5', '10'],
        ['46', '10', '4', '6'],
        ['10', '6', '1', '4'],
        ['6', '4', '1', '2'],
        ['4', '2', '2', '0'],
      ];
      const rows = lab
        .getByRole('table', { name: 'Exact division trace', exact: true })
        .locator('tbody tr');
      assert.equal(await rows.count(), trace.length);
      for (let index = 0; index < trace.length; index++)
        assert.deepEqual(await renderedMath(rows.nth(index)), trace[index]);
      const tiling = lab.locator('.euclid-tiling');
      const previous = tiling.getByRole('button', {
        name: 'Previous',
        exact: true,
      });
      const next = tiling.getByRole('button', {
        name: 'Next step',
        exact: true,
      });
      assert(await previous.isDisabled());
      for (let index = 0; index < trace.length; index++) {
        if (index) await next.click();
        const [dividend, divisor, quotient, remainder] = trace[index];
        await textIncludes(
          tiling.locator('.tiling-heading strong'),
          `step ${index + 1} of 5`,
        );
        await math(
          tiling,
          `${dividend}=${quotient}\\cdot${divisor}+${remainder}`,
        );
        await visible(
          tiling.getByRole('img', {
            name: `Division tiling for ${dividend} equals ${quotient} times ${divisor} plus ${remainder}`,
            exact: true,
          }),
        );
      }
      assert(await next.isDisabled());
      for (let index = trace.length - 1; index > 0; index--)
        await previous.click();
      assert(await previous.isDisabled());
      await math(tiling, '240=5\\cdot46+10');
    },
    invalid: [
      ['First integer', '0'],
      ['Second integer', '0'],
    ],
  },
  residue: {
    fields: [
      [/^Modulus,/, '7'],
      ['First integer', '-3'],
      ['Second integer', '10'],
      ['Range start', '-3'],
      ['Range end', '3'],
    ],
    submit: 'Set clock',
    verify: async (lab) => {
      await lab
        .getByRole('button', {
          name: 'Reveal result and invariant',
          exact: true,
        })
        .click();
      await math(lab, '4+3\\equiv0\\pmod{7}');
    },
    invalid: [[/^Modulus,/, '0']],
  },
  cancellation: {
    fields: [
      ['Modulus n', '12'],
      ['Factor c', '4'],
    ],
    submit: 'Map the residues',
    verify: async (lab) => {
      await math(lab, '\\gcd(4,12)=4');
      await lab
        .getByRole('button', { name: 'It merges inputs', exact: true })
        .click();
      await lab
        .getByRole('button', {
          name: 'Show inputs mapping to 0 modulo 12',
          exact: true,
        })
        .click();
      await math(lab, '0,3,6,9');
      await openDetails(lab, 'Show the complete exact map');
      assert.equal(
        await lab.getByRole('table').locator('tbody tr').count(),
        12,
      );
    },
    invalid: [['Modulus n', '0']],
  },
  linear: {
    fields: [
      ['Coefficient', '4'],
      ['Target', '8'],
      ['Modulus', '12'],
    ],
    submit: 'Solve congruence',
    verify: async (lab) => {
      await math(lab, '2,\\;5,\\;8,\\;11');
      await math(lab, '4\\text{ solutions modulo }12');
    },
    negative: [['Target', '3']],
    negativeText: 'NO SOLUTION',
    invalid: [['Modulus', '0']],
  },
  crt: {
    fields: [
      ['First residue', '2'],
      ['First modulus', '6'],
      ['Second residue', '8'],
      ['Second modulus', '9'],
    ],
    submit: 'Solve system',
    verify: async (lab) => {
      await math(lab, 'x\\equiv8\\pmod{18}');
      await visible(lab.locator('.residue-visual'));
      assert.equal(await lab.locator('.residue-cells > span').count(), 18);
      await textIncludes(
        lab.locator('.crt-clocks p'),
        'The residue grid appears only for periods of at most 36.',
      );
      await fill(lab, [
        ['First residue', '0'],
        ['First modulus', '11'],
        ['Second residue', '0'],
        ['Second modulus', '12'],
      ]);
      await lab
        .getByRole('button', { name: 'Solve system', exact: true })
        .click();
      await math(lab, 'x\\equiv0\\pmod{132}');
      await visible(
        lab.getByRole('img', {
          name: 'Residue clocks modulo 11 and 12, marking 0 and 0',
          exact: true,
        }),
      );
      assert.equal(await lab.locator('.residue-visual').count(), 0);
      await textIncludes(
        lab.locator('.crt-clocks p'),
        'Use the exact result above for larger periods.',
      );
      await fill(lab, [
        ['First residue', '2'],
        ['First modulus', '6'],
        ['Second residue', '8'],
        ['Second modulus', '9'],
      ]);
      await lab
        .getByRole('button', { name: 'Solve system', exact: true })
        .click();
      await math(lab, 'x\\equiv8\\pmod{18}');
      await visible(lab.locator('.residue-visual'));
      assert.equal(await lab.locator('.residue-cells > span').count(), 18);
    },
    negative: [
      ['First residue', '1'],
      ['First modulus', '4'],
      ['Second residue', '2'],
      ['Second modulus', '6'],
    ],
    negativeText: 'No common solution',
    invalid: [['First modulus', '0']],
  },
  divisor: {
    fields: [[/^Positive integer n,/, '18']],
    prepare: async (lab, lesson) => {
      await lab
        .getByRole('combobox', {
          name: lesson.id === 'A04' ? 'Source function f' : 'First function f',
          exact: true,
        })
        .selectOption(lesson.id === 'A04' ? 'totient' : 'identity');
      if (lesson.id !== 'A04')
        await lab
          .getByRole('combobox', { name: 'Second function g', exact: true })
          .selectOption('one');
    },
    submit: 'Build divisor trace',
    verify: async (lab, lesson) => {
      await lab
        .getByRole('button', {
          name: 'Open terms and proof readout',
          exact: true,
        })
        .click();
      await math(lab, lesson.id === 'A04' ? '6=f(18)=6' : '(f\\ast g)(18)=39');
      assert.deepEqual(
        await lab
          .getByRole('table', {
            name: `${lesson.id === 'A04' ? 'Divisor terms for Möbius inversion' : 'Complementary-divisor summands'} at n equals 18`,
            exact: true,
          })
          .locator('tbody tr')
          .evaluateAll((rows) =>
            rows.map((row) =>
              [...row.querySelectorAll('th, td')].map(
                (cell) => cell.textContent,
              ),
            ),
          ),
        lesson.id === 'A04'
          ? [
              ['1', '18', '1', '18', '18'],
              ['2', '9', '-1', '9', '-9'],
              ['3', '6', '-1', '6', '-6'],
              ['6', '3', '1', '3', '3'],
              ['9', '2', '0', '2', '0'],
              ['18', '1', '0', '1', '0'],
            ]
          : [
              ['1', '18', '1', '1', '1'],
              ['2', '9', '2', '1', '2'],
              ['3', '6', '3', '1', '3'],
              ['6', '3', '6', '1', '6'],
              ['9', '2', '9', '1', '9'],
              ['18', '1', '18', '1', '18'],
            ],
      );
      await lab
        .getByRole('button', {
          name: lesson.id === 'A04' ? 'Recover totient at 12' : '1 * 1 at 12',
          exact: true,
        })
        .click();
      await lab
        .getByRole('button', {
          name: 'Open terms and proof readout',
          exact: true,
        })
        .click();
      await math(lab, lesson.id === 'A04' ? '4=f(12)=4' : '(f\\ast g)(12)=6');
      assert.equal(
        await lab.getByRole('table').first().locator('tbody tr').count(),
        6,
      );
    },
    invalid: [[/^Positive integer n,/, '0']],
  },
  hensel: {
    fields: [
      [/^Odd prime,/, '7'],
      ['Constant c', '2'],
      [/^Levels,/, '2'],
    ],
    submit: 'Build tree',
    verify: async (lab) => {
      await lab
        .getByRole('button', { name: 'Reveal lift tree', exact: true })
        .click();
      assert.deepEqual(
        await lab
          .locator('.hensel-lab__level')
          .last()
          .locator('.hensel-lab__roots span')
          .allTextContents(),
        ['10', '39'],
      );
      await lab
        .getByRole('button', { name: 'Singular branches', exact: true })
        .click();
      await lab
        .getByRole('button', { name: 'Reveal lift tree', exact: true })
        .click();
      assert.deepEqual(
        await lab
          .locator('.hensel-lab__level')
          .last()
          .locator('.hensel-lab__roots span')
          .allTextContents(),
        ['0', '9', '18'],
      );
      await lab
        .getByRole('button', { name: 'No first root', exact: true })
        .click();
      await lab
        .getByRole('button', { name: 'Reveal lift tree', exact: true })
        .click();
      await textIncludes(
        lab.locator('.hensel-lab__empty'),
        'no root modulo the first prime',
      );
      await fill(lab, [
        [/^Odd prime,/, '7'],
        ['Constant c', '2'],
        [/^Levels,/, '2'],
      ]);
      await lab
        .getByRole('button', { name: 'Build tree', exact: true })
        .click();
      await lab
        .getByRole('button', { name: 'Reveal lift tree', exact: true })
        .click();
      for (const summary of await lab
        .locator('.hensel-lab__branch summary')
        .all())
        await summary.click();
      assert.equal(await lab.locator('table:visible tbody tr').count(), 14);
    },
    invalid: [[/^Odd prime,/, '9']],
  },
  order: {
    fields: [
      ['Odd prime p, from three to thirty-one', '7'],
      ['Candidate a, from one to p minus one', '3'],
    ],
    submit: 'Build power cycle',
    verify: async (lab) => {
      await math(lab, '\\operatorname{ord}_{7}(3)=6');
      await textIncludes(lab.locator('.group-lab__status'), 'Generator: yes');
      await lab
        .getByRole('button', { name: 'Next exponent', exact: true })
        .click();
      await math(lab, '3^{1}\\equiv3\\pmod{7}');
      await lab
        .getByRole('button', {
          name: 'Open order tables and proof readout',
          exact: true,
        })
        .click();
      const table = lab.getByRole('table', {
        name: 'Order of each power of 3 modulo 7',
        exact: true,
      });
      await visible(table);
      assert.equal(await table.locator('tbody tr').count(), 6);
      assert.deepEqual(
        await table.locator('tbody tr').last().locator('td').allTextContents(),
        ['5', '1', '6', '6'],
      );
      await lab
        .getByRole('button', { name: 'Short cycle modulo 7', exact: true })
        .click();
      await math(lab, '\\operatorname{ord}_{7}(2)=3');
      await textIncludes(lab.locator('.group-lab__status'), 'Generator: no');
      await lab
        .getByRole('button', {
          name: 'Open order tables and proof readout',
          exact: true,
        })
        .click();
      assert((await lab.locator('table:visible tbody tr').count()) > 0);
    },
    invalid: [['Odd prime p, from three to thirty-one', '9']],
  },
  quadratic: {
    fields: [
      [/^Odd prime,/, '7'],
      ['Target integer', '2'],
    ],
    submit: 'Set residue',
    verify: async (lab) => {
      await lab
        .getByRole('button', { name: 'Reveal roots and symbol', exact: true })
        .click();
      await math(lab, '3,\\;4');
      await math(lab, '\\left(\\frac{2}{7}\\right)=1');
    },
    negative: [['Target integer', '3']],
    negativeVerify: async (lab) => {
      await lab
        .getByRole('button', { name: 'Reveal roots and symbol', exact: true })
        .click();
      await textIncludes(
        lab.locator('.nt-lab__answer'),
        'No square root exists',
      );
      await math(lab, '\\left(\\frac{3}{7}\\right)=-1');
    },
    invalid: [[/^Odd prime,/, '9']],
  },
  lattice: {
    fields: [
      ['Odd prime p, from three to thirty-one', '3'],
      ['Distinct odd prime q, from three to thirty-one', '7'],
    ],
    submit: 'Build lattice count',
    verify: async (lab) => {
      await textIncludes(
        lab.locator('.group-lab__limit'),
        'the largest half-rectangle has 210 points, at 31 and 29.',
      );
      await fill(lab, [
        ['Odd prime p, from three to thirty-one', '31'],
        ['Distinct odd prime q, from three to thirty-one', '29'],
      ]);
      await lab
        .getByRole('button', { name: 'Build lattice count', exact: true })
        .click();
      await math(lab, 'S_{31}(29)+S_{29}(31)=105+105=210');
      assert.deepEqual(
        await lab
          .locator('.group-lab__summary--lattice .katex:visible msub')
          .evaluateAll((scripts) =>
            scripts.map((script) =>
              [...script.children].map((child) => child.textContent),
            ),
          ),
        [
          ['S', '31'],
          ['S', '29'],
        ],
        'Lattice summary must render each complete prime as its subscript',
      );
      await visible(
        lab.getByRole('img', {
          name: /^Lattice rectangle with 15 columns and 14 rows\./,
        }),
      );
      assert.equal(
        await lab
          .locator('.group-lab__lattice-below, .group-lab__lattice-above')
          .count(),
        210,
      );
      await lab
        .getByRole('button', {
          name: 'Open coordinates and parity proof',
          exact: true,
        })
        .click();
      const proof = lab.locator('.group-lab__proof');
      await math(proof, 'S_{31}(29)=105');
      await math(proof, 'S_{29}(31)=105');
      await math(proof, '\\chi_{31}(29)=(-1)^{105}=−1');
      await math(proof, '\\chi_{29}(31)=(-1)^{105}=−1');
      assert.deepEqual(
        await proof
          .locator('.katex:visible msub')
          .evaluateAll((scripts) =>
            scripts.map((script) =>
              [...script.children].map((child) => child.textContent),
            ),
          ),
        [
          ['S', '31'],
          ['S', '29'],
          ['χ', '31'],
          ['χ', '29'],
        ],
        'Floor and character proofs must render each complete prime as its subscript',
      );
      await fill(lab, [
        ['Distinct odd prime q, from three to thirty-one', '31'],
      ]);
      await lab
        .getByRole('button', { name: 'Build lattice count', exact: true })
        .click();
      await textIncludes(lab.getByRole('alert'), 'Choose distinct odd primes.');
      await math(lab, 'S_{31}(29)+S_{29}(31)=105+105=210');
      await fill(lab, [
        ['Odd prime p, from three to thirty-one', '3'],
        ['Distinct odd prime q, from three to thirty-one', '7'],
      ]);
      await lab
        .getByRole('button', { name: 'Build lattice count', exact: true })
        .click();
      assert.equal(await lab.getByRole('alert').count(), 0);
      await lab
        .getByRole('button', {
          name: 'Open coordinates and parity proof',
          exact: true,
        })
        .click();
      await math(lab, 'S_{3}(7)+S_{7}(3)=2+1=3');
      assert.deepEqual(
        await lab
          .locator(
            '.group-lab__summary--lattice .katex:visible msub, .group-lab__proof .katex:visible msub',
          )
          .evaluateAll((scripts) =>
            scripts.map((script) =>
              [...script.children].map((child) => child.textContent),
            ),
          ),
        [
          ['S', '3'],
          ['S', '7'],
          ['S', '3'],
          ['S', '7'],
          ['χ', '3'],
          ['χ', '7'],
        ],
        'Single-digit prime subscripts must survive the maximum-pair recovery',
      );
    },
    invalid: [['Odd prime p, from three to thirty-one', '7']],
  },
  'local-squares': {
    fields: [
      ['Modulus m', '16'],
      ['Target a', '0'],
    ],
    submit: 'Find exact roots',
    verify: async (lab) => {
      await math(lab.locator('.square-result > p'), '\\{0,\\;4,\\;8,\\;12\\}');
      await fill(lab, [
        ['Modulus m', '72'],
        ['Target a', '1'],
      ]);
      await lab
        .getByRole('button', { name: 'Find exact roots', exact: true })
        .click();
      const local = lab.locator('.square-local-card');
      assert.equal(await local.count(), 2);
      await math(
        local.filter({
          has: lab.page().getByRole('heading', {
            name: 'Local modulus 2 to the power 3',
            exact: true,
          }),
        }),
        '1,\\;3,\\;5,\\;7',
      );
      await math(
        local.filter({
          has: lab.page().getByRole('heading', {
            name: 'Local modulus 3 to the power 2',
            exact: true,
          }),
        }),
        '1,\\;8',
      );
      await math(
        lab.locator('.square-result > p'),
        '\\{1,\\;17,\\;19,\\;35,\\;37,\\;53,\\;55,\\;71\\}',
      );
      await fill(lab, [
        ['Modulus m', '16'],
        ['Target a', '0'],
      ]);
      await lab
        .getByRole('button', { name: 'Find exact roots', exact: true })
        .click();
      await math(lab.locator('.square-result > p'), '\\{0,\\;4,\\;8,\\;12\\}');
    },
    negative: [
      ['Modulus m', '32'],
      ['Target a', '12'],
    ],
    negativeVerify: async (lab) =>
      textIncludes(lab.locator('.square-result [role="status"]'), 'modulo 8'),
    invalid: [['Modulus m', '1']],
  },
  gaussian: {
    fields: [
      ['Real part of dividend', '7'],
      ['Imaginary part of dividend', '5'],
      ['Real part of divisor', '3'],
      ['Imaginary part of divisor', '2'],
    ],
    submit: 'Divide exactly',
    verify: async (lab) => {
      await math(lab, 'q=2+0i,\\quad r=1+1i');
      await math(lab, 'N(r)=2<N(\\beta)=13');
      await openDetails(lab, 'Read the exact certificate');
    },
    invalid: [
      ['Real part of divisor', '0'],
      ['Imaginary part of divisor', '0'],
    ],
  },
  'continued-fraction': {
    fields: [],
    submit: 'Build exact staircase',
    prepare: async (lab, lesson) => {
      await lab
        .getByLabel('Target type', { exact: true })
        .selectOption(lesson.id === 'R05' ? 'sqrt' : 'rational');
      if (lesson.id === 'R05') await fill(lab, [[/^Nonsquare D,/, '2']]);
      else
        await fill(lab, [
          [/^Numerator,/, '43'],
          [/^Positive denominator,/, '19'],
        ]);
    },
    verify: async (lab, lesson) => {
      if (lesson.id === 'R05') {
        await openDetails(lab, 'Reveal the full periodic expansion');
        await math(lab, '\\sqrt{2}=[1;\\overline{2}]');
        const slider = lab.getByRole('slider');
        const rows = lab
          .getByRole('table', {
            name: 'Convergents, norm differences, and error certificates',
            exact: true,
          })
          .locator('tbody tr');
        await slider.focus();
        await slider.press('Home');
        assert.equal(await slider.inputValue(), '1');
        assert.equal(await rows.count(), 1);
        await math(rows.first(), '1/1');
        await slider.press('ArrowRight');
        await slider.press('ArrowRight');
        assert.equal(await slider.inputValue(), '3');
        await textIncludes(
          lab.locator('.cf-lab__depth output'),
          '3 of 16 entries',
        );
        assert.equal(await rows.count(), 3);
        for (const [index, fraction, determinant, norm, next, bound] of [
          [0, '1/1', '-1', '1', '2', '<1/2'],
          [1, '3/2', '1', '-1', '5', '<1/10'],
          [2, '7/5', '-1', '1', '12', '<1/60'],
        ]) {
          const cells = rows.nth(index).locator('td');
          await math(cells.nth(0), fraction);
          assert.equal(await cells.nth(1).textContent(), determinant);
          assert.equal(await cells.nth(2).textContent(), norm);
          await textIncludes(cells.nth(3), index === 1 ? 'above' : 'below');
          assert.equal(await cells.nth(4).textContent(), next);
          await math(cells.nth(5), bound);
        }
      } else {
        const slider = lab.getByRole('slider');
        await slider.focus();
        await slider.press('End');
        assert.equal(await slider.inputValue(), '4');
        await textIncludes(
          lab.locator('.cf-lab__depth output'),
          '4 of 4 entries',
        );
        const rows = lab
          .getByRole('table', {
            name: 'Truncations, determinants, and exact errors',
            exact: true,
          })
          .locator('tbody tr');
        assert.equal(await rows.count(), 4);
        await math(rows.last(), '43/19');
        await math(lab, '[2;3,1,4]');
        await slider.press('Home');
        assert.equal(await slider.inputValue(), '1');
        await textIncludes(
          lab.locator('.cf-lab__depth output'),
          '1 of 4 entries',
        );
        assert.equal(await rows.count(), 1);
        assert(
          !(await renderedMath(lab)).includes('[2;3,1,4]'),
          'Hidden canonical expansion satisfied a visible prefix check',
        );
      }
    },
    prepareInvalid: async (lab) => {
      await lab.getByLabel('Target type', { exact: true }).selectOption('sqrt');
      await fill(lab, [[/^Nonsquare D,/, '4']]);
    },
  },
  pell: {
    fields: [
      [/^Positive nonsquare D,/, '2'],
      [/^Positive solutions to show,/, '3'],
    ],
    submit: 'Build Pell orbit',
    verify: async (lab) => {
      assert.deepEqual(
        await lab
          .locator('table tbody tr')
          .evaluateAll((rows) =>
            rows.map((row) =>
              [...row.querySelectorAll('td')].map((cell) => cell.textContent),
            ),
          ),
        [
          ['3', '2', '1'],
          ['17', '12', '1'],
          ['99', '70', '1'],
        ],
      );
      await math(lab, '1^2-2(1)^2=-1');
      await lab
        .getByRole('button', { name: 'D = 3 · even period', exact: true })
        .click();
      await textIncludes(
        lab.locator('.pell-lab__readouts'),
        'No positive norm −1 solution',
      );
    },
    invalid: [[/^Positive nonsquare D,/, '4']],
  },
};

export async function labs(suite) {
  await conjectureClinic(suite);
  const entries = suite.data.map.lessons.filter((lesson) => lesson.lab);
  assert.deepEqual(
    [...new Set(entries.map((lesson) => lesson.lab))].sort(),
    Object.keys(cases).sort(),
    'Lab driver and source kinds drifted',
  );
  for (const profile of suite.profiles) {
    for (const lesson of entries) {
      await runCase(
        suite,
        profile,
        `labs-${lesson.id}-${lesson.lab}`,
        [`lab:${lesson.id}`],
        async ({ page, go, step }) => {
          await go('/studio');
          await step(
            `Open Studio entry ${lesson.id} at its experiment`,
            async () => {
              const card = page.locator('.studio-card').filter({
                has: page.getByRole('heading', {
                  name: lesson.title,
                  exact: true,
                }),
              });
              await card
                .getByRole('button', { name: 'Open exact lab' })
                .click();
              await visible(
                page.locator(`[data-lesson-id="${lesson.id}"] #lab`),
              );
              assert.equal(new URL(page.url()).hash, '#lab');
            },
          );
          const lab = page.locator('#lab');
          const fixture = cases[lesson.lab];
          await step(
            'Compute exact positive fixture and inspect the visible certificate',
            async () => {
              await fixture.prepare?.(lab, lesson);
              await fill(lab, fixture.fields);
              await lab
                .getByRole('button', { name: fixture.submit, exact: true })
                .click();
              await fixture.verify(lab, lesson);
            },
          );
          if (fixture.negative)
            await step('Compute a valid input with no solution', async () => {
              await fill(lab, fixture.negative);
              await lab
                .getByRole('button', { name: fixture.submit, exact: true })
                .click();
              if (fixture.negativeVerify) await fixture.negativeVerify(lab);
              else await textIncludes(lab, fixture.negativeText);
            });
          await step(
            'Reject invalid input without changing the shareable result',
            async () => {
              const before = page.url();
              const beforeMath = await resultMath(lab);
              const beforeRows = await lab
                .locator('table:visible tbody')
                .allTextContents();
              if (lesson.lab === 'order' || lesson.lab === 'hensel')
                assert(
                  beforeRows.length > 0 &&
                    beforeRows.every((rows) => rows.trim()),
                  'Row preservation requires a visible populated table',
                );
              await fixture.prepareInvalid?.(lab);
              await fill(lab, fixture.invalid ?? []);
              await lab
                .getByRole('button', { name: fixture.submit, exact: true })
                .click();
              await visible(lab.getByRole('alert'));
              assert(
                (await lab.getByRole('alert').innerText()).trim(),
                'Input error has no explanation',
              );
              assert.equal(
                page.url(),
                before,
                'Invalid submission changed URL state',
              );
              assert.deepEqual(
                await resultMath(lab),
                beforeMath,
                'Invalid input changed visible formulas',
              );
              assert.deepEqual(
                await lab.locator('table:visible tbody').allTextContents(),
                beforeRows,
                'Invalid input changed visible result rows',
              );
              await fixture.prepare?.(lab, lesson);
              await fill(lab, fixture.fields);
              await lab
                .getByRole('button', { name: fixture.submit, exact: true })
                .click();
              assert.equal(await lab.getByRole('alert').count(), 0);
              await fixture.verify(lab, lesson);
            },
          );
        },
      );
    }
  }
}
