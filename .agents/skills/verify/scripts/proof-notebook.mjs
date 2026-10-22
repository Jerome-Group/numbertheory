import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  authoredText,
  checkPage,
  focused,
  runCase,
  textIncludes,
  visible,
} from './browser.mjs';

const cueNames = [
  'Conditions to keep in view',
  'Definitions',
  'Source strategy',
  'Source paragraph cues',
];

async function notebookPanels(page, id) {
  const notebook = page.locator('#proof-notebook');
  await textIncludes(notebook.locator('.notebook-claim .callout-label'), id);
  assert.equal(await notebook.count(), 1, 'Expected exactly one notebook');
  for (const panel of [
    '.notebook-cues',
    '.notebook-workspace',
    '.notebook-claim',
  ])
    assert.equal(
      await notebook.locator(panel).count(),
      1,
      `Expected exactly one ${panel} for ${id}`,
    );
  assert.deepEqual(
    await notebook
      .locator('.notebook-cues > details > summary')
      .allTextContents(),
    cueNames,
    `Expected one of each source cue control for ${id}`,
  );
}

async function closedNotebookControls(notebook) {
  for (const selector of [
    'details[open]',
    '.notebook-export',
    '.notebook-reset',
    '.notebook-workspace [role="status"]',
  ])
    assert.equal(
      await notebook.locator(selector).count(),
      0,
      `Lesson selection retained ${selector}`,
    );
  for (const name of ['Show Markdown export', 'Reset this lesson notebook'])
    assert.equal(
      await notebook
        .getByRole('button', { name, exact: true })
        .getAttribute('aria-expanded'),
      'false',
    );
}

async function selectLesson(page, id) {
  await page.getByLabel('Lesson to prove', { exact: true }).selectOption(id);
  await notebookPanels(page, id);
  await closedNotebookControls(page.locator('#proof-notebook'));
  assert.equal(new URL(page.url()).searchParams.get('proof'), id);
}

async function sourceProof(reference, lesson, teaching) {
  const paragraphs = reference.locator(':scope > ol > li');
  assert.equal(await paragraphs.count(), lesson.proof.length);
  for (let index = 0; index < lesson.proof.length; index++) {
    const paragraph = paragraphs.nth(index);
    await authoredText(
      paragraph.locator('h5'),
      teaching.proofSteps[index].label,
    );
    await authoredText(
      paragraph.locator('.notebook-proof-paragraph'),
      lesson.proof[index],
    );
    await paragraph.locator('summary').click();
    await authoredText(
      paragraph.locator('.proof-note p'),
      teaching.proofSteps[index].reason,
    );
  }
  await authoredText(reference.locator('.notebook-boundary p'), lesson.caution);
  await authoredText(
    reference.locator('.notebook-source-note'),
    lesson.sourceNote,
  );
}

