import assert from 'node:assert/strict';
import {
  authoredText,
  focused,
  runCase,
  textIncludes,
  visible,
} from './browser.mjs';
import { clinicUrls } from './conjecture-clinic.mjs';

const invalidParameter = {
  euclid: 'a',
  residue: 'rm',
  cancellation: 'fiberN',
  linear: 'ln',
  crt: 'cm',
  divisor: 'divisorN',
  hensel: 'hp',
  order: 'orderP',
  quadratic: 'qp',
  lattice: 'latticeP',
  'local-squares': 'squareM',
  gaussian: 'ga',
  'continued-fraction': 'cfterms',
  pell: 'pellD',
};

async function drawerOpen(page) {
  await page.getByRole('button', { name: 'Open lessons', exact: true }).click();
  await focused(page.locator('#lesson-search'));
  assert(
    await page.locator('#main-content').evaluate((element) => element.inert),
    'Drawer must make main content inert',
  );
  assert.equal(
    await page.locator('body').evaluate((element) => element.style.overflow),
    'hidden',
  );
}

async function drawerClosed(page, target) {
  await page.waitForFunction(
    () => !document.getElementById('main-content')?.inert,
  );
  assert.equal(
    await page.locator('body').evaluate((element) => element.style.overflow),
    '',
  );
  assert.equal(
    await page
      .getByRole('button', { name: 'Open lessons', exact: true })
      .getAttribute('aria-expanded'),
    'false',
  );
  await focused(target);
}

