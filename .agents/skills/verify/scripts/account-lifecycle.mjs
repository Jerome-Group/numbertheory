import assert from 'node:assert/strict';
import { backup, documentFor } from './account-journeys.mjs';
import { accountReady, markLesson, runCase } from './browser.mjs';

export async function accountLifecycle(suite) {
  for (const profile of suite.profiles) {
    await runCase(
      suite,
      profile,
      'practice-lifecycle-account-fence',
      [],
      async (a) => {
        const [first, second] = a.data.map.lessons;
        const b = await a.session({ label: 'account-B', account: 'B' });
        await a.go(first.route);
        await markLesson(a.page, first.id, 'Review later', 'review');
        await b.go(second.route);
        await markLesson(b.page, second.id, 'Mark understood', 'complete');
        await a.step(
          'Dispatch pagehide and persisted pageshow against real account progress',
          async () => {
            const cleared = await a.page.evaluate(() => {
              window.dispatchEvent(
                new PageTransitionEvent('pagehide', { persisted: true }),
              );
              return [
                ...document.querySelectorAll(
                  '#practice .progress-actions button',
                ),
              ].map((button) => ({
                disabled: button.disabled,
                pressed: button.getAttribute('aria-pressed'),
              }));
            });
            assert(cleared.length >= 2);
            assert(
              cleared.every(
                (button) => button.disabled && button.pressed === 'false',
              ),
            );
            await a.page.evaluate(() =>
              window.dispatchEvent(
                new PageTransitionEvent('pageshow', { persisted: true }),
              ),
            );
            await accountReady(a.page);
            assert.equal(
              await a.page
                .locator('#practice')
                .getByRole('button', { name: 'Review later', exact: true })
                .getAttribute('aria-pressed'),
              'true',
            );
            return {
              stimulus: 'synthetic lifecycle events',
              nativeBFCache: 'not-evaluated',
            };
          },
        );
        await a.go('/practice');
        assert.deepEqual((await backup(a.page)).lessons, {
          [first.id]: 'review',
        });
        await a.step(
          'A newer real account read fences a held older account response',
          async () => {
            const captured = Promise.withResolvers();
            const release = Promise.withResolvers();
            const finished = Promise.withResolvers();
            let next = true;
            const intercept = async (route) => {
              if (!next || route.request().method() !== 'GET')
                return route.continue();
              next = false;
              try {
                const response = await route.fetch({ timeout: 8000 });
                captured.resolve(await response.json());
                await release.promise;
                await route.fulfill({ response });
              } catch (error) {
                captured.reject(error);
                throw error;
              } finally {
                finished.resolve();
              }
            };
            await a.context.route('**/api/progress', intercept);
            let timer;
            try {
              await a.page.evaluate(() => {
                if (document.visibilityState !== 'visible')
                  throw new Error('Visible-page prerequisite missing');
                document.dispatchEvent(new Event('visibilitychange'));
              });
              const oldDocument = await Promise.race([
                captured.promise,
                new Promise((_, reject) => {
                  timer = setTimeout(
                    () => reject(new Error('Lifecycle read did not start')),
                    8000,
                  );
                }),
              ]);
              clearTimeout(timer);
              assert.equal(oldDocument.accountId, a.accountId);
              await a.context.setExtraHTTPHeaders(b.headers);
              const [fresh] = await Promise.all([
                a.page.waitForResponse(
                  (response) =>
                    new URL(response.url()).pathname === '/api/progress' &&
                    response.request().method() === 'GET',
                ),
                a.page.evaluate(() =>
                  window.dispatchEvent(
                    new PageTransitionEvent('pageshow', { persisted: true }),
                  ),
                ),
              ]);
              assert.equal(fresh.status(), 200);
              assert.equal((await fresh.json()).accountId, b.accountId);
              await accountReady(a.page);
              assert.deepEqual((await backup(a.page)).lessons, {
                [second.id]: 'complete',
              });
              const late = a.page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/progress' &&
                  response.request().method() === 'GET',
              );
              release.resolve();
              await late;
              await a.page.evaluate(
                () =>
                  new Promise((resolve) =>
                    requestAnimationFrame(() => requestAnimationFrame(resolve)),
                  ),
              );
              assert.deepEqual(
                (await backup(a.page)).lessons,
                { [second.id]: 'complete' },
                'Late A response replaced B progress',
              );
            } finally {
              clearTimeout(timer);
              release.resolve();
              await a.context.unroute('**/api/progress', intercept);
              if (!next) await finished.promise;
              await a.context.setExtraHTTPHeaders(a.headers);
            }
            assert.deepEqual((await documentFor(a, suite.origin)).lessons, {
              [first.id]: 'review',
            });
            assert.deepEqual((await documentFor(b, suite.origin)).lessons, {
              [second.id]: 'complete',
            });
            await a.go('/practice');
            assert.deepEqual((await backup(a.page)).lessons, {
              [first.id]: 'review',
            });
            return {
              stimulus:
                'synthetic visibility/pageshow events and invented local dispatcher identities',
              responseSource: 'actual Worker and D1',
              nativeAccountSwitch: 'not-evaluated',
            };
          },
        );
      },
      { account: 'A' },
    );
  }
}
