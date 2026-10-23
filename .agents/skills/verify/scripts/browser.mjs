import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { discoverCaseArtifacts } from '../../../../scripts/verification/browser-artifacts.mjs';
import { selectPracticeCase } from '../../../../scripts/verification/practice-partitions.mjs';
import { doctor, hash, save } from './runtime.mjs';

export const profiles = {
  phone: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
};

export async function visible(locator) {
  await locator.waitFor({ state: 'visible', timeout: 8000 });
  return locator;
}

export async function focused(locator) {
  await visible(locator);
  await locator
    .page()
    .waitForFunction(
      (element) => element === document.activeElement,
      await locator.elementHandle(),
    );
}

export async function textIncludes(locator, expected) {
  await visible(locator.filter({ hasText: expected }));
  const text = await locator.innerText();
  assert(
    text.includes(expected),
    `Expected ${JSON.stringify(expected)} in ${JSON.stringify(text.slice(0, 800))}`,
  );
}

export async function renderedMath(locator) {
  return locator
    .locator('.katex:visible')
    .locator('annotation[encoding="application/x-tex"]')
    .allTextContents();
}

export async function authoredText(locator, expected) {
  await visible(locator);
  const actual = await locator.evaluate((element) => {
    function read(node) {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent;
      if (!(node instanceof Element)) return '';
      if (
        !node.checkVisibility({
          opacityProperty: true,
          visibilityProperty: true,
        })
      )
        return '';
      if (node.matches('.math-inline, .math-block')) {
        const rendered = node.querySelector('.katex-html');
        if (
          !rendered?.checkVisibility({
            opacityProperty: true,
            visibilityProperty: true,
          })
        )
          throw new Error('Authored mathematics is not visibly rendered');
        const tex = node.querySelector(
          'annotation[encoding="application/x-tex"]',
        );
        if (!tex) throw new Error('Authored mathematics has no TeX annotation');
        const delimiters = node.classList.contains('math-block')
          ? ['\\[', '\\]']
          : ['\\(', '\\)'];
        return `${delimiters[0]}${tex.textContent}${delimiters[1]}`;
      }
      return [...node.childNodes].map(read).join('');
    }
    return read(element);
  });
  const compact = (text) => text.replace(/\s+/g, ' ').trim();
  assert.equal(compact(actual), compact(expected), 'Authored content differs');
}

export async function checkPage(page) {
  await visible(page.locator('#main-content h1'));
  assert.equal(
    await page.locator('.katex-error, .math-error').count(),
    0,
    'Math failed to render',
  );
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  assert(!overflow, 'Document overflows the viewport');
}

export async function accountReady(page) {
  const account = page.getByRole('navigation', { name: 'Progress account' });
  await visible(account.getByRole('link', { name: 'Sign out', exact: true }));
  await account
    .getByText('Saving progress…', { exact: true })
    .waitFor({ state: 'hidden' });
}

export async function acknowledged(page, method, action) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/progress' &&
        response.request().method() === method,
    ),
    action(),
  ]);
  assert.equal(response.status(), 200, `${method} was not acknowledged`);
  assert.match(response.headers()['cache-control'], /no-store/);
  const document = await response.json();
  await accountReady(page);
  return document;
}

export async function markLesson(
  page,
  lessonId,
  name,
  status,
  practice = page.locator('#practice'),
) {
  const button = practice.getByRole('button', { name, exact: true });
  const document = await acknowledged(page, 'PATCH', () => button.click());
  if (status === null) {
    assert(!Object.hasOwn(document.lessons, lessonId));
    await button.waitFor({ state: 'hidden' });
  } else {
    assert.equal(document.lessons[lessonId], status);
    await visible(button.and(page.locator('[aria-pressed="true"]')));
  }
  return document;
}

