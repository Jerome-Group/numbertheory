import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { doctor, save } from './runtime.mjs';

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

export async function runCase(suite, profile, id, coverage, drive) {
  suite.signal.throwIfAborted();
  const directory = join(
    suite.output,
    `${profile}-${id.replace(/[^a-z0-9-]/gi, '-')}`,
  );
  await mkdir(directory);
  const context = await suite.browser.newContext({
    viewport: profiles[profile],
    reducedMotion: 'reduce',
  });
  await context.tracing.start({
    screenshots: true,
    snapshots: true,
    sources: false,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const events = [];
  const errors = [];
  page.on('pageerror', (error) =>
    errors.push({ kind: 'pageerror', message: error.message }),
  );
  page.on('console', (message) => {
    if (message.type() === 'error')
      errors.push({ kind: 'console', message: message.text() });
  });
  page.on('requestfailed', (request) => {
    if (request.failure()?.errorText !== 'net::ERR_ABORTED')
      errors.push({
        kind: 'network',
        url: request.url(),
        message: request.failure()?.errorText,
      });
  });
  const step = async (action, callback) => {
    const event = { action, at: new Date().toISOString(), before: page.url() };
    events.push(event);
    try {
      const result = await callback();
      event.status = 'passed';
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
  const go = (path) =>
    step(`Open ${path}`, async () => {
      await page.goto(`${suite.origin}${path}`, { waitUntil: 'load' });
      await checkPage(page);
    });
  const record = {
    id,
    profile,
    coverage,
    status: 'passed',
    artifacts: [],
    startedAt: new Date().toISOString(),
  };
  try {
    await drive({ page, context, go, step, data: suite.data, profile });
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
        record.artifacts.push(`${directory}/${name}`);
      } catch (error) {
        record.captureErrors ??= [];
        record.captureErrors.push(`${name}: ${error.message}`);
        record.status = 'failed';
      }
    };
    await capture('screen.png', async (file) => {
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: file, timeout: 8000 });
    });
    await capture('dom.html', async (file) =>
      writeFile(file, await page.content()),
    );
    await capture('aria.txt', async (file) =>
      writeFile(file, await page.locator('body').ariaSnapshot()),
    );
    await capture('actions.json', (file) =>
      save(file, { events, errors, url: page.url() }),
    );
    await capture('trace.zip', (file) => context.tracing.stop({ path: file }));
    await context.close();
  }
  record.finishedAt = new Date().toISOString();
  suite.report.cases.push(record);
  await save(join(suite.output, 'report.json'), suite.report);
  return record;
}
