import assert from 'node:assert/strict';
import {
  checkPage,
  focused,
  runCase,
  textIncludes,
  visible,
} from './browser.mjs';

const fixtures = {
  C02: ['n = 2, c = 0, a = 0, b = 1', 'n = 4, c = 2, a = 0, b = 2'],
  C06: ['n = 2, a = 0', 'n = 4, a = 2'],
  C07: ['m = 2, n = 2', 'm = 2, n = 4'],
  F01: ['n = 8; roots = {1, 3, 5, 7}', 'n = 15; roots = {1, 4, 11, 14}'],
  Q06: ['n = 9, a = 2', 'n = 15, a = 2'],
};
function divisorGcd(a, b) {
  for (let d = Math.max(a, b); d >= 1; d--)
    if (a % d === 0 && b % d === 0) return d;
  throw new Error('Expected positive modulus.');
}
function phi(n) {
  return Array.from({ length: n }, (_, a) => a).filter(
    (a) => divisorGcd(a, n) === 1,
  ).length;
}
function prime(n) {
  for (let d = 2; d < n; d++) if (n % d === 0) return false;
  return n > 1;
}
function squarefree(n) {
  for (let d = 2; d * d <= n; d++) if (n % (d * d) === 0) return false;
  return true;
}
function squareSet(n) {
  return new Set(Array.from({ length: n }, (_, x) => (x * x) % n));
}
function jacobi(a, n) {
  let sign = 1;
  for (let p = 3; p <= n; p += 2) {
    if (!prime(p)) continue;
    while (n % p === 0) {
      sign *= squareSet(p).has(a % p) ? 1 : -1;
      n /= p;
    }
  }
  return sign;
}
function counts(id, condition) {
  let admitted = 0,
    premises = 0,
    failures = 0;
  if (id === 'C02')
    for (let n = 2; n <= 18; n++)
      for (let c = 0; c < n; c++) {
        const d = divisorGcd(c, n);
        if (
          (condition === 'nonzero' && c === 0) ||
          (condition === 'unit' && d !== 1)
        )
          continue;
        admitted += n * n;
        premises += n * d;
        failures += n * (d - 1);
      }
  if (id === 'C06')
    for (let n = 2; n <= 24; n++)
      for (let a = 0; a < n; a++) {
        if (
          (condition === 'nonzero' && a === 0) ||
          (condition === 'unit' && divisorGcd(a, n) !== 1)
        )
          continue;
        admitted++;
        premises++;
        if (BigInt(a) ** BigInt(phi(n)) % BigInt(n) !== 1n) failures++;
      }
  if (id === 'C07')
    for (let m = 2; m <= 16; m++)
      for (let n = 2; n <= 16; n++) {
        if (
          (condition === 'distinct' && m === n) ||
          (condition === 'coprime' && divisorGcd(m, n) !== 1)
        )
          continue;
        admitted++;
        premises++;
        if (phi(m * n) !== phi(m) * phi(n)) failures++;
      }
  if (id === 'F01')
    for (let n = 2; n <= 31; n++) {
      if (
        (condition === 'odd' && n % 2 === 0) ||
        (condition === 'prime' && !prime(n))
      )
        continue;
      admitted++;
      premises++;
      if (
        Array.from({ length: n }, (_, x) => x).filter(
          (x) => (x * x - 1) % n === 0,
        ).length > 2
      )
        failures++;
    }
  if (id === 'Q06')
    for (let n = 3; n <= 35; n += 2)
      for (let a = 1; a < n; a++) {
        if (
          divisorGcd(a, n) !== 1 ||
          (condition === 'squarefree' && !squarefree(n)) ||
          (condition === 'prime' && !prime(n))
        )
          continue;
        admitted++;
        if (jacobi(a, n) !== 1) continue;
        premises++;
        if (!squareSet(n).has(a)) failures++;
      }
  return [admitted, premises, failures].map((value) =>
    value.toLocaleString('en'),
  );
}
async function checkCounts(clinic, id, condition) {
  assert.deepEqual(
    await clinic.locator('.clinic-counts dd').allTextContents(),
    counts(id, condition),
  );
}
async function search(clinic, repaired = false) {
  const button = clinic.getByRole('button', {
    name: repaired ? 'Test this repair' : 'Search exact cases',
    exact: true,
  });
  await button.click();
  await focused(button);
}
async function choose(clinic, choice) {
  const radio = clinic.getByRole('radio', { name: choice.label, exact: false });
  await radio.check();
  await focused(radio);
  assert.equal(await clinic.locator('.clinic-counts').count(), 0);
}

