import assert from 'node:assert/strict';
import { accountJourneys } from './account-journeys.mjs';
import { accountLifecycle } from './account-lifecycle.mjs';
import {
  acknowledged,
  focused,
  markLesson,
  runCase,
  textIncludes,
  visible,
} from './browser.mjs';

export async function practice(suite) {
  for (const profile of suite.profiles) {
    await runCase(
      suite,
      profile,
      'practice-transfer-reset',
      [
        'feature:practice-review-queue',
        'feature:progress-text-backup-restore',
        'feature:progress-export-copy-backup',
        'feature:progress-import-roundtrip',
        'feature:progress-reset-reload',
        'feature:progress-invalid-atomic',
        'journey:progress-transfer-reset',
        'journey:returning-learner-review-queue',
      ],
      async ({ page, go, step, data }) => {
        const [first, second] = data.map.lessons;
        await go(first.route);
        await step(
          'Mark a lesson for review and open its worksheet from the queue',
          async () => {
            await markLesson(page, first.id, 'Review later', 'review');
            await go('/practice');
            await page
              .getByRole('button', { name: 'Review later (1)', exact: true })
              .click();
            assert.equal(await page.locator('.practice-item').count(), 1);
            await page.locator('.practice-workspace summary').click();
            const worksheet = page.locator(`#practice-${first.id}`);
            await worksheet
              .getByRole('button', { name: 'Check the claim', exact: true })
              .click();
            await worksheet
              .getByRole('button', {
                name: 'Show justified answer',
                exact: true,
              })
              .click();
            await visible(worksheet.locator('.answer'));
          },
        );
        await step(
          'Save and clear embedded worksheet marks with queue updates',
          async () => {
            const worksheet = page.locator(`#practice-${first.id}`);
            const document = await acknowledged(page, 'PATCH', () =>
              worksheet
                .getByRole('button', { name: 'Mark understood', exact: true })
                .click(),
            );
            assert.equal(document.lessons[first.id], 'complete');
            assert.equal(await page.locator('.practice-item').count(), 0);
            await page
              .getByRole('button', { name: 'All problems', exact: true })
              .click();
            await page
              .locator('.practice-item')
              .filter({ has: worksheet })
              .locator('summary')
              .click();
            await markLesson(page, first.id, 'Clear mark', null, worksheet);
            assert.equal(
              await worksheet
                .getByRole('button', { name: 'Mark understood', exact: true })
                .getAttribute('aria-pressed'),
              'false',
            );
            await markLesson(
              page,
              first.id,
              'Review later',
              'review',
              worksheet,
            );
            await page
              .getByRole('button', { name: 'Review later (1)', exact: true })
              .click();
            assert.equal(await page.locator('.practice-item').count(), 1);
          },
        );
        const controls = page.locator('.progress-management');
        const message = controls.locator(':scope > p[role="status"]');
        let backup;
        await step('Copy and inspect transferable schema1 backup', async () => {
          await controls
            .getByRole('button', { name: 'Copy JSON backup', exact: true })
            .click();
          backup = await controls
            .getByRole('textbox', { name: 'Progress backup', exact: true })
            .inputValue();
          assert.deepEqual(JSON.parse(backup), {
            schemaVersion: 1,
            lessons: { [first.id]: 'review' },
          });
          await textIncludes(message, 'JSON backup copied.');
          assert.equal(
            await page.evaluate(() => navigator.clipboard.readText()),
            backup,
            'Clipboard bytes differ from the displayed backup',
          );
        });
        const snapshot = async () =>
          JSON.parse(
            await controls
              .getByRole('textbox', { name: 'Progress backup', exact: true })
              .inputValue(),
          );
        await step(
          'Cancel reset through Escape and its button, then confirm reset and reload',
          async () => {
            const clear = controls.getByRole('button', {
              name: 'Clear marks',
              exact: true,
            });
            await clear.click();
            await focused(
              controls.getByRole('button', { name: 'Cancel', exact: true }),
            );
            await page.keyboard.press('Escape');
            await focused(clear);
            assert.deepEqual((await snapshot()).lessons, {
              [first.id]: 'review',
            });
            await clear.click();
            await controls
              .getByRole('button', { name: 'Cancel', exact: true })
              .click();
            await focused(clear);
            assert.deepEqual((await snapshot()).lessons, {
              [first.id]: 'review',
            });
            await clear.click();
            await acknowledged(page, 'PUT', () =>
              controls
                .getByRole('button', { name: 'Clear all marks', exact: true })
                .click(),
            );
            await textIncludes(message, 'All account marks cleared.');
            assert.deepEqual((await snapshot()).lessons, {});
            await page.reload({ waitUntil: 'load' });
            await controls
              .getByRole('button', { name: 'Show backup text', exact: true })
              .click();
            assert.deepEqual((await snapshot()).lessons, {});
          },
        );
        await step(
          'Restore from text, replace from a JSON file, and reload exact marks',
          async () => {
            await controls
              .getByRole('textbox', {
                name: 'Restore from backup text',
                exact: true,
              })
              .fill(backup);
            await acknowledged(page, 'PUT', () =>
              controls
                .getByRole('button', {
                  name: 'Restore backup text',
                  exact: true,
                })
                .click(),
            );
            await textIncludes(message, 'Progress restored to your account.');
            assert.deepEqual(await snapshot(), JSON.parse(backup));
            const replacement = {
              schemaVersion: 1,
              lessons: { [second.id]: 'complete' },
            };
            await acknowledged(page, 'PUT', () =>
              controls
                .getByLabel('Import marks', { exact: true })
                .setInputFiles({
                  name: 'marks.json',
                  mimeType: 'application/json',
                  buffer: Buffer.from(JSON.stringify(replacement)),
                }),
            );
            await textIncludes(message, 'Progress restored to your account.');
            assert.deepEqual(await snapshot(), replacement);
            await page.reload({ waitUntil: 'load' });
            await controls
              .getByRole('button', { name: 'Show backup text', exact: true })
              .click();
            assert.deepEqual(await snapshot(), replacement);
          },
        );
        await step(
          'Reject invalid text and file imports atomically',
          async () => {
            const before = await snapshot();
            for (const input of [
              '{broken',
              JSON.stringify({ schemaVersion: 2, lessons: {} }),
              JSON.stringify({
                schemaVersion: 1,
                lessons: { [first.id]: 'review', Z99: 'complete' },
              }),
              JSON.stringify({
                schemaVersion: 1,
                lessons: { [first.id]: 'maybe' },
              }),
            ]) {
              await controls
                .getByRole('textbox', {
                  name: 'Restore from backup text',
                  exact: true,
                })
                .fill(input);
              await controls
                .getByRole('button', {
                  name: 'Restore backup text',
                  exact: true,
                })
                .click();
              assert.deepEqual(
                await snapshot(),
                before,
                'Rejected text changed progress',
              );
            }
            const beforeFile = await message.innerText();
            await controls
              .getByLabel('Import marks', { exact: true })
              .setInputFiles({
                name: 'invalid.json',
                mimeType: 'application/json',
                buffer: Buffer.from('{broken'),
              });
            await page.waitForFunction(
              (message) =>
                document.querySelector(
                  '.progress-management > p[role="status"]',
                )?.textContent !== message,
              beforeFile,
            );
            assert(
              !(await message.innerText()).includes('Progress restored'),
              'Invalid file was reported as restored',
            );
            assert.deepEqual(
              await snapshot(),
              before,
              'Rejected file changed progress',
            );
            await page.reload({ waitUntil: 'load' });
            await controls
              .getByRole('button', { name: 'Show backup text', exact: true })
              .click();
            assert.deepEqual(
              await snapshot(),
              before,
              'Rejected import changed persisted progress',
            );
          },
        );
      },
      {
        account: 'learner',
        permissions: ['clipboard-read', 'clipboard-write'],
      },
    );
  }
  await accountJourneys(suite);
  await accountLifecycle(suite);
}
