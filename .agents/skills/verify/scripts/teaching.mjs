import assert from 'node:assert/strict';
import {
  authoredText,
  markLesson,
  profiles,
  renderedMath,
  runCase,
  visible,
} from './browser.mjs';

async function lessonStructure(page, lesson) {
  const body = page.locator(`[data-lesson-id="${lesson.id}"]`);
  assert.equal(await body.locator('#lesson-heading').innerText(), lesson.title);
  for (const anchor of lesson.readingAnchors) {
    await visible(body.locator(`#${anchor}`));
    assert.equal(await body.locator(`#${anchor}`).count(), 1);
  }
  await visible(
    body.getByRole('heading', { name: 'Sources and status', exact: true }),
  );
  assert.equal(
    await body.locator('.proof-steps > li').count(),
    lesson.proofStepCount,
  );
  assert((await renderedMath(body)).length > 0, 'Visible mathematics missing');
  assert(
    (await body.locator('.katex:visible math').count()) > 0,
    'MathML missing',
  );
  return body;
}

export async function teaching(suite) {
  for (const profile of suite.profiles) {
    const size = `${profiles[profile].width}x${profiles[profile].height}`;
    for (const lesson of suite.data.map.lessons) {
      if (
        suite.teachingCaseIds &&
        !suite.teachingCaseIds.has(`teaching-${lesson.id}`)
      )
        continue;
      await runCase(
        suite,
        profile,
        `teaching-${lesson.id}`,
        [
          `route:${lesson.id}`,
          'feature:account-mark-complete-review-clear',
          `lesson-layout:${lesson.id}:${size}`,
          ...(lesson.figure ? [`figure:${lesson.id}`] : []),
          ...[
            'claim-recall',
            'hints-answer',
            'marks',
            'reasoning-wrong-correct',
            'proof-notes',
          ].map((name) => `practice:${lesson.id}:${name}`),
        ],
        async ({ page, go, step, data }) => {
          await go(lesson.route);
          await step(
            'Read complete lesson and unfold every proof annotation',
            async () => {
              const body = await lessonStructure(page, lesson);
              for (const note of await body.locator('.proof-note').all()) {
                await note.locator('summary').click();
                assert.equal(await note.getAttribute('open'), '');
                await visible(note.locator('p'));
              }
              if (lesson.figure) {
                assert(
                  (await body.locator('figure, .concept-figure').count()) > 0,
                  'Original figure missing',
                );
                assert(
                  (await body.locator('.concept-figure table').count()) > 0,
                  'Figure text alternative missing',
                );
              }
            },
          );
          await step(
            'Choose a wrong explanation, then the justified explanation',
            async () => {
              const choices = data.teaching[lesson.id].check.choices;
              const check = page.locator('.reasoning-check');
              const wrong = choices.find((choice) => !choice.correct);
              const right = choices.find((choice) => choice.correct);
              await check
                .getByRole('button', {
                  name: wrong.label ?? wrong.text,
                  exact: true,
                })
                .click();
              await visible(check.locator('.check-retry'));
              await check
                .getByRole('button', {
                  name: right.label ?? right.text,
                  exact: true,
                })
                .click();
              await visible(check.locator('.check-correct'));
            },
          );
          await step(
            'Recall claim, reveal each hint and justified answer, persist and clear marks',
            async () => {
              const practice = page.locator('#practice');
              await practice
                .getByRole('button', { name: 'Check the claim', exact: true })
                .click();
              assert.equal(
                await practice
                  .getByRole('button', { name: 'Hide claim', exact: true })
                  .getAttribute('aria-expanded'),
                'true',
              );
              const recalled = practice.locator('.retrieval-prompt > p').last();
              await visible(recalled);
              const statement = await page
                .locator('#theorem .theorem > p')
                .textContent();
              assert(
                statement.trim(),
                'The visible theorem must contain its statement',
              );
              assert.equal(await recalled.textContent(), statement);
              await practice
                .getByRole('button', { name: 'Hide claim', exact: true })
                .click();
              assert.equal(
                await practice.locator('.retrieval-prompt > p').count(),
                1,
              );
              const authored = data.lessons.find(
                (item) => item.id === lesson.id,
              );
              for (
                let index = 0;
                index < authored.practice.hints.length;
                index++
              ) {
                await practice
                  .getByRole('button', {
                    name: `Show hint ${index + 1}`,
                    exact: true,
                  })
                  .click();
                assert.equal(
                  await practice.locator('.hint').count(),
                  index + 1,
                );
                await authoredText(
                  practice.locator('.hint').nth(index),
                  `Hint ${index + 1}. ${authored.practice.hints[index]}`,
                );
              }
              await practice
                .getByRole('button', {
                  name: 'Show justified answer',
                  exact: true,
                })
                .click();
              await authoredText(
                practice.locator('.answer'),
                `Answer. ${authored.practice.answer}`,
              );
              await markLesson(
                page,
                lesson.id,
                'Mark understood',
                'complete',
                practice,
              );
              assert.equal(
                await practice
                  .getByRole('button', { name: 'Mark understood', exact: true })
                  .getAttribute('aria-pressed'),
                'true',
              );
              await page.reload({ waitUntil: 'load' });
              await visible(
                practice
                  .getByRole('button', { name: 'Mark understood', exact: true })
                  .and(page.locator('[aria-pressed="true"]')),
              );
              assert.equal(
                await practice
                  .getByRole('button', { name: 'Mark understood', exact: true })
                  .getAttribute('aria-pressed'),
                'true',
              );
              await markLesson(
                page,
                lesson.id,
                'Review later',
                'review',
                practice,
              );
              assert.equal(
                await practice
                  .getByRole('button', { name: 'Review later', exact: true })
                  .getAttribute('aria-pressed'),
                'true',
              );
              await markLesson(page, lesson.id, 'Clear mark', null, practice);
              assert.equal(
                await practice
                  .getByRole('button', { name: 'Review later', exact: true })
                  .getAttribute('aria-pressed'),
                'false',
              );
            },
          );
          await go(lesson.legacyRoute);
          await step(
            'Resolve legacy entry to the same lesson structure',
            async () => {
              await lessonStructure(page, lesson);
            },
          );
        },
        { account: 'learner' },
      );
    }
    if (
      suite.teachingCaseIds &&
      !suite.teachingCaseIds.has('teaching-special-experiences')
    )
      continue;
    await runCase(
      suite,
      profile,
      'teaching-special-experiences',
      [
        'feature:p00-proof-repair',
        'feature:q04-proof-check',
        'feature:r07-unit-classification',
        'feature:c02-reasoning-ladder',
        'feature:lesson-prerequisite-next-links',
      ],
      async ({ page, go, step, data }) => {
        for (const id of ['P00', 'Q04', 'R07']) {
          await go(data.map.lessons.find((lesson) => lesson.id === id).route);
          await step(
            `Repair ${id} reasoning and reveal its explanation`,
            async () => {
              const content = data.experiences[id];
              const check = page.locator('.proof-repair');
              for (const correct of [false, true]) {
                const choice = content.choices.find(
                  (item) => (item.id === content.correct) === correct,
                );
                await check
                  .getByRole('button', {
                    name: choice.spokenLabel ?? choice.label,
                    exact: true,
                  })
                  .click();
                assert.equal(
                  await check.locator('[role="status"]').innerText(),
                  correct ? content.correctFeedback : content.wrongFeedback,
                );
              }
              await check
                .getByRole('button', { name: content.revealLabel, exact: true })
                .click();
              assert.equal(
                await check
                  .getByRole('button', { name: 'Hide reasoning', exact: true })
                  .getAttribute('aria-expanded'),
                'true',
              );
            },
          );
        }
        await go(data.map.lessons.find((lesson) => lesson.id === 'C02').route);
        await step('Complete every cancellation practice stage', async () => {
          const ladder = page.locator('#practice-ladder');
          for (
            let index = 0;
            index < data.experiences.C02.stages.length;
            index++
          ) {
            assert(
              (await ladder.innerText()).includes(`Stage ${index + 1} of`),
            );
            await ladder
              .getByLabel('Work it out before revealing the reasoning', {
                exact: true,
              })
              .fill('A draft about the exact cancellation conditions.');
            await ladder
              .getByRole('button', { name: 'Show a hint', exact: true })
              .click();
            await visible(ladder.locator('.hint'));
            await ladder
              .getByRole('button', { name: 'Compare reasoning', exact: true })
              .click();
            await visible(ladder.locator('.practice-reveal'));
            if (index + 1 < data.experiences.C02.stages.length)
              await ladder
                .getByRole('button', { name: 'Next challenge' })
                .click();
          }
        });
        await step('Follow a prerequisite, then continue reading', async () => {
          const lesson = data.map.lessons.find((item) => item.id === 'C02');
          await page
            .locator('.lesson-preparation')
            .getByRole('button', {
              name: new RegExp(`^${lesson.prerequisites[0]} `),
            })
            .click();
          await visible(
            page.locator(`[data-lesson-id="${lesson.prerequisites[0]}"]`),
          );
          const index = data.lessons.findIndex(
            (item) => item.id === lesson.prerequisites[0],
          );
          const next = data.lessons[index + 1];
          await page.locator('.next-lesson').click();
          await visible(page.locator(`[data-lesson-id="${next.id}"]`));
          assert.equal(
            new URL(page.url()).pathname,
            data.map.lessons.find((item) => item.id === next.id).route,
          );
        });
        await step(
          'Follow a selected path backwards, forwards, and to its end',
          async () => {
            const [id, path] = Object.entries(data.pathDetails).find(
              ([id]) => id === 'computational',
            );
            const sequence = data.map.paths[id];
            const route = (lessonId) =>
              data.map.lessons.find((item) => item.id === lessonId).route;
            await go('/');
            await page
              .locator('.path-selector')
              .getByRole('button', { name: path.title, exact: true })
              .click();
            await go(route(sequence[1]));
            await page.locator('.previous-lesson').click();
            await visible(page.locator(`[data-lesson-id="${sequence[0]}"]`));
            assert.equal(await page.locator('.previous-lesson').count(), 0);
            await page.locator('.next-lesson').click();
            await visible(page.locator(`[data-lesson-id="${sequence[1]}"]`));
            await go(route(sequence.at(-1)));
            await visible(page.locator('.path-finish'));
            assert.equal(await page.locator('.next-lesson').count(), 0);
            await page.locator('.previous-lesson').click();
            await visible(
              page.locator(`[data-lesson-id="${sequence.at(-2)}"]`),
            );
          },
        );
      },
    );
  }
}
