// End-to-end on X: real extension in Chromium against the mock X timeline (dev/mock-feed/x).
// Run with `npm run e2e`.
const test = require('node:test');
const assert = require('node:assert/strict');
const { launch, start, waitAuthor, authorText, mockState, mode } = require('./helpers.js');

async function withX(t, opts) {
  const env = await launch(Object.assign({ path: 'x/' }, opts));
  t.after(() => env.close());
  return env.page;
}

const shortcutsFired = (page) => page.evaluate(() => window.__mockFeed.shortcutsFired());

test('x: the card uses X wording and starts on the first visible post', async (t) => {
  const page = await withX(t);
  await start(page);
  await waitAuthor(page, 'Priya Nair');
  const card = await page.locator('[data-sm="card"]').innerText();
  assert.match(card, /@priyabuilds/);
  assert.match(card, /Reply/);
  assert.match(card, /Bookmark/);
  assert.doesNotMatch(card, /LinkedIn/);
});

test('x: a long post offers "press O" instead of clicking X\'s Show more (which leaves the page)', async (t) => {
  const page = await withX(t);
  await start(page);
  await page.locator('[data-sm="card"]', { hasText: 'Show more on X' }).waitFor({ timeout: 5000 });
  await page.waitForTimeout(800);
  assert.equal(new URL(page.url()).pathname, '/x/');
  assert.equal(await mode(page), 'main');
});

test('x: skip, undo, and promoted posts left out', async (t) => {
  const page = await withX(t);
  await start(page);
  await page.keyboard.press('ArrowLeft');
  await waitAuthor(page, 'Marcus Webb');
  await page.keyboard.press('KeyU');
  await waitAuthor(page, 'Priya Nair');
  await page.keyboard.press('ArrowLeft');
  await waitAuthor(page, 'Marcus Webb');
  await page.keyboard.press('ArrowLeft');
  await waitAuthor(page, 'Elena Sorensen'); // Brightline's "Ad" post was skipped over
});

test('x: the engage menu lists X actions and performs nothing', async (t) => {
  const page = await withX(t);
  await start(page);
  await page.keyboard.press('ArrowRight');
  const menu = page.locator('[data-sm="engage-menu"]');
  await menu.waitFor();
  const text = await menu.innerText();
  for (const label of ['Like', 'Reply', 'Repost', 'Quote', 'Bookmark', 'Open on X', 'Copy link']) assert.match(text, new RegExp(label));
  const s = await mockState(page, 'Priya Nair');
  assert.equal(s.liked, false);
  assert.equal(s.reposted, false);
});

test('x: R likes directly through X\'s Like button, then advances', async (t) => {
  const page = await withX(t);
  await start(page);
  await page.keyboard.press('KeyR');
  await waitAuthor(page, 'Marcus Webb', 10000);
  assert.equal((await mockState(page, 'Priya Nair')).liked, true);
});

test('x: R on an already-liked post never unlikes it', async (t) => {
  const page = await withX(t);
  await start(page);
  for (const next of ['Marcus Webb', 'Elena Sorensen', 'Daniel Okafor']) {
    await page.keyboard.press('ArrowLeft');
    await waitAuthor(page, next);
  }
  assert.match(await page.locator('[data-sm="card"]').innerText(), /You liked this/);
  await page.keyboard.press('KeyR');
  await page.locator('[data-sm="toast"]', { hasText: 'already liked' }).waitFor({ timeout: 5000 });
  assert.equal(await authorText(page), 'Daniel Okafor');
  assert.equal((await mockState(page, 'Daniel Okafor')).liked, true);
});

test('x: a reply written in the card is sent through X\'s reply window', async (t) => {
  const page = await withX(t);
  await start(page);
  await page.keyboard.press('KeyC');
  await page.locator('[data-sm="composer-input"]').waitFor();
  await page.keyboard.type('Great point about runbooks');
  await page.keyboard.press('Control+Enter');
  await waitAuthor(page, 'Marcus Webb', 15000);
  assert.deepEqual((await mockState(page, 'Priya Nair')).replies, ['Great point about runbooks']);
  assert.equal(new URL(page.url()).pathname, '/x/');
});