export async function runCase(
  suite,
  profile,
  id,
  coverage,
  drive,
  options = {},
) {
  if (suite.practicePlans) {
    assert(
      suite.practicePlans[profile],
      `Missing Practice plan for ${profile}`,
    );
    if (!selectPracticeCase(suite.practicePlans[profile], id)) return;
  }
  suite.signal.throwIfAborted();
  const directory = join(
    suite.output,
    `${profile}-${id.replace(/[^a-z0-9-]/gi, '-')}`,
  );
  await mkdir(directory);
  assert.equal(
    new URL(suite.origin).hostname,
    '127.0.0.1',
    'Fixtures require an owned local Worker',
  );
  const sessions = [];
  const events = [];
  const errors = [];
  const stepFor = async (page, action, callback) => {
    const event = { action, at: new Date().toISOString(), before: page.url() };
    events.push(event);
    try {
      const result = await callback();
      event.status = 'passed';
      if (result !== undefined) event.value = result;
      return result;
    } catch (error) {
      event.status = 'failed';
      event.error = error.message;
      throw error;
    } finally {
      event.after = page.url();
      try {
        event.result = await page.evaluate(() => ({
          heading: document.querySelector('main h1')?.textContent,
          focus: {
            id: document.activeElement?.id,
            label: document.activeElement?.getAttribute('aria-label'),
            text: document.activeElement?.textContent?.slice(0, 200),
          },
          status: [
            ...document.querySelectorAll(
              'main [role="status"], main [role="alert"]',
            ),
          ].map((element) => element.textContent),
          inputs: [
            ...document.querySelectorAll(
              'main input, main select, main textarea',
            ),
          ].map((element) => ({
            label:
              element.getAttribute('aria-label') ??
              [...(element.labels ?? [])]
                .map((label) => label.textContent)
                .join(' '),
            value: element.value,
          })),
        }));
      } catch (error) {
        event.observationError = error.message;
      }
    }
  };
  const session = async ({ label, account, permissions = [] } = {}) => {
    assert(
      label && !sessions.some((item) => item.label === label),
      'Session labels must be unique',
    );
    const accountId = account
      ? `local-fixture-${hash(`${suite.output}:${profile}:${id}:${account}`).slice(0, 24)}`
      : null;
    const headers = accountId
      ? {
          'oai-authenticated-user-id': accountId,
          'oai-authenticated-user-email': `${accountId}@example.test`,
          'oai-authenticated-user-full-name': encodeURIComponent(
            `Local verifier ${account}`,
          ),
          'oai-authenticated-user-full-name-encoding': 'percent-encoded-utf-8',
        }
      : {};
    const context = await suite.browser.newContext({
      viewport: profiles[profile],
      reducedMotion: 'reduce',
      permissions,
      extraHTTPHeaders: headers,
    });
    await context.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: false,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    const expectedErrors = new Set(accountId ? [] : [401]);
    const lostResponses = new Set();
    page.on('pageerror', (error) =>
      errors.push({
        session: label,
        kind: 'pageerror',
        message: error.message,
      }),
    );
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      const text = message.text();
      const progress =
        new URL(message.location().url || suite.origin).pathname ===
        '/api/progress';
      if (
        progress &&
        ([...expectedErrors].some((code) =>
          text.includes(`status of ${code}`),
        ) ||
          (lostResponses.size &&
            text === 'Failed to load resource: net::ERR_FAILED'))
      )
        return;
      errors.push({ session: label, kind: 'console', message: text });
    });
    page.on('requestfailed', (request) => {
      const message = request.failure()?.errorText;
      if (lostResponses.has(request) || message === 'net::ERR_ABORTED') return;
      errors.push({
        session: label,
        kind: 'network',
        url: request.url(),
        message,
      });
    });
    page.on('response', (response) => {
      if (new URL(response.url()).pathname === '/api/progress')
        events.push({
          session: label,
          action: `${response.request().method()} local progress`,
          status: response.status(),
          at: new Date().toISOString(),
        });
    });
    const entry = {
      label,
      page,
      context,
      accountId,
      headers,
      step: (action, callback) => stepFor(page, action, callback),
      go: (path) =>
        stepFor(page, `Open ${path}`, async () => {
          await page.goto(`${suite.origin}${path}`, { waitUntil: 'load' });
          await checkPage(page);
          if (accountId) await accountReady(page);
        }),
      expectProgressError: (code) => expectedErrors.add(code),
      expectResponseLoss: (request) => lostResponses.add(request),
    };
    sessions.push(entry);
    return entry;
  };
  const primary = await session({ label: 'main', ...options });
  const { page } = primary;
  const record = {
    id,
    profile,
    coverage,
    status: 'passed',
    artifacts: [],
    startedAt: new Date().toISOString(),
  };
  try {
    await drive({ ...primary, session, data: suite.data, profile });
    await checkPage(page);
    assert.deepEqual(errors, [], 'Browser console, script, or network errors');
  } catch (error) {
    record.status = 'failed';
    record.error = error.stack ?? String(error);
    process.stderr.write(`[${profile}/${id}] ${error.message}\n`);
    try {
      record.doctorAfterFailure = await doctor(suite.output);
    } catch (failure) {
      record.doctorAfterFailure = { status: 'failed', error: failure.message };
    }
  } finally {
    const capture = async (name, callback) => {
      try {
        await callback(join(directory, name));
      } catch (error) {
        record.captureErrors ??= [];
        record.captureErrors.push(`${name}: ${error.message}`);
        record.status = 'failed';
      }
    };
    record.sessions = sessions.map(({ label, accountId }) => ({
      label,
      accountId,
      identity: accountId ? 'invented local dispatcher fixture' : 'anonymous',
    }));
    for (const { label, page, context } of sessions) {
      const prefix = label === 'main' ? '' : `${label}-`;
      await capture(`${prefix}screen.png`, async (file) => {
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: file, timeout: 8000 });
      });
      await capture(`${prefix}dom.html`, async (file) =>
        writeFile(file, await page.content()),
      );
      await capture(`${prefix}aria.txt`, async (file) =>
        writeFile(file, await page.locator('body').ariaSnapshot()),
      );
      await capture(`${prefix}trace.zip`, (file) =>
        context.tracing.stop({ path: file }),
      );
      await context.close();
    }
    await capture('actions.json', (file) =>
      save(file, { events, errors, url: page.url() }),
    );
    try {
      record.artifacts = discoverCaseArtifacts(directory);
    } catch (error) {
      record.captureErrors ??= [];
      record.captureErrors.push(`Artifact discovery: ${error.message}`);
      record.status = 'failed';
    }
  }
  record.finishedAt = new Date().toISOString();
  suite.report.cases.push(record);
  await save(join(suite.output, 'report.json'), suite.report);
  return record;
}
