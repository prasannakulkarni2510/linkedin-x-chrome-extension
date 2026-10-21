const { chromium } = require('playwright');
const { startServer } = require('../../dev/serve.js');
const { OUT } = require('../../dev/build-test-extension.js');

// Launches Chromium with the test build of the extension and opens the mock feed.
async function launch(opts = {}) {
  const server = await startServer(0);
  let context;
  const close = async () => {
    if (context) await context.close();
    server.close();
  };
  try {
    context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: opts.headless !== false,
      viewport: opts.viewport || { width: 1280, height: 800 },
      args: [`--disable-extensions-except=${OUT}`, `--load-extension=${OUT}`],
      recordVideo: opts.recordVideo,
    });
    const page = context.pages()[0] || (await context.newPage());
    const qs = opts.scenario ? `?scenario=${opts.scenario}${opts.query ? '&' + opts.query : ''}` : '';
    await page.goto(`http://localhost:${server.port}/${opts.path || ''}${qs}`);
    await page.locator('[data-sm="launcher"]').waitFor({ timeout: 10000 });
    return { context, page, port: server.port, close };
  } catch (err) {
    await close();
    throw err;
  }
}

async function start(page) {
  await page.locator('[data-sm="launcher"]').click();
  await page.locator('[data-sm="card"]').waitFor();
}

async function waitAuthor(page, name, timeout = 8000) {
  await page.locator('[data-sm="author"]', { hasText: name }).waitFor({ timeout });
}

async function authorText(page) {
  return (await page.locator('[data-sm="author"]').innerText()).trim();
}

async function mockState(page, author) {
  return page.evaluate((a) => window.__mockFeed.state(window.__mockFeed.idOfAuthor(a)), author);
}

async function mode(page) {
  return page.locator('[data-sm="overlay"]').getAttribute('data-mode');
}

module.exports = { launch, start, waitAuthor, authorText, mockState, mode };