export async function proofNotebook(suite) {
  const attemptId = 'proof-notebook-attempt-compare-revise';
  for (const profile of suite.profiles) {
    await runCase(
      suite,
      profile,
      attemptId,
      [
        'feature:proof-notebook-session',
        'feature:proof-notebook-source-recovery',
        'feature:proof-notebook-export-reset',
        'journey:proof-notebook-attempt-compare-revise',
      ],
      async ({ page, go, step, data }) => {
        const [first, second] = data.map.lessons;
        const notebook = page.locator('#proof-notebook');
        const draft = notebook.getByLabel('Your whole argument', {
          exact: true,
        });
        const original = [
          `First argument for ${first.id}.`,
          '<strong>This is learner text, not HTML.</strong>',
          '\\(n \\ge 0\\)',
          'A deliberately long word follows.',
          'justification'.repeat(50),
          ...Array.from(
            { length: 8 },
            (_, index) =>
              `Reason ${index + 1}. Explain this implication in full.`,
          ),
          '',
        ].join('\n');
        const reflection =
          'Keep the construction. Justify the missing implication.\n';
        const revised = `${original}\nThe missing implication now has a justification.\n`;
        const writes = [];
        page.on('request', (request) => {
          if (
            new URL(request.url()).pathname === '/api/progress' &&
            request.method() !== 'GET'
          )
            writes.push(request.method());
        });
        await go('/');
        await step(
          'Open the home notebook and read the tab lifetime before writing',
          async () => {
            await page
              .getByRole('button', { name: 'Open proof notebook', exact: true })
              .click();
            await selectLesson(page, first.id);
            await textIncludes(
              notebook.locator('.notebook-lifetime'),
              'Reloading or closing this tab clears every attempt.',
            );
            await focused(
              notebook.getByRole('heading', {
                name: 'Build the argument',
                exact: true,
              }),
            );
            assert.equal(
              await notebook
                .locator('.notebook-writing-source .notebook-source-proof')
                .isVisible(),
              false,
            );
            assert.equal(
              await notebook
                .getByLabel('Lesson to prove', { exact: true })
                .locator('option')
                .count(),
              data.lessons.length,
            );
            const picker = notebook.getByLabel('Lesson to prove', {
              exact: true,
            });
            await picker.focus();
            await picker.selectOption(second.id);
            await notebookPanels(page, second.id);
            await closedNotebookControls(notebook);
            await focused(picker);
            await picker.selectOption(first.id);
            await notebookPanels(page, first.id);
            await closedNotebookControls(notebook);
            await focused(picker);
          },
        );
        await step(
          'Compare an empty page, then retain it while starting a new argument',
          async () => {
            await notebook
              .getByRole('button', { name: 'Compare with source', exact: true })
              .click();
            await focused(notebook.locator('.notebook-review > h3'));
            assert.equal(
              await notebook.locator('.notebook-capture pre').textContent(),
              '[No text captured]',
            );
            await notebook
              .getByRole('button', { name: 'New blank attempt', exact: true })
              .click();
            await focused(draft);
            assert.equal(await draft.inputValue(), '');
            await textIncludes(
              notebook.locator('.notebook-history summary'),
              '(1)',
            );
          },
        );
        await step(
          'Read optional cues and the complete source while writing',
          async () => {
            const authored = data.lessons.find(
              (lesson) => lesson.id === first.id,
            );
            await authoredText(
              notebook.locator('.notebook-claim > p'),
              authored.theorem,
            );
            for (const [name, expected] of [
              [
                'Conditions to keep in view',
                data.teaching[first.id].hypotheses,
              ],
              ['Definitions', authored.definition],
              ['Source strategy', [data.teaching[first.id].strategy]],
              [
                'Source paragraph cues',
                data.teaching[first.id].proofSteps.map(
                  (paragraph) => paragraph.label,
                ),
              ],
            ]) {
              const cue = notebook
                .locator('.notebook-cues details')
                .filter({ has: page.getByText(name, { exact: true }) });
              await cue.locator('summary').click();
              const items = cue.locator(
                name === 'Source paragraph cues' ||
                  name === 'Conditions to keep in view'
                  ? 'li'
                  : 'p',
              );
              assert.equal(await items.count(), expected.length);
              for (let index = 0; index < expected.length; index++)
                await authoredText(items.nth(index), expected[index]);
            }
            await notebook
              .locator('.notebook-writing-source > summary')
              .click();
            await sourceProof(
              notebook.locator(
                '.notebook-writing-source .notebook-source-proof',
              ),
              authored,
              data.teaching[first.id],
            );
            await notebook
              .locator('.notebook-writing-source > summary')
              .click();
          },
        );
        await step(
          'Capture exact long learner text and reflect without changing it',
          async () => {
            await draft.fill(original);
            await checkPage(page);
            await notebook
              .getByRole('button', { name: 'Compare with source', exact: true })
              .click();
            await focused(notebook.locator('.notebook-review > h3'));
            assert.equal(
              await notebook.locator('.notebook-capture pre').textContent(),
              original,
            );
            assert.equal(
              await notebook.locator('.notebook-capture pre strong').count(),
              0,
            );
            assert.equal(
              await notebook
                .getByRole('button', {
                  name: 'Compare with source',
                  exact: true,
                })
                .count(),
              0,
            );
            await notebook
              .getByLabel('What will you keep or change?', { exact: true })
              .fill(reflection);
            assert.equal(
              await notebook.locator('.notebook-capture pre').textContent(),
              original,
            );
            await checkPage(page);
          },
        );
        await step(
          'Select Markdown and require identical downloaded UTF-8 bytes',
          async () => {
            await notebook
              .getByRole('button', {
                name: 'Show Markdown export',
                exact: true,
              })
              .click();
            const exported = notebook.getByLabel('Notebook Markdown', {
              exact: true,
            });
            const markdown = await exported.inputValue();
            for (const exact of [
              original,
              reflection,
              first.route,
              data.lessons[0].sourceNote,
              ...data.lessons[0].proof,
            ])
              assert(
                markdown.includes(exact),
                'Export dropped exact learner text or source provenance',
              );
            await notebook
              .getByRole('button', { name: 'Select all Markdown', exact: true })
              .click();
            await focused(exported);
            assert.deepEqual(
              await exported.evaluate((element) => [
                element.selectionStart,
                element.selectionEnd,
              ]),
              [0, markdown.length],
            );
            const [download] = await Promise.all([
              page.waitForEvent('download'),
              notebook
                .getByRole('button', { name: 'Download Markdown', exact: true })
                .click(),
            ]);
            assert.equal(
              download.suggestedFilename(),
              `numbertheory-${first.id.toLowerCase()}-proof-notebook.md`,
            );
            const downloadPath = join(
              suite.output,
              `${profile}-${attemptId}`,
              download.suggestedFilename(),
            );
            await download.saveAs(downloadPath);
            assert.equal(await readFile(downloadPath, 'utf8'), markdown);
            assert.equal(await exported.inputValue(), markdown);
            return {
              downloadPath,
              utf8Bytes: Buffer.byteLength(markdown, 'utf8'),
            };
          },
        );
        await step(
          'Close transient controls on lesson switches while retaining each notebook',
          async () => {
            assert.equal(
              await notebook.locator('.notebook-cues details[open]').count(),
              cueNames.length,
            );
            await visible(notebook.locator('.notebook-export'));
            await textIncludes(
              notebook.locator('.notebook-workspace [role="status"]'),
              'Markdown prepared for download.',
            );
            await notebook
              .getByRole('button', {
                name: 'Reset this lesson notebook',
                exact: true,
              })
              .click();
            await visible(notebook.locator('.notebook-reset'));
            await selectLesson(page, second.id);
            assert.equal(await draft.inputValue(), '');
            await draft.fill('A separate lesson draft.');
            await selectLesson(page, first.id);
            assert.equal(
              await notebook.locator('.notebook-capture pre').textContent(),
              original,
            );
            assert.equal(
              await notebook
                .getByLabel('What will you keep or change?', { exact: true })
                .inputValue(),
              reflection,
            );
          },
        );
        await step(
          'Revise a copy and retain it through lesson and overview navigation',
          async () => {
            await notebook
              .getByRole('button', {
                name: 'Revise this argument',
                exact: true,
              })
              .click();
            await focused(draft);
            assert.equal(await draft.inputValue(), original);
            await draft.fill(revised);
            await notebook
              .getByRole('button', { name: 'Read this lesson', exact: true })
              .click();
            await visible(page.locator(`[data-lesson-id="${first.id}"]`));
            assert.equal(
              await page
                .locator('.notebook-invitation')
                .evaluate((element) =>
                  Boolean(
                    element.compareDocumentPosition(
                      document.getElementById('proof'),
                    ) & Node.DOCUMENT_POSITION_FOLLOWING,
                  ),
                ),
              true,
            );
            await page
              .getByRole('button', {
                name: 'Write your own proof',
                exact: true,
              })
              .click();
            assert.equal(await draft.inputValue(), revised);
            await page
              .getByRole('navigation', { name: 'Main navigation' })
              .getByRole('button', { name: 'Explore', exact: true })
              .click();
            await page
              .getByRole('navigation', { name: 'Main navigation' })
              .getByRole('button', { name: 'Practice', exact: true })
              .click();
            assert.equal(await draft.inputValue(), revised);
            await selectLesson(page, second.id);
            assert.equal(await draft.inputValue(), 'A separate lesson draft.');
            await selectLesson(page, first.id);
            assert.equal(await draft.inputValue(), revised);
            await notebook.locator('.notebook-history > summary').click();
            const previous = notebook
              .locator('.notebook-history article')
              .nth(1);
            assert.equal(
              await previous.locator('pre').first().textContent(),
              original,
            );
            assert.equal(
              await previous.locator('pre').last().textContent(),
              reflection,
            );
          },
        );
        await step(
          'Archive the revised capture and exercise reset cancellation, Escape and confirmation',
          async () => {
            await notebook
              .getByRole('button', { name: 'Compare with source', exact: true })
              .click();
            await notebook
              .getByRole('button', { name: 'New blank attempt', exact: true })
              .click();
            assert.equal(await draft.inputValue(), '');
            assert.equal(
              await notebook.locator('.notebook-history article').count(),
              3,
            );
            const reset = notebook.getByRole('button', {
              name: 'Reset this lesson notebook',
              exact: true,
            });
            await reset.click();
            await focused(
              notebook.getByRole('button', { name: 'Cancel', exact: true }),
            );
            await page.keyboard.press('Escape');
            await focused(reset);
            assert.equal(
              await notebook.locator('.notebook-history article').count(),
              3,
            );
            await reset.click();
            await notebook
              .getByRole('button', { name: 'Cancel', exact: true })
              .click();
            await focused(reset);
            assert.equal(
              await notebook.locator('.notebook-history article').count(),
              3,
            );
            await reset.click();
            await notebook
              .getByRole('button', {
                name: 'Clear this lesson notebook',
                exact: true,
              })
              .click();
            await focused(reset);
            assert.equal(
              await notebook.locator('.notebook-history').count(),
              0,
            );
            await selectLesson(page, second.id);
            assert.equal(await draft.inputValue(), 'A separate lesson draft.');
          },
        );
        await step(
          'Reload clears writing while a valid proof URL retains lesson selection',
          async () => {
            await page.reload({ waitUntil: 'load' });
            await notebookPanels(page, second.id);
            await closedNotebookControls(notebook);
            assert.equal(await draft.inputValue(), '');
            assert.equal(
              await notebook.locator('.notebook-history').count(),
              0,
            );
          },
        );
        await step(
          'Recover visibly from an unknown proof URL without account writes',
          async () => {
            await go('/practice?proof=Z99#proof-notebook');
            await textIncludes(
              notebook.locator('.notebook-recovery'),
              'Unknown proof lesson "Z99"',
            );
            await notebookPanels(page, first.id);
            await closedNotebookControls(notebook);
            await notebook
              .getByRole('button', {
                name: 'Open first lesson notebook',
                exact: true,
              })
              .click();
            await notebookPanels(page, first.id);
            await closedNotebookControls(notebook);
            assert.equal(
              new URL(page.url()).searchParams.get('proof'),
              first.id,
            );
            assert.equal(
              await notebook.locator('.notebook-recovery').count(),
              0,
            );
            await focused(
              notebook.getByLabel('Lesson to prove', { exact: true }),
            );
            assert.deepEqual(
              writes,
              [],
              'Notebook actions wrote account progress',
            );
          },
        );
      },
    );
    const lessonsById = new Map(
      suite.data.map.lessons.map((lesson) => [lesson.id, lesson]),
    );
    const sourceLessons = suite.practicePlans[profile].sourceLessonIds.map(
      (id) => lessonsById.get(id),
    );
    await runCase(
      suite,
      profile,
      'proof-notebook-source-inventory',
      sourceLessons.map((lesson) => `proof-notebook-source:${lesson.id}`),
      async ({ page, go, step, data }) => {
        await go(sourceLessons[0].notebookRoute);
        await notebookPanels(page, sourceLessons[0].id);
        await closedNotebookControls(page.locator('#proof-notebook'));
        for (const mapped of sourceLessons) {
          await step(
            `Read exact notebook source for ${mapped.id}`,
            async () => {
              await selectLesson(page, mapped.id);
              const notebook = page.locator('#proof-notebook');
              const authored = data.lessons.find(
                (lesson) => lesson.id === mapped.id,
              );
              await authoredText(
                notebook.locator('.notebook-claim > p'),
                authored.theorem,
              );
              await notebook
                .locator('.notebook-writing-source > summary')
                .click();
              await sourceProof(
                notebook.locator(
                  '.notebook-writing-source .notebook-source-proof',
                ),
                authored,
                data.teaching[mapped.id],
              );
              await checkPage(page);
              return { lessonId: mapped.id };
            },
          );
        }
      },
    );
  }
}