export async function conjectureClinic(suite) {
  for (const profile of suite.profiles)
    for (const investigation of suite.data.map.investigations) {
      await runCase(
        suite,
        profile,
        `conjecture-clinic-${investigation.id}`,
        [`investigation:${investigation.id}`],
        async ({ page, go, step }) => {
          await go('/studio');
          const clinic = page.locator('#conjecture-clinic');
          await step(
            'Discover the Clinic and select its source-linked claim',
            async () => {
              await visible(
                clinic.getByRole('heading', {
                  name: 'Conjecture Clinic',
                  exact: true,
                }),
              );
              const picker = clinic.getByLabel('Choose an investigation', {
                exact: true,
              });
              await picker.focus();
              await picker.selectOption(investigation.id);
              await focused(picker);
              assert.equal(new URL(page.url()).hash, '#conjecture-clinic');
            },
          );
          for (const [index, choice] of investigation.choices.entries()) {
            await step(
              `Search the complete domain under ${choice.label}`,
              async () => {
                if (index) await choose(clinic, choice);
                await search(clinic, index > 0);
                assert.equal(
                  new URL(page.url()).searchParams.get('searched'),
                  '1',
                );
                await checkCounts(clinic, investigation.id, choice.condition);
                const evidence = clinic.locator('.clinic-evidence');
                if (index < 2) {
                  await textIncludes(
                    evidence.locator('.clinic-witness-summary'),
                    fixtures[investigation.id][index],
                  );
                  await visible(
                    evidence.getByRole('heading', {
                      name: 'The premise holds',
                      exact: true,
                    }),
                  );
                  await visible(
                    evidence.getByRole('heading', {
                      name: 'The conclusion fails',
                      exact: true,
                    }),
                  );
                  await evidence.locator('summary').click();
                  await visible(evidence.locator('.clinic-arithmetic[open]'));
                  if (
                    investigation.id === 'F01' ||
                    investigation.id === 'Q06'
                  ) {
                    const n =
                      investigation.id === 'F01'
                        ? [8, 15][index]
                        : [9, 15][index];
                    assert.equal(await evidence.locator('tbody tr').count(), n);
                    const expectedSquares = Array.from({ length: n }, (_, x) =>
                      String((x * x) % n),
                    );
                    assert.deepEqual(
                      await evidence
                        .locator('tbody tr td:first-of-type')
                        .allTextContents(),
                      expectedSquares,
                    );
                  }
                  if (investigation.id === 'Q06') {
                    await textIncludes(
                      evidence.locator('.clinic-arithmetic'),
                      index
                        ? 'Legendre (2/3) = -1'
                        : 'Legendre (2/3) = -1, with exponent 2',
                    );
                    if (index)
                      await textIncludes(
                        evidence.locator('.clinic-arithmetic'),
                        'Legendre (2/5) = -1',
                      );
                  }
                } else {
                  await visible(
                    evidence.getByRole('heading', {
                      name: 'No counterexample within these bounds.',
                      exact: true,
                    }),
                  );
                  await textIncludes(
                    evidence,
                    'No premise-true tested case violates the conclusion.',
                  );
                  await textIncludes(evidence, 'does not prove');
                  assert.equal(
                    await evidence.locator('.clinic-witness-summary').count(),
                    0,
                  );
                }
                await checkPage(page);
              },
            );
          }
          await step(
            'Open the authored proof and the matching whole-proof notebook',
            async () => {
              await clinic
                .getByRole('link', {
                  name: 'Read the authored proof',
                  exact: true,
                })
                .click();
              await focused(page.locator('#proof h2'));
              assert.equal(
                await page
                  .locator('[data-lesson-id]')
                  .getAttribute('data-lesson-id'),
                investigation.proofLessonId,
              );
              await page.goBack({ waitUntil: 'load' });
              await focused(page.locator('#clinic-heading'));
              await clinic
                .getByRole('button', {
                  name: 'Write why the repair works',
                  exact: true,
                })
                .click();
              await focused(page.locator('#proof-notebook-heading'));
              assert.equal(
                await page
                  .getByLabel('Lesson to prove', { exact: true })
                  .inputValue(),
                investigation.notebookLessonId,
              );
            },
          );
        },
      );
    }
}

