import assert from 'node:assert/strict';
import { profiles, runCase, textIncludes, visible } from './browser.mjs';

export async function discovery(suite) {
  const { map, pathDetails, chapterCheckpoints } = suite.data;
  for (const profile of Object.keys(profiles)) {
    const size = `${profiles[profile].width}x${profiles[profile].height}`;
    await runCase(
      suite,
      profile,
      'discovery-views-search',
      map.views
        .flatMap((path) => [`view:${path}`, `view-layout:${path}:${size}`])
        .concat([
          'feature:explore-search',
          'feature:sidebar-search',
          'feature:catalog-query-chapter-empty-states',
          'feature:reference-claim-index',
          'feature:course-current-historical',
        ]),
      async ({ page, go, step }) => {
        for (const path of map.views) {
          await go(path);
          await step('Verify active view and usable heading', async () => {
            assert.equal(
              await page.locator('.primary-nav [aria-current="page"]').count(),
              1,
            );
            assert((await page.locator('#main-content h1').innerText()).trim());
          });
        }
        await go('/explore');
        await step(
          'Search atlas for Euclid, then an absent phrase',
          async () => {
            const search = page.locator('#atlas-filter');
            await search.fill('Euclid');
            assert(
              (await page.locator('.chapter-grid .atlas-card').count()) > 0,
            );
            await search.fill('verification_no_matching_concept');
            await textIncludes(
              page.locator('#main-content [role="status"]'),
              'No matching lessons',
            );
            await search.fill('');
          },
        );
        await step(
          'Search sidebar, open a real result, recover from empty search',
          async () => {
            if (profile !== 'desktop')
              await page
                .getByRole('button', { name: 'Open lessons', exact: true })
                .click();
            const search = page.locator('#lesson-search');
            await search.fill('D04');
            await page.locator('#lesson-sidebar a', { hasText: 'D04' }).click();
            await visible(page.locator('[data-lesson-id="D04"]'));
            if (profile !== 'desktop')
              await page
                .getByRole('button', { name: 'Open lessons', exact: true })
                .click();
            await search.fill('verification_no_matching_concept');
            await textIncludes(
              page.locator('.search-empty'),
              'No lessons found',
            );
            await page
              .getByRole('button', { name: 'Clear search', exact: true })
              .click();
            assert.equal(await search.inputValue(), '');
            if (profile !== 'desktop') await page.keyboard.press('Escape');
          },
        );
        for (const path of ['/practice', '/studio', '/reference']) {
          await go(path);
          await step(`Filter ${path} by ID and empty result`, async () => {
            const search = page.getByLabel('Search this collection', {
              exact: true,
            });
            await search.fill('D04');
            assert.equal(
              await page
                .locator(
                  path === '/practice'
                    ? '.practice-item'
                    : path === '/studio'
                      ? '.studio-card'
                      : '.reference-list article',
                )
                .count(),
              1,
            );
            await search.fill('verification_no_matching_concept');
            await textIncludes(
              page.locator('#main-content [role="status"]').first(),
              'No ',
            );
            await search.fill('');
            await page
              .getByRole('combobox', { name: 'Chapter', exact: true })
              .selectOption(suite.data.lessons[0].cluster);
            assert.equal(
              await page
                .getByRole('combobox', { name: 'Chapter', exact: true })
                .inputValue(),
              suite.data.lessons[0].cluster,
            );
          });
        }
        await go('/reference');
        await step('Open an indexed claim in its lesson', async () => {
          const first = page.locator('.reference-list article').first();
          const id = (await first.locator(':scope > span').innerText()).trim();
          await first.getByRole('button', { name: 'Open lesson' }).click();
          await visible(page.locator(`[data-lesson-id="${id}"] #theorem`));
          assert.equal(new URL(page.url()).hash, '#theorem');
        });
        await go('/course');
        await textIncludes(
          page.locator('.course-group').filter({ hasText: 'MH-H01' }).first(),
          'Current handout topic',
        );
        await textIncludes(
          page.locator('.course-group').filter({ hasText: 'MH-H08' }).first(),
          'Historical alignment',
        );
        await page.locator('.course-group button').first().click();
        await visible(page.locator('[data-lesson-id]'));
      },
    );
    await runCase(
      suite,
      profile,
      'discovery-paths-checkpoints',
      [
        'feature:path-selection-persistence',
        'feature:continue-selected-route',
        'feature:checkpoint-answer-reveal',
        ...Object.keys(map.paths).map((id) => `path:${id}`),
        ...Object.keys(map.checkpoints).map((name) => `checkpoint:${name}`),
      ],
      async ({ page, go, step }) => {
        await go('/');
        for (const [id, path] of Object.entries(pathDetails)) {
          await step(
            `Select ${path.title}, reload, continue to first pending lesson`,
            async () => {
              await page
                .locator('.path-selector')
                .getByRole('button', { name: path.title, exact: true })
                .click();
              await page.reload({ waitUntil: 'load' });
              assert.equal(
                await page
                  .locator('.path-selector')
                  .getByRole('button', { name: path.title, exact: true })
                  .getAttribute('aria-pressed'),
                'true',
              );
              await page.locator('.continue-panel button').click();
              await visible(
                page.locator(`[data-lesson-id="${map.paths[id][0]}"]`),
              );
              await go('/');
            },
          );
        }
        await page
          .locator('.path-selector')
          .getByRole('button', { name: 'All lessons', exact: true })
          .click();
        await go('/explore');
        for (const [name, checkpoint] of Object.entries(chapterCheckpoints)) {
          await step(
            `Reveal ${name} checkpoint and follow its lesson link`,
            async () => {
              const chapter = page
                .locator('#main-content section.chapter')
                .filter({
                  has: page.getByRole('heading', {
                    name: new RegExp(
                      `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
                    ),
                  }),
                });
              const check = chapter.locator('.chapter-checkpoint');
              await check
                .getByRole('button', {
                  name: 'Compare your reasoning',
                  exact: true,
                })
                .click();
              assert.equal(
                await check
                  .getByRole('button', { name: 'Hide reasoning', exact: true })
                  .getAttribute('aria-expanded'),
                'true',
              );
              assert((await check.locator('p').count()) >= 2);
              await check
                .getByRole('button', {
                  name: new RegExp(`^${checkpoint.links[0]} `),
                })
                .click();
              await visible(
                page.locator(`[data-lesson-id="${checkpoint.links[0]}"]`),
              );
              await go('/explore');
            },
          );
        }
      },
    );
    await runCase(
      suite,
      profile,
      'discovery-diagnostic-preview',
      [
        'feature:learn-fiber-preview',
        'feature:diagnostic-all-correct',
        'feature:diagnostic-first-missed',
      ],
      async ({ page, go, step }) => {
        await go('/');
        await step(
          'Change the preview multiplier and inspect its fibers',
          async () => {
            const preview = page.locator('.home-fiber');
            const before = await preview.innerText();
            await preview
              .getByRole('button', { name: 'Multiply by 5', exact: true })
              .click();
            assert.notEqual(await preview.innerText(), before);
            await preview
              .getByRole('button', { name: 'Investigate every fiber' })
              .click();
            await visible(page.locator('[data-lesson-id="C02"] #lab'));
          },
        );
        for (const [correct, expected] of [
          [true, 'N05'],
          [false, 'P00'],
        ]) {
          await go('/');
          await step(
            `Complete diagnostic and open suggested ${expected}`,
            async () => {
              const diagnostic = page.locator('.diagnostic');
              assert(
                await diagnostic
                  .getByRole('button', {
                    name: 'Suggest a lesson',
                    exact: true,
                  })
                  .isDisabled(),
              );
              await diagnostic
                .getByRole('radio', {
                  name: correct
                    ? 'A valid universal argument'
                    : 'More examples',
                  exact: true,
                })
                .check();
              await diagnostic
                .getByRole('radio', {
                  name: 'When the gcd of c and n equals one',
                  exact: true,
                })
                .check();
              await diagnostic
                .getByRole('radio', {
                  name: 'The norm of alpha times beta equals the norm of alpha times the norm of beta',
                  exact: true,
                })
                .check();
              await diagnostic
                .getByRole('button', { name: 'Suggest a lesson', exact: true })
                .click();
              await textIncludes(
                diagnostic.locator('[role="status"]'),
                expected,
              );
              await diagnostic
                .getByRole('button', { name: 'Open this lesson' })
                .click();
              await visible(page.locator(`[data-lesson-id="${expected}"]`));
            },
          );
        }
      },
    );
  }
}
