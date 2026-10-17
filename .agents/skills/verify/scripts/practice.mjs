import assert from 'node:assert/strict';
import {
  focused,
  profiles,
  runCase,
  textIncludes,
  visible,
} from './browser.mjs';

export async function practice(suite) {
  for (const profile of Object.keys(profiles)) {
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
            await page
              .locator('#practice')
              .getByRole('button', { name: 'Review later', exact: true })
              .click();
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
        const controls = page.locator('.progress-management');
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
          await textIncludes(controls.locator('[role="status"]'), 'backup');
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
            assert.deepEqual((await snapshot()).lessons, {
              [first.id]: 'review',
            });
            await clear.click();
            await controls
              .getByRole('button', { name: 'Clear all marks', exact: true })
              .click();
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
            await controls
              .getByRole('button', { name: 'Restore backup text', exact: true })
              .click();
            assert.deepEqual(await snapshot(), JSON.parse(backup));
            const replacement = {
              schemaVersion: 1,
              lessons: { [second.id]: 'complete' },
            };
            await controls
              .getByLabel('Import marks', { exact: true })
              .setInputFiles({
                name: 'marks.json',
                mimeType: 'application/json',
                buffer: Buffer.from(JSON.stringify(replacement)),
              });
            await textIncludes(
              controls.locator('[role="status"]'),
              'Progress restored from this file.',
            );
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
            const beforeFile = await controls
              .locator('[role="status"]')
              .innerText();
            await controls
              .getByLabel('Import marks', { exact: true })
              .setInputFiles({
                name: 'invalid.json',
                mimeType: 'application/json',
                buffer: Buffer.from('{broken'),
              });
            await page.waitForFunction(
              (message) =>
                document.querySelector('.progress-management [role="status"]')
                  ?.textContent !== message,
              beforeFile,
            );
            assert(
              !(await controls.locator('[role="status"]').innerText()).includes(
                'Progress restored',
              ),
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
    );
  }
}
