import assert from 'node:assert/strict';
import { profiles, runCase, textIncludes, visible } from './browser.mjs';

async function fill(lab, fields) {
  for (const [label, value] of fields)
    await lab
      .getByLabel(label, { exact: typeof label === 'string' })
      .fill(value);
}

async function math(lab, expected) {
  const values = await lab
    .locator('annotation[encoding="application/x-tex"]')
    .allTextContents();
  const compact = (value) => value.replace(/\s/g, '');
  assert(
    values.some((value) => compact(value) === compact(expected)),
    `Missing exact rendered result ${expected}. Observed ${JSON.stringify(values.slice(-18))}`,
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
      await lab
        .getByText('Show the complete exact map', { exact: true })
        .click();
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
    verify: async (lab) => math(lab, 'x\\equiv8\\pmod{18}'),
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
    fields: [[/^Positive integer n,/, '12']],
    submit: 'Build divisor trace',
    verify: async (lab, lesson) => {
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
        .getByRole('button', { name: 'Short cycle modulo 7', exact: true })
        .click();
      await math(lab, '\\operatorname{ord}_{7}(2)=3');
      await textIncludes(lab.locator('.group-lab__status'), 'Generator: no');
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
      await lab
        .getByRole('button', {
          name: 'Open coordinates and parity proof',
          exact: true,
        })
        .click();
      await math(lab, 'S_3(7)+S_7(3)=2+1=3');
    },
    invalid: [['Odd prime p, from three to thirty-one', '7']],
  },
  'local-squares': {
    fields: [
      ['Modulus m', '16'],
      ['Target a', '0'],
    ],
    submit: 'Find exact roots',
    verify: async (lab) => math(lab, '0,\\;4,\\;8,\\;12'),
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
      await lab
        .getByText('Read the exact certificate', { exact: true })
        .click();
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
        await lab
          .getByText('Reveal the full periodic expansion', { exact: true })
          .click();
        await math(lab, '\\sqrt{2}=[1;\\overline{2}]');
      } else {
        const slider = lab.getByRole('slider');
        await slider.focus();
        await slider.press('End');
        await math(lab, '[2;3,1,4]');
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
  const entries = suite.data.map.lessons.filter((lesson) => lesson.lab);
  assert.deepEqual(
    [...new Set(entries.map((lesson) => lesson.lab))].sort(),
    Object.keys(cases).sort(),
    'Lab driver and source kinds drifted',
  );
  for (const profile of Object.keys(profiles)) {
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
            },
          );
        },
      );
    }
  }
}
