import assert from 'node:assert/strict';
import {
  accountReady,
  authoredText,
  markLesson,
  profiles,
  renderedMath,
  runCase,
  textIncludes,
  visible,
} from './browser.mjs';

export async function discovery(suite) {
  const { map, pathDetails, chapterCheckpoints } = suite.data;
  for (const profile of suite.profiles) {
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
          'feature:chapter-disclosures',
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
            const name =
              path === '/'
                ? 'Learn'
                : path === '/course'
                  ? 'MH3210'
                  : path[1].toUpperCase() + path.slice(2);
            assert.equal(
              await page
                .locator('.primary-nav [aria-current="page"]')
                .innerText(),
              name,
            );
            assert((await page.locator('#main-content h1').innerText()).trim());
            if (path === '/')
              assert((await renderedMath(page.locator('main'))).length > 0);
          });
        }
        await go('/explore');
        await step(
          'Persist expanded and collapsed sidebar chapters across reload',
          async () => {
            const chapters = [
              ...new Set(suite.data.lessons.map((lesson) => lesson.cluster)),
            ];
            const sidebar = page.locator('#lesson-sidebar');
            const headings = sidebar.locator('.chapter-heading button');
            for (const expanded of [true, false]) {
              if (profile !== 'desktop')
                await page
                  .getByRole('button', { name: 'Open lessons', exact: true })
                  .click();
              assert.deepEqual(
                await headings
                  .locator(':scope > span:first-child')
                  .allTextContents(),
                chapters,
              );
              for (let index = 0; index < chapters.length; index++) {
                const button = headings.nth(index);
                if (
                  (await button.getAttribute('aria-expanded')) !==
                  String(expanded)
                )
                  await button.click();
                assert.equal(
                  await button.getAttribute('aria-expanded'),
                  String(expanded),
                );
                const panel = sidebar.locator(
                  `#${await button.getAttribute('aria-controls')}`,
                );
                if (expanded) {
                  await visible(panel);
                  assert.deepEqual(
                    await panel
                      .locator('a > span:first-child')
                      .allTextContents(),
                    suite.data.lessons
                      .filter((lesson) => lesson.cluster === chapters[index])
                      .map((lesson) => lesson.id),
                  );
                } else assert(await panel.isHidden());
              }
              await page.reload({ waitUntil: 'load' });
              if (profile !== 'desktop')
                await page
                  .getByRole('button', { name: 'Open lessons', exact: true })
                  .click();
              for (let index = 0; index < chapters.length; index++) {
                const button = headings.nth(index);
                assert.equal(
                  await button.getAttribute('aria-expanded'),
                  String(expanded),
                );
                const panel = sidebar.locator(
                  `#${await button.getAttribute('aria-controls')}`,
                );
                assert.equal(await panel.isVisible(), expanded);
              }
              if (profile !== 'desktop') await page.keyboard.press('Escape');
            }
          },
        );
        await step(
          'Search atlas for Euclid, then an absent phrase',
          async () => {
            const search = page.locator('#atlas-filter');
            await search.fill('Euclid');
            await visible(
              page
                .locator('.chapter-grid .atlas-card')
                .filter({ hasText: 'D04' }),
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
        for (const [path, emptyMessage] of [
          [
            '/practice',
            'No problems in this selection. Clear the search or choose another chapter.',
          ],
          [
            '/studio',
            'No experiments in this selection. Clear the search or choose another chapter.',
          ],
          [
            '/reference',
            'No claims in this selection. Clear the search or choose another chapter.',
          ],
        ]) {
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
            const emptyState = page
              .getByRole('status')
              .filter({ hasText: emptyMessage });
            await authoredText(emptyState, emptyMessage);
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
            const chapter = suite.data.lessons[0].cluster;
            const expected = suite.data.lessons
              .filter(
                (lesson) =>
                  lesson.cluster === chapter &&
                  (path !== '/studio' || lesson.lab),
              )
              .map((lesson) => lesson.id);
            const selector =
              path === '/practice'
                ? '.practice-item-head > span'
                : path === '/studio'
                  ? '.studio-card > span'
                  : '.reference-list article > span';
            await page.waitForFunction(
              ({ selector, expected }) =>
                JSON.stringify(
                  [...document.querySelectorAll(selector)].map(
                    (element) => element.textContent.trim().split(' · ')[0],
                  ),
                ) === JSON.stringify(expected),
              { selector, expected },
            );
            assert.deepEqual(
              (await page.locator(selector).allTextContents()).map(
                (text) => text.trim().split(' · ')[0],
              ),
              expected,
            );
            if (!expected.length) await authoredText(emptyState, emptyMessage);
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
        const completed = new Set();
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
              await accountReady(page);
              assert.equal(
                await page
                  .locator('.path-selector')
                  .getByRole('button', { name: path.title, exact: true })
                  .getAttribute('aria-pressed'),
                'true',
              );
              await page.locator('.continue-panel button').click();
              const pending = map.paths[id].find(
                (lessonId) => !completed.has(lessonId),
              );
              await visible(page.locator(`[data-lesson-id="${pending}"]`));
              await markLesson(page, pending, 'Mark understood', 'complete');
              completed.add(pending);
              await go('/');
              await page.locator('.continue-panel button').click();
              const next = map.paths[id].find(
                (lessonId) => !completed.has(lessonId),
              );
              await visible(page.locator(`[data-lesson-id="${next}"]`));
              await go('/explore');
              const ids = await page
                .locator('.chapter-grid .atlas-card > span')
                .allTextContents();
              assert.deepEqual(
                ids.map((text) => text.match(/^([A-Z]\d{2}) ·/)[1]).sort(),
                [...map.paths[id]].sort(),
                'Explore membership differs from the selected source path',
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
              assert.equal(await check.locator(':scope > p').count(), 2);
              await authoredText(
                check.locator(':scope > p').nth(0),
                checkpoint.prompt,
              );
              await authoredText(
                check.locator(':scope > p').nth(1),
                checkpoint.answer,
              );
              for (const id of checkpoint.links) {
                await check
                  .getByRole('button', { name: new RegExp(`^${id} `) })
                  .click();
                await visible(page.locator(`[data-lesson-id="${id}"]`));
                await go('/explore');
              }
            },
          );
        }
      },
      { account: 'path-learner' },
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
            for (const [factor, gcd, fibers] of [
              ['4', '4', ['0,3,6,9', '1,4,7,10', '2,5,8,11']],
              ['5', '1', ['0', '1', '2']],
            ]) {
              await preview
                .getByRole('button', {
                  name: `Multiply by ${factor}`,
                  exact: true,
                })
                .click();
              await authoredText(
                preview.locator(':scope > p'),
                `\\(\\gcd(${factor},12)=${gcd}\\): each visible output has \\(${gcd}\\) input${gcd === '1' ? '' : 's'}.`,
              );
              const rows = preview.locator('.home-fiber-rows > div');
              assert.equal(await rows.count(), 3);
              for (let index = 0; index < fibers.length; index++)
                await authoredText(
                  rows.nth(index),
                  `\\(\\{${fibers[index]}\\}\\mapsto ${index * Number(factor)}\\)`,
                );
            }
            await preview
              .getByRole('button', { name: 'Investigate every fiber' })
              .click();
            await visible(page.locator('[data-lesson-id="C02"] #lab'));
          },
        );
        for (const [answers, expected] of [
          [[false, false, false], 'P00'],
          [[true, false, false], 'C02'],
          [[true, true, false], 'N04'],
          [[true, true, true], 'N05'],
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
                  name: answers[0]
                    ? 'A valid universal argument'
                    : 'More examples',
                  exact: true,
                })
                .check();
              await diagnostic
                .getByRole('radio', {
                  name: answers[1]
                    ? 'When the gcd of c and n equals one'
                    : 'Whenever c is not zero',
                  exact: true,
                })
                .check();
              await diagnostic
                .getByRole('radio', {
                  name: answers[2]
                    ? 'The norm of alpha times beta equals the norm of alpha times the norm of beta'
                    : 'The norm of alpha times beta equals the norm of alpha plus the norm of beta',
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
              const lesson = map.lessons.find(
                (lesson) => lesson.id === expected,
              );
              await textIncludes(
                diagnostic.locator('[role="status"]'),
                lesson.title,
              );
              await diagnostic
                .getByRole('button', { name: 'Open this lesson' })
                .click();
              await visible(page.locator(`[data-lesson-id="${expected}"]`));
              assert.equal(new URL(page.url()).pathname, lesson.route);
            },
          );
        }
      },
    );
  }
}
