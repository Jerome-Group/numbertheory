import assert from 'node:assert/strict';
import {
  accountReady,
  acknowledged,
  focused,
  markLesson,
  runCase,
  textIncludes,
  visible,
} from './browser.mjs';

async function documentFor(session, origin) {
  const response = await session.context.request.get(`${origin}/api/progress`);
  assert.equal(response.status(), 200);
  assert.match(response.headers()['cache-control'], /no-store/);
  const document = await response.json();
  assert.equal(document.accountId, session.accountId);
  return document;
}

async function backup(page) {
  const controls = page.locator('.progress-management');
  const field = controls.getByRole('textbox', {
    name: 'Progress backup',
    exact: true,
  });
  if (!(await field.isVisible()))
    await controls
      .getByRole('button', { name: 'Show backup text', exact: true })
      .click();
  return JSON.parse(await field.inputValue());
}

export async function accountJourneys(suite) {
  for (const profile of suite.profiles) {
    await runCase(
      suite,
      profile,
      'practice-anonymous-account-boundary',
      ['feature:account-public-reading-sign-in'],
      async ({ page, context, go, step, data }) => {
        const [first] = data.map.lessons;
        await go(`${first.route}#practice`);
        await step(
          'Read anonymously, require disabled account marks and a top-level sign-in anchor',
          async () => {
            const signIn = page
              .getByRole('navigation', { name: 'Progress account' })
              .getByRole('link', { name: 'Sign in with ChatGPT', exact: true });
            await visible(signIn);
            assert.equal(await signIn.getAttribute('target'), '_top');
            const href = new URL(
              await signIn.getAttribute('href'),
              suite.origin,
            );
            assert.equal(href.pathname, '/signin-with-chatgpt');
            assert.equal(
              href.searchParams.get('return_to'),
              `${first.route}#practice`,
            );
            for (const name of ['Mark understood', 'Review later'])
              assert.equal(
                await page
                  .locator('#practice')
                  .getByRole('button', { name, exact: true })
                  .isEnabled(),
                false,
              );
            const response = await context.request.get(
              `${suite.origin}/api/progress`,
            );
            assert.equal(response.status(), 401);
            assert.equal((await response.json()).code, 'sign_in_required');
            await go('/practice');
            await visible(
              page.getByRole('heading', {
                name: 'Your account progress',
                exact: true,
              }),
            );
            assert.equal(
              await page
                .getByRole('button', { name: 'Clear marks', exact: true })
                .count(),
              0,
            );
            return {
              hostedAuthentication:
                'not-evaluated; local Wrangler has no Sites dispatcher',
            };
          },
        );
      },
    );

    await runCase(
      suite,
      profile,
      'practice-account-persistence-isolation',
      [
        'feature:account-progress-persistence-isolation',
        'feature:account-origin-identity-rejection',
        'journey:account-save-fresh-session',
      ],
      async (a) => {
        const [first, second] = a.data.map.lessons;
        await a.go(first.route);
        await a.step(
          'Acknowledge account A mark in the real lesson UI',
          async () => {
            await markLesson(a.page, first.id, 'Mark understood', 'complete');
          },
        );
        const b = await a.session({ label: 'account-b', account: 'B' });
        const freshA = await a.session({
          label: 'fresh-account-a',
          account: 'A',
        });
        await b.go(first.route);
        await b.step(
          'Use account B in a distinct browser context and retain its different mark',
          async () => {
            assert.equal(
              await b.page
                .getByRole('button', { name: 'Mark understood', exact: true })
                .getAttribute('aria-pressed'),
              'false',
            );
            await markLesson(b.page, first.id, 'Review later', 'review');
            const signOut = b.page
              .getByRole('navigation', { name: 'Progress account' })
              .getByRole('link', { name: 'Sign out', exact: true });
            assert.equal(await signOut.getAttribute('target'), '_top');
            assert.equal(
              new URL(await signOut.getAttribute('href'), suite.origin)
                .pathname,
              '/signout-with-chatgpt',
            );
          },
        );
        await freshA.go(first.route);
        await freshA.step(
          'Recover account A from D1 in a fresh browser context and prove tenant isolation',
          async () => {
            await visible(
              freshA.page
                .getByRole('button', { name: 'Mark understood', exact: true })
                .and(freshA.page.locator('[aria-pressed="true"]')),
            );
            const before = await documentFor(freshA, suite.origin);
            const other = await documentFor(b, suite.origin);
            assert.deepEqual(before.lessons, { [first.id]: 'complete' });
            assert.deepEqual(other.lessons, { [first.id]: 'review' });
            assert.notEqual(before.accountId, other.accountId);
            for (const [headers, status, code] of [
              [
                {
                  Origin: 'https://foreign.example.test',
                  'X-Numbertheory-Account': freshA.accountId,
                },
                403,
                'invalid_origin',
              ],
              [
                { Origin: suite.origin, 'X-Numbertheory-Account': b.accountId },
                409,
                'account_changed',
              ],
              [{ Origin: suite.origin }, 409, 'account_changed'],
            ]) {
              const response = await freshA.context.request.patch(
                `${suite.origin}/api/progress`,
                { headers, data: { lessonId: second.id, status: 'complete' } },
              );
              assert.equal(response.status(), status);
              assert.equal((await response.json()).code, code);
            }
            assert.deepEqual(
              await documentFor(freshA, suite.origin),
              before,
              'Rejected writes changed account A',
            );
            assert.deepEqual(
              await documentFor(b, suite.origin),
              other,
              'Rejected writes changed account B',
            );
            return {
              accountA: before,
              accountB: other,
              hostedAuthentication: 'not-evaluated',
            };
          },
        );
      },
      { account: 'A' },
    );

    await runCase(
      suite,
      profile,
      'practice-replacement-conflicts',
      [
        'feature:account-stale-bulk-conflict',
        'journey:account-conflict-recovery',
      ],
      async (a) => {
        const [first] = a.data.map.lessons;
        await a.go('/practice');
        const b = await a.session({
          label: 'same-account-writer',
          account: 'A',
        });
        await b.go(first.route);
        const controls = a.page.locator('.progress-management');
        a.expectProgressError(409);
        await a.step(
          'Reject a stale UI text restore after another browser context saves',
          async () => {
            await backup(a.page);
            await markLesson(b.page, first.id, 'Review later', 'review');
            await controls
              .getByRole('textbox', {
                name: 'Restore from backup text',
                exact: true,
              })
              .fill(JSON.stringify({ schemaVersion: 1, lessons: {} }));
            const [response] = await Promise.all([
              a.page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/progress' &&
                  response.request().method() === 'PUT',
              ),
              controls
                .getByRole('button', {
                  name: 'Restore backup text',
                  exact: true,
                })
                .click(),
            ]);
            assert.equal(response.status(), 409);
            assert.equal((await response.json()).code, 'conflict');
            await textIncludes(
              controls.locator('.progress-notice [role="status"]'),
              'Progress changed elsewhere.',
            );
            assert.equal(
              await controls
                .getByRole('button', {
                  name: 'Restore backup text',
                  exact: true,
                })
                .isEnabled(),
              false,
            );
            assert.deepEqual((await documentFor(a, suite.origin)).lessons, {
              [first.id]: 'review',
            });
            await a.page
              .getByRole('navigation', { name: 'Progress account' })
              .getByRole('button', { name: 'Reload progress', exact: true })
              .click();
            await accountReady(a.page);
            assert.deepEqual((await backup(a.page)).lessons, {
              [first.id]: 'review',
            });
          },
        );
        await a.step(
          'Reject a stale UI reset and explicitly reload the newer account mark',
          async () => {
            await controls
              .getByRole('button', { name: 'Clear marks', exact: true })
              .click();
            await markLesson(b.page, first.id, 'Mark understood', 'complete');
            const [response] = await Promise.all([
              a.page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/progress' &&
                  response.request().method() === 'PUT',
              ),
              controls
                .getByRole('button', { name: 'Clear all marks', exact: true })
                .click(),
            ]);
            assert.equal(response.status(), 409);
            assert.equal((await response.json()).code, 'conflict');
            await textIncludes(
              controls.locator('.progress-notice [role="status"]'),
              'Progress changed elsewhere.',
            );
            assert.equal(
              await controls
                .getByRole('button', { name: 'Clear all marks', exact: true })
                .isEnabled(),
              false,
            );
            assert.deepEqual((await documentFor(a, suite.origin)).lessons, {
              [first.id]: 'complete',
            });
            await a.page
              .getByRole('navigation', { name: 'Progress account' })
              .getByRole('button', { name: 'Reload progress', exact: true })
              .click();
            await accountReady(a.page);
            assert.deepEqual((await backup(a.page)).lessons, {
              [first.id]: 'complete',
            });
            const recovered = await documentFor(a, suite.origin);
            await a.go(first.route);
            const next = await markLesson(
              a.page,
              first.id,
              'Review later',
              'review',
            );
            assert.equal(next.revision, recovered.revision + 1);
            return {
              recoveredRevision: recovered.revision,
              nextRevision: next.revision,
            };
          },
        );
      },
      { account: 'A' },
    );

    await runCase(
      suite,
      profile,
      'practice-explicit-legacy-import',
      ['feature:legacy-device-import-account-wins'],
      async (a) => {
        const [first, second] = a.data.map.lessons;
        const raw = JSON.stringify({
          [first.id]: 'review',
          [second.id]: 'review',
          Z99: 'complete',
        });
        await a.go(first.route);
        await a.step(
          'Install invented older device bytes without merging them into account progress',
          async () => {
            await a.page.evaluate(
              (raw) => localStorage.setItem('numbertheory.progress.v1', raw),
              raw,
            );
            assert.deepEqual((await documentFor(a, suite.origin)).lessons, {});
            await markLesson(a.page, first.id, 'Mark understood', 'complete');
            await a.go('/practice');
            assert.deepEqual((await backup(a.page)).lessons, {
              [first.id]: 'complete',
            });
          },
        );
        await a.step(
          'Explicitly import older marks, keep account conflicts, and preserve the original local bytes',
          async () => {
            const controls = a.page.locator('.progress-management');
            const before = await documentFor(a, suite.origin);
            await controls
              .getByRole('button', {
                name: 'Check this device for older marks',
                exact: true,
              })
              .click();
            await textIncludes(
              controls.locator('.legacy-progress'),
              'Found 2 older device marks.',
            );
            await textIncludes(
              controls.locator('.legacy-progress'),
              '1 unreadable entries were skipped.',
            );
            assert.deepEqual(
              await documentFor(a, suite.origin),
              before,
              'Checking older data wrote account marks',
            );
            await acknowledged(a.page, 'PUT', () =>
              controls
                .getByRole('button', {
                  name: 'Import older device marks',
                  exact: true,
                })
                .click(),
            );
            await textIncludes(
              controls.locator(':scope > p[role="status"]'),
              'Older device marks imported to your account.',
            );
            assert.deepEqual((await backup(a.page)).lessons, {
              [first.id]: 'complete',
              [second.id]: 'review',
            });
            assert.equal(
              await a.page.evaluate(() =>
                localStorage.getItem('numbertheory.progress.v1'),
              ),
              raw,
            );
            await a.page.reload({ waitUntil: 'load' });
            await accountReady(a.page);
            assert.deepEqual((await backup(a.page)).lessons, {
              [first.id]: 'complete',
              [second.id]: 'review',
            });
            assert.equal(
              await a.page.evaluate(() =>
                localStorage.getItem('numbertheory.progress.v1'),
              ),
              raw,
            );
            return {
              legacyBytes: raw,
              document: await documentFor(a, suite.origin),
            };
          },
        );
      },
      { account: 'A' },
    );

    await runCase(
      suite,
      profile,
      'practice-committed-response-loss',
      ['feature:account-uncertain-save-reload'],
      async (a) => {
        const [first] = a.data.map.lessons;
        await a.go(first.route);
        await markLesson(a.page, first.id, 'Mark understood', 'complete');
        let committed;
        let writes = 0;
        await a.page.route('**/api/progress', async (route) => {
          if (route.request().method() !== 'PATCH') return route.continue();
          writes++;
          const response = await route.fetch();
          assert.equal(response.status(), 200);
          committed = await response.json();
          a.expectResponseLoss(route.request());
          await route.abort('failed');
        });
        await a.step(
          'Commit a real D1 write, lose only its acknowledgement, and block further GUI writes',
          async () => {
            await a.page
              .getByRole('button', { name: 'Review later', exact: true })
              .click();
            const account = a.page.getByRole('navigation', {
              name: 'Progress account',
            });
            await visible(
              account.getByText('Save unconfirmed', { exact: true }),
            );
            assert.equal(writes, 1);
            assert.deepEqual(committed.lessons, { [first.id]: 'review' });
            assert.deepEqual(
              (await documentFor(a, suite.origin)).lessons,
              committed.lessons,
            );
            for (const name of [
              'Mark understood',
              'Review later',
              'Clear mark',
            ])
              assert.equal(
                await a.page
                  .getByRole('button', { name, exact: true })
                  .isEnabled(),
                false,
              );
            assert.equal(
              await a.page
                .getByRole('button', { name: 'Mark understood', exact: true })
                .getAttribute('aria-pressed'),
              'true',
              'Unacknowledged save changed confirmed UI marks',
            );
            return { committed, writes, status: 'uncertain' };
          },
        );
        await a.step(
          'Explicitly reload the committed D1 mark before sending fresh user intent',
          async () => {
            await a.page.unroute('**/api/progress');
            await a.page
              .getByRole('navigation', { name: 'Progress account' })
              .getByRole('button', { name: 'Reload progress', exact: true })
              .click();
            await accountReady(a.page);
            await visible(
              a.page
                .getByRole('button', { name: 'Review later', exact: true })
                .and(a.page.locator('[aria-pressed="true"]')),
            );
            assert.equal(
              (await documentFor(a, suite.origin)).revision,
              committed.revision,
              'Reload replayed the write',
            );
            const next = await markLesson(
              a.page,
              first.id,
              'Mark understood',
              'complete',
            );
            assert.equal(next.revision, committed.revision + 1);
            return {
              reloadedRevision: committed.revision,
              nextRevision: next.revision,
            };
          },
        );
      },
      { account: 'A' },
    );

    await runCase(
      suite,
      profile,
      'practice-signout-client-clear',
      ['feature:account-signout-clear'],
      async (a) => {
        const [first] = a.data.map.lessons;
        await a.go(`${first.route}#practice`);
        await markLesson(a.page, first.id, 'Mark understood', 'complete');
        let observedClick;
        const observed = new Promise((resolve) => {
          observedClick = resolve;
        });
        await a.page.exposeBinding('observeSignOutClick', (_, snapshot) =>
          observedClick(snapshot),
        );
        await a.page.evaluate(() => {
          window.addEventListener(
            'click',
            (event) => {
              const anchor = event.target.closest('a');
              if (
                !anchor ||
                new URL(anchor.href).pathname !== '/signout-with-chatgpt'
              )
                return;
              const account = document.querySelector(
                'nav[aria-label="Progress account"]',
              );
              const signIn = [...account.querySelectorAll('a')].find(
                (link) => link.textContent.trim() === 'Sign in with ChatGPT',
              );
              const mark = [
                ...document.querySelectorAll(
                  '#practice .progress-actions button',
                ),
              ].find(
                (button) => button.textContent.trim() === 'Mark understood',
              );
              void window.observeSignOutClick({
                signInVisible: Boolean(signIn?.getBoundingClientRect().width),
                markPressed: mark?.getAttribute('aria-pressed'),
                markDisabled: mark?.disabled,
                defaultPrevented: event.defaultPrevented,
                url: location.href,
              });
            },
            { once: true },
          );
        });
        let received;
        let rejected;
        let timer;
        const aborted = new Promise((resolve, reject) => {
          received = resolve;
          rejected = reject;
        });
        aborted.catch(() => {});
        const pattern = '**/signout-with-chatgpt?*';
        const handler = async (route) => {
          try {
            const request = route.request();
            const receipt = {
              url: request.url(),
              isNavigation: request.isNavigationRequest(),
              topLevel: request.frame() === a.page.mainFrame(),
            };
            await route.abort('aborted');
            received(receipt);
          } catch (error) {
            rejected(error);
          }
        };
        await a.page.route(pattern, handler, { times: 1 });
        try {
          await a.step(
            'Observe cleared private UI in the real sign-out click, then abort its reserved top-level navigation',
            async () => {
              const signOut = a.page
                .getByRole('navigation', { name: 'Progress account' })
                .getByRole('link', { name: 'Sign out', exact: true });
              assert.equal(await signOut.getAttribute('target'), '_top');
              const [snapshot, navigation] = await Promise.race([
                Promise.all([
                  observed,
                  aborted,
                  signOut.click({ noWaitAfter: true }),
                ]),
                new Promise((_, reject) => {
                  timer = setTimeout(
                    () => reject(new Error('Sign-out observation deadline')),
                    8000,
                  );
                }),
              ]);
              assert(navigation.isNavigation && navigation.topLevel);
              const path = new URL(navigation.url);
              assert.equal(path.origin, suite.origin);
              assert.equal(path.pathname, '/signout-with-chatgpt');
              assert.equal(
                path.searchParams.get('return_to'),
                `${first.route}#practice`,
              );
              assert.equal(snapshot.signInVisible, true);
              assert.equal(snapshot.markPressed, 'false');
              assert.equal(snapshot.markDisabled, true);
              assert.equal(
                snapshot.defaultPrevented,
                false,
                'Observation prevented real navigation',
              );
              assert.equal(
                snapshot.url,
                `${suite.origin}${first.route}#practice`,
              );
              await visible(
                a.page
                  .getByRole('navigation', { name: 'Progress account' })
                  .getByRole('link', {
                    name: 'Sign in with ChatGPT',
                    exact: true,
                  }),
              );
              assert.deepEqual(
                (await documentFor(a, suite.origin)).lessons,
                { [first.id]: 'complete' },
                'Sign-out cleared durable account marks',
              );
              return {
                navigation,
                observed: snapshot,
                privateUiCleared: true,
                hostedAuthentication:
                  'not-evaluated; reserved navigation aborted after the client observation',
              };
            },
          );
        } finally {
          clearTimeout(timer);
          await a.page.unroute(pattern, handler);
        }
      },
      { account: 'A' },
    );

    await runCase(
      suite,
      profile,
      'practice-clipboard-denied-fallback',
      ['feature:progress-export-copy-backup'],
      async ({ page, context, go, step }) => {
        await context.grantPermissions([], { origin: suite.origin });
        await go('/practice');
        await step(
          'Deny browser clipboard permission and require selected transferable fallback bytes',
          async () => {
            assert.equal(
              await page.evaluate(
                async () =>
                  (
                    await navigator.permissions.query({
                      name: 'clipboard-write',
                    })
                  ).state,
              ),
              'denied',
              'Chromium clipboard denial prerequisite unavailable',
            );
            const controls = page.locator('.progress-management');
            await controls
              .getByRole('button', { name: 'Copy JSON backup', exact: true })
              .click();
            await textIncludes(
              controls.locator(':scope > p[role="status"]'),
              'Select and copy the backup text below',
            );
            const field = controls.getByRole('textbox', {
              name: 'Progress backup',
              exact: true,
            });
            await focused(field);
            const selected = await field.evaluate((element) => ({
              start: element.selectionStart,
              end: element.selectionEnd,
              text: element.value,
            }));
            assert.equal(selected.start, 0);
            assert.equal(selected.end, selected.text.length);
            assert.deepEqual(JSON.parse(selected.text), {
              schemaVersion: 1,
              lessons: {},
            });
            return {
              clipboardPermission: 'denied',
              selectedBytes: selected.text,
            };
          },
        );
      },
      { account: 'A' },
    );
  }
}