test('x: keys never reach X\'s own shortcuts while Swipe Mode is open, including while typing', async (t) => {
  const page = await withX(t);
  await start(page);
  for (const k of ['KeyL', 'KeyJ', 'KeyB', 'KeyT', 'KeyK']) await page.keyboard.press(k);
  await page.keyboard.press('KeyC');
  await page.locator('[data-sm="composer-input"]').waitFor();
  await page.keyboard.type('look, blk talk');
  assert.equal(await page.locator('[data-sm="composer-input"]').inputValue(), 'look, blk talk');
  await page.waitForTimeout(300);
  assert.equal(await shortcutsFired(page), 0);
  const s = await mockState(page, 'Priya Nair');
  assert.equal(s.liked, false);
  assert.equal(s.bookmarked, false);
});

test('x: S bookmarks the post', async (t) => {
  const page = await withX(t);
  await start(page);
  await page.keyboard.press('KeyS');
  await waitAuthor(page, 'Marcus Webb', 10000);
  assert.equal((await mockState(page, 'Priya Nair')).bookmarked, true);
});

test('x: engage 3 reposts through X\'s repost menu', async (t) => {
  const page = await withX(t);
  await start(page);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Digit3');
  await waitAuthor(page, 'Marcus Webb', 10000);
  assert.equal((await mockState(page, 'Priya Nair')).reposted, true);
});

test('x: Quote hands over to X\'s composer and resumes after posting', async (t) => {
  const page = await withX(t);
  await start(page);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Digit4');
  await page.locator('[data-sm="overlay"][data-mode="native"]').waitFor({ timeout: 8000 });
  await page.locator('[data-testid="tweetTextarea_0"]').click();
  await page.keyboard.type('Worth reading');
  await page.locator('[data-testid="tweetButton"]').click();
  await waitAuthor(page, 'Marcus Webb', 12000);
  assert.deepEqual((await mockState(page, 'Priya Nair')).quotes, ['Worth reading']);
  assert.equal(await shortcutsFired(page), 0);
});

test('x: a Like that X never shows is not reported as done', async (t) => {
  const page = await withX(t, { scenario: 'broken' });
  await start(page);
  await page.keyboard.press('KeyR');
  const failure = page.locator('[data-sm="failure"]');
  await failure.waitFor({ timeout: 8000 });
  assert.match(await failure.innerText(), /Couldn't confirm that on X/);
  assert.equal((await mockState(page, 'Priya Nair')).liked, false);
  await page.keyboard.press('Escape');
  assert.equal(await authorText(page), 'Priya Nair');
});

test('x: a post X has unmounted is scrolled back into the page before acting on it', async (t) => {
  const page = await withX(t, { scenario: 'tight' });
  await start(page);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForFunction(() => !window.__mockFeed.mounted('Priya Nair'));
  await page.keyboard.press('KeyR');
  await waitAuthor(page, 'Marcus Webb', 12000);
  assert.equal((await mockState(page, 'Priya Nair')).liked, true);
});

test('x: quoted posts and link cards render in the card', async (t) => {
  const page = await withX(t);
  await start(page);
  for (const next of ['Marcus Webb', 'Elena Sorensen']) {
    await page.keyboard.press('ArrowLeft');
    await waitAuthor(page, next);
  }
  assert.match(await page.locator('[data-sm="card"]').innerText(), /What we learned shipping 40 experiments/);
  for (const next of ['Daniel Okafor', 'Hana Kobayashi', 'Tom Alvarez']) {
    await page.keyboard.press('ArrowLeft');
    await waitAuthor(page, next);
  }
  const card = await page.locator('[data-sm="card"]').innerText();
  assert.match(card, /Quote/);
  assert.match(card, /Grace Lin/);
  assert.match(card, /teaching tool first/);
  assert.match(card, /Priya Nair reposted/);
});

test('x: queue refills from the timeline and ends with a no-more-posts state', async (t) => {
  const page = await withX(t, { scenario: 'short' });
  await start(page);
  const end = page.locator('[data-sm="end"]');
  for (let i = 0; i < 40 && !(await end.isVisible()); i++) {
    if ((await mode(page)) === 'main') await page.keyboard.press('KeyN');
    await page.waitForTimeout(350);
  }
  await end.waitFor({ timeout: 15000 });
  assert.match(await end.innerText(), /X has nothing more to load/);
});