export async function clinicUrls(suite) {
  for (const profile of suite.profiles)
    await runCase(
      suite,
      profile,
      'conjecture-clinic-urls-kept-notebook',
      [
        'feature:conjecture-clinic-kept-witness',
        'feature:conjecture-clinic-urls-focus',
        'feature:conjecture-clinic-proof-notebook',
      ],
      async ({ page, go, step, data }) => {
        const clinic = page.locator('#conjecture-clinic'),
          heading = page.locator('#clinic-heading');
        const c02 = data.map.investigations.find((item) => item.id === 'C02');
        const lesson = data.map.lessons.find((item) => item.id === 'C02');
        await go(`${lesson.route}#boundary`);
        await step(
          'Enter from the lesson boundary with heading focus',
          async () => {
            await page
              .getByRole('button', {
                name: 'Investigate in Conjecture Clinic',
                exact: false,
              })
              .click();
            await focused(heading);
            assert.equal(new URL(page.url()).pathname, '/studio');
            assert.equal(
              new URL(page.url()).searchParams.get('investigate'),
              'C02',
            );
            const all = clinic.getByRole('radio', {
              name: c02.choices[0].label,
              exact: false,
            });
            await all.focus();
            await page.keyboard.press('ArrowDown');
            const nonzero = clinic.getByRole('radio', {
              name: c02.choices[1].label,
              exact: false,
            });
            await focused(nonzero);
            assert.equal(await nonzero.isChecked(), true);
            await page.keyboard.press('ArrowUp');
            await focused(all);
            assert.equal(await all.isChecked(), true);
          },
        );
        await step(
          'Keep exact arithmetic while a new hypothesis excludes and readmits it',
          async () => {
            await search(clinic);
            await clinic
              .getByRole('button', { name: 'Keep this witness', exact: true })
              .click();
            const kept = clinic.locator('.clinic-kept');
            await visible(
              kept.getByRole('heading', {
                name: 'Still admitted',
                exact: true,
              }),
            );
            const facts = await kept.locator('.clinic-fact').allTextContents();
            const original = page.url();
            await choose(clinic, c02.choices[1]);
            await visible(
              kept.getByRole('heading', {
                name: 'Excluded by this condition',
                exact: true,
              }),
            );
            await textIncludes(kept, 'The factor c = 0 is zero.');
            assert.deepEqual(
              await kept.locator('.clinic-fact').allTextContents(),
              facts,
            );
            await search(clinic, true);
            const repaired = page.url();
            await textIncludes(
              clinic.locator('.clinic-evidence .clinic-witness-summary'),
              fixtures.C02[1],
            );
            await page.goBack({ waitUntil: 'load' });
            await focused(heading);
            assert.equal(
              page.url(),
              original,
              'Search must replace its condition entry, leaving the original searched condition behind it.',
            );
            await visible(
              kept.getByRole('heading', {
                name: 'Still admitted',
                exact: true,
              }),
            );
            assert.deepEqual(
              await kept.locator('.clinic-fact').allTextContents(),
              facts,
            );
            await page.goForward({ waitUntil: 'load' });
            await focused(heading);
            assert.equal(page.url(), repaired);
            await checkCounts(clinic, 'C02', 'nonzero');
            await choose(clinic, c02.choices[2]);
            await search(clinic, true);
            await textIncludes(kept, 'gcd(0,2) = 2.');
            await visible(
              kept.getByRole('heading', {
                name: 'Excluded by this condition',
                exact: true,
              }),
            );
            await clinic
              .getByLabel('Choose an investigation', { exact: true })
              .selectOption('C06');
            assert.equal(
              await clinic.locator('.clinic-kept').count(),
              0,
              'Kept witnesses are case-specific.',
            );
            await clinic
              .getByLabel('Choose an investigation', { exact: true })
              .selectOption('C02');
            await visible(
              kept.getByRole('heading', {
                name: 'Still admitted',
                exact: true,
              }),
            );
            assert.deepEqual(
              await kept.locator('.clinic-fact').allTextContents(),
              facts,
            );
            await kept
              .getByRole('button', {
                name: 'Remove kept witness',
                exact: true,
              })
              .click();
            assert.equal(await clinic.locator('.clinic-kept').count(), 0);
            await focused(
              clinic.getByLabel('Choose an investigation', { exact: true }),
            );
            await search(clinic);
            await clinic
              .getByRole('button', { name: 'Keep this witness', exact: true })
              .click();
            await visible(
              kept.getByRole('heading', {
                name: 'Still admitted',
                exact: true,
              }),
            );
          },
        );
        await step(
          'Preserve the existing notebook draft across Clinic navigation',
          async () => {
            await clinic
              .getByRole('button', {
                name: 'Write why the repair works',
                exact: true,
              })
              .click();
            await focused(page.locator('#proof-notebook-heading'));
            const draft =
              'Invented local Clinic argument. A unit has an inverse.';
            await page
              .getByLabel('Your whole argument', { exact: true })
              .fill(draft);
            await page
              .getByRole('navigation', { name: 'Main navigation', exact: true })
              .getByRole('button', { name: 'Studio', exact: true })
              .click();
            await focused(heading);
            await visible(clinic.locator('.clinic-kept'));
            await clinic
              .getByRole('button', {
                name: 'Write why the repair works',
                exact: true,
              })
              .click();
            await focused(page.locator('#proof-notebook-heading'));
            assert.equal(
              await page
                .getByLabel('Your whole argument', { exact: true })
                .inputValue(),
              draft,
            );
            await page.goBack({ waitUntil: 'load' });
            await focused(heading);
            await search(clinic);
            const configuration = page.url();
            await page.reload({ waitUntil: 'load' });
            await focused(heading);
            assert.equal(page.url(), configuration);
            await checkCounts(clinic, 'C02', 'all');
            assert.equal(
              await clinic.locator('.clinic-kept').count(),
              0,
              'Reload clears kept witnesses.',
            );
            await clinic
              .getByRole('button', {
                name: 'Write why the repair works',
                exact: true,
              })
              .click();
            await focused(page.locator('#proof-notebook-heading'));
            assert.equal(
              await page
                .getByLabel('Your whole argument', { exact: true })
                .inputValue(),
              '',
              'Reload clears notebook drafts.',
            );
          },
        );
        await step(
          'Recompute direct shared configurations and recover bad links visibly',
          async () => {
            await go(
              '/studio?investigate=Q06&condition=prime&searched=1#conjecture-clinic',
            );
            await focused(heading);
            await checkCounts(clinic, 'Q06', 'prime');
            await visible(
              clinic.getByRole('heading', {
                name: 'No counterexample within these bounds.',
                exact: true,
              }),
            );
            for (const query of [
              'investigate=C05',
              'investigate=C02&condition=prime',
              'condition=unit',
              'investigate=C02&searched=0',
              'investigate=C02&investigate=C06',
            ]) {
              await go(`/studio?${query}#conjecture-clinic`);
              await focused(heading);
              await textIncludes(
                page
                  .getByRole('status')
                  .filter({ hasText: 'Unknown investigation or condition' }),
                'Choose a Conjecture Clinic investigation below.',
              );
              assert.equal(await clinic.locator('.clinic-counts').count(), 0);
              await clinic
                .getByLabel('Choose an investigation', { exact: true })
                .selectOption('C02');
              assert.equal(new URL(page.url()).search, '?investigate=C02');
              assert.equal(new URL(page.url()).hash, '#conjecture-clinic');
            }
            assert.equal(
              await clinic
                .getByRole('button', {
                  name: 'Remove kept witness',
                  exact: true,
                })
                .count(),
              0,
            );
          },
        );
      },
    );
}