export async function urls(suite) {
  await clinicUrls(suite);
  for (const profile of suite.profiles) {
    await runCase(
      suite,
      profile,
      'urls-history-keyboard',
      [
        'feature:legacy-url-lab-reload',
        'feature:back-forward',
        'feature:unknown-route',
        'feature:webmcp-absent-human-flow',
        'feature:section-jump-reload-same-lesson',
        'feature:skip-link-keyboard',
        'journey:search-prerequisite-lab-share-reload',
      ],
      async ({ page, go, step, data }) => {
        const euclid = data.map.lessons.find((lesson) => lesson.id === 'D04');
        await go('/explore');
        await step(
          'Activate the skip link and a chapter hash with heading focus',
          async () => {
            const skip = page.getByRole('link', {
              name: 'Skip to content',
              exact: true,
            });
            await skip.focus();
            await skip.press('Enter');
            await focused(page.locator('#main-content'));
            const chapter = page.locator('.journey-map a').first();
            const hash = await chapter.getAttribute('href');
            await chapter.click();
            assert.equal(new URL(page.url()).hash, hash);
            await focused(page.locator(`${hash} > h2`));
          },
        );
        await step(
          'Search for Euclid, follow a prerequisite, then return to its experiment',
          async () => {
            await page.locator('#atlas-filter').fill('D04');
            await page
              .locator('.atlas-card')
              .filter({ hasText: 'D04' })
              .click();
            await visible(page.locator('[data-lesson-id="D04"]'));
            await page
              .locator('.lesson-preparation')
              .getByRole('button')
              .filter({ hasText: 'D03' })
              .click();
            await visible(page.locator('[data-lesson-id="D03"]'));
            await page.goBack();
            await visible(page.locator('[data-lesson-id="D04"]'));
            await page
              .locator('.lesson-sections')
              .getByRole('link', { name: 'Experiment', exact: true })
              .click();
            await focused(page.locator('#lab h2'));
            await page
              .locator('#lab')
              .getByLabel('First integer', { exact: true })
              .fill('391');
            await page
              .locator('#lab')
              .getByLabel('Second integer', { exact: true })
              .fill('299');
            await page
              .locator('#lab')
              .getByRole('button', { name: 'Run Euclid', exact: true })
              .click();
            const shared = page.url();
            await page.reload();
            assert.equal(page.url(), shared);
            await authoredText(
              page.locator('#lab .answer-strip strong'),
              '\\(\\gcd(391,299)=23\\)',
            );
          },
        );
        await go(`${euclid.legacyRoute}&a=240&b=46`);
        await step(
          'Restore legacy lab inputs, change them, reload, and traverse history',
          async () => {
            const lab = page.locator('#lab');
            assert.equal(
              await lab
                .getByLabel('First integer', { exact: true })
                .inputValue(),
              '240',
            );
            assert.equal(
              await lab
                .getByLabel('Second integer', { exact: true })
                .inputValue(),
              '46',
            );
            await authoredText(
              lab.locator('.answer-strip strong'),
              '\\(\\gcd(240,46)=2\\)',
            );
            await lab.getByLabel('First integer', { exact: true }).fill('391');
            await lab.getByLabel('Second integer', { exact: true }).fill('299');
            await lab
              .getByRole('button', { name: 'Run Euclid', exact: true })
              .click();
            const shared = page.url();
            assert(new URL(shared).pathname === euclid.route);
            await page.reload({ waitUntil: 'load' });
            assert.equal(
              await lab
                .getByLabel('First integer', { exact: true })
                .inputValue(),
              '391',
            );
            assert.equal(
              await lab
                .getByLabel('Second integer', { exact: true })
                .inputValue(),
              '299',
            );
            await authoredText(
              lab.locator('.answer-strip strong'),
              '\\(\\gcd(391,299)=23\\)',
            );
            await page
              .getByRole('navigation', { name: 'Main navigation', exact: true })
              .getByRole('button', { name: 'Explore', exact: true })
              .click();
            await page.goBack({ waitUntil: 'load' });
            await visible(page.locator('[data-lesson-id="D04"]'));
            assert.equal(
              await lab
                .getByLabel('Second integer', { exact: true })
                .inputValue(),
              '299',
            );
            assert.equal(
              await lab
                .getByLabel('First integer', { exact: true })
                .inputValue(),
              '391',
            );
            await authoredText(
              lab.locator('.answer-strip strong'),
              '\\(\\gcd(391,299)=23\\)',
            );
            assert.equal(new URL(page.url()).pathname, euclid.route);
            await page.goForward({ waitUntil: 'load' });
            await visible(
              page.getByRole('heading', {
                name: 'Explore the atlas',
                exact: true,
              }),
            );
          },
        );
        await go(`${euclid.route}#proof`);
        await focused(page.locator('#proof h2'));
        await page.reload({ waitUntil: 'load' });
        await focused(page.locator('#proof h2'));
        await step('Use the interface with native WebMCP absent', async () => {
          assert.equal(
            await page.evaluate(() => Boolean(document.modelContext)),
            false,
            'This lane requires the absent-host human fallback; native host needs separate evidence',
          );
          await page
            .locator('.lesson-sections')
            .getByRole('link', { name: 'Your turn', exact: true })
            .click();
          await page
            .locator('#practice')
            .getByRole('button', { name: 'Show justified answer', exact: true })
            .click();
          await visible(page.locator('#practice .answer'));
          return {
            nativeWebMCP: {
              status: 'verified-unreachable',
              route: page.url(),
              prerequisite:
                'Native document.modelContext and an IAB WebMCP host are absent in this Playwright context',
            },
          };
        });
        for (const path of [
          '/lessons/z99',
          '/?view=lesson&lesson=Z99',
          '/verification-unknown-route',
        ]) {
          await go(path);
          await page
            .getByRole('button', { name: 'Return to the atlas', exact: true })
            .click();
          assert.equal(new URL(page.url()).pathname, '/');
          await visible(page.locator('.atlas-hero'));
        }
      },
    );
    await runCase(
      suite,
      profile,
      'urls-continued-fraction-focus',
      [],
      async ({ page, go, step, data }) => {
        const lesson = data.map.lessons.find((item) => item.id === 'R01');
        await go(`${lesson.route}?cfn=43&cfd=19&cfterms=4#lab`);
        await step(
          'Two ArrowLeft presses keep focus and reveal two fewer entries',
          async () => {
            const slider = page.getByRole('slider', {
              name: 'Reveal convergents through entry',
              exact: true,
            });
            assert.equal(await slider.inputValue(), '4');
            await slider.focus();
            const states = [
              {
                value: await slider.inputValue(),
                focused: await slider.evaluate(
                  (element) => element === document.activeElement,
                ),
              },
            ];
            await page.keyboard.press('ArrowLeft');
            states.push({
              value: await slider.inputValue(),
              focused: await slider.evaluate(
                (element) => element === document.activeElement,
              ),
            });
            await page.keyboard.press('ArrowLeft');
            states.push({
              value: await slider.inputValue(),
              focused: await slider.evaluate(
                (element) => element === document.activeElement,
              ),
            });
            assert.deepEqual(
              states,
              [
                { value: '4', focused: true },
                { value: '3', focused: true },
                { value: '2', focused: true },
              ],
              'Consecutive keyboard steps and focus must survive re-render',
            );
            assert.equal(new URL(page.url()).searchParams.get('cfterms'), '2');
            await page.reload({ waitUntil: 'load' });
            assert.equal(await slider.inputValue(), '2');
            await page.goBack({ waitUntil: 'load' });
            assert.equal(await slider.inputValue(), '3');
          },
        );
      },
    );
    for (const lesson of suite.data.map.lessons.filter((item) => item.lab)) {
      await runCase(
        suite,
        profile,
        `urls-malformed-${lesson.id}`,
        [],
        async ({ page, go, step }) => {
          const key = invalidParameter[lesson.lab];
          assert(key, `Missing malformed URL case for ${lesson.lab}`);
          const inputs = async () => {
            const fields = page.locator(
              '#lab input:visible, #lab select:visible',
            );
            await visible(fields.first());
            return fields.evaluateAll((elements) =>
              elements.map((field) => ({
                tag: field.tagName,
                type: field.type,
                value: field.value,
              })),
            );
          };
          await go(`${lesson.route}#lab`);
          const defaults = await inputs();
          await go(`${lesson.route}?${key}=garbage#lab`);
          await step(
            'Malformed URL leaves lesson and navigation usable',
            async () => {
              await visible(
                page.locator(`[data-lesson-id="${lesson.id}"] #lab`),
              );
              await visible(
                page.getByRole('status').filter({
                  hasText:
                    'Invalid experiment inputs in this URL. Restored default examples',
                }),
              );
              assert.deepEqual(
                await inputs(),
                defaults,
                'Malformed URL did not restore the clean route inputs',
              );
              await page
                .getByRole('navigation', {
                  name: 'Main navigation',
                  exact: true,
                })
                .getByRole('button', { name: 'Learn', exact: true })
                .click();
              await visible(page.locator('.atlas-hero'));
            },
          );
        },
      );
    }
    if (profile === 'desktop') continue;
    for (const path of ['/', suite.data.map.lessons[0].route]) {
      for (const close of ['Escape', 'button', 'scrim']) {
        await runCase(
          suite,
          profile,
          `urls-drawer-${path === '/' ? 'learn' : 'lesson'}-${close}`,
          ['feature:mobile-drawer-focus-escape'],
          async ({ page, go, step }) => {
            await go(path);
            await step(`Open drawer and close through ${close}`, async () => {
              await drawerOpen(page);
              if (close === 'Escape') await page.keyboard.press('Escape');
              else if (close === 'scrim') {
                const scrim = page.getByRole('button', {
                  name: 'Close lesson navigation',
                  exact: true,
                });
                const backdrop = await scrim.boundingBox();
                const sidebar = await page
                  .locator('#lesson-sidebar')
                  .boundingBox();
                assert(
                  backdrop && sidebar,
                  'Drawer backdrop geometry unavailable',
                );
                const left = sidebar.x + sidebar.width;
                assert(
                  left < backdrop.x + backdrop.width,
                  'Drawer leaves no exposed backdrop',
                );
                await scrim.click({
                  position: {
                    x: (left + backdrop.x + backdrop.width) / 2 - backdrop.x,
                    y: backdrop.height / 2,
                  },
                });
              } else
                await page
                  .getByRole('button', {
                    name:
                      close === 'button'
                        ? 'Close lessons'
                        : 'Close lesson navigation',
                    exact: true,
                  })
                  .click();
              const menu = page.getByRole('button', {
                name: 'Open lessons',
                exact: true,
              });
              await drawerClosed(page, menu);
              await page.keyboard.press('Tab');
              assert(
                !(await page
                  .locator('#lesson-sidebar')
                  .evaluate((element) =>
                    element.contains(document.activeElement),
                  )),
                'Focus remained trapped after close',
              );
            });
          },
        );
      }
    }
    await runCase(
      suite,
      profile,
      'urls-drawer-selection-tab-section',
      ['journey:mobile-keyboard-reading'],
      async ({ page, go, step, data }) => {
        const [first, second] = data.map.lessons;
        await go(first.route);
        await step('Select same and different lesson from drawer', async () => {
          for (const lesson of [first, second]) {
            await drawerOpen(page);
            await page.locator('#lesson-search').fill(lesson.id);
            await page
              .locator('#lesson-sidebar a')
              .filter({ hasText: lesson.id })
              .click();
            await drawerClosed(page, page.locator('#lesson-heading'));
            assert.equal(
              await page
                .locator('[data-lesson-id]')
                .getAttribute('data-lesson-id'),
              lesson.id,
            );
          }
        });
        await step(
          'Wrap Tab and Shift+Tab over visible drawer controls',
          async () => {
            await drawerOpen(page);
            const controls = page
              .locator('#lesson-sidebar')
              .locator(
                'button:visible:not([disabled]), a[href]:visible, input:visible:not([disabled])',
              );
            const firstControl = controls.first();
            const lastControl = controls.last();
            await firstControl.focus();
            await page.keyboard.press('Shift+Tab');
            await focused(lastControl);
            await page.keyboard.press('Tab');
            await focused(firstControl);
            await page.keyboard.press('Escape');
            await drawerClosed(
              page,
              page.getByRole('button', { name: 'Open lessons', exact: true }),
            );
          },
        );
        await step(
          'Back and Forward close the drawer and focus their destinations',
          async () => {
            await go(`${first.route}#proof`);
            await focused(page.locator('#proof h2'));
            await page
              .getByRole('navigation', { name: 'Main navigation', exact: true })
              .getByRole('button', { name: 'Explore', exact: true })
              .click();
            await drawerOpen(page);
            await page.goBack({ waitUntil: 'load' });
            await drawerClosed(page, page.locator('#proof h2'));
            assert.equal(new URL(page.url()).hash, '#proof');
            await drawerOpen(page);
            await page.goForward({ waitUntil: 'load' });
            await drawerClosed(page, page.locator('#main-content h1'));
            assert.equal(new URL(page.url()).pathname, '/explore');
          },
        );
      },
    );
  }
}
