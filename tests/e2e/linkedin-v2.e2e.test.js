// LinkedIn's 2026 feed markup (mock-feed ?scenario=v2), built from a real layout report.
const test = require('node:test');
const assert = require('node:assert/strict');
const { launch, start, waitAuthor, authorText, mockState } = require('./helpers.js'); // eslint-disable-line no-unused-vars

async function withV2(t) {
  const env = await launch({ scenario: 'v2' });
  t.after(() => env.close());
  return env.page;
}

test('v2: finds posts and reads author and full text', async (t) => {
  const page = await withV2(t);
  await start(page);
  await waitAuthor(page, 'Priya Nair');
  await page.locator('[data-sm="text"]', { hasText: 'What is the one alert your team would delete' }).waitFor({ timeout: 5000 });
});

test('v2: promoted posts are still left out', async (t) => {
  const page = await withV2(t);
  await start(page);
  await page.keyboard.press('ArrowLeft');
  await waitAuthor(page, 'Marcus Webb');
  await page.keyboard.press('ArrowLeft');
  await waitAuthor(page, 'Elena Sorensen');
});

test('v2: "Recommended for you" follow boxes are not treated as posts', async (t) => {
  const page = await withV2(t);
  await start(page);
  const seen = [];
  for (let i = 0; i < 4; i++) {
    seen.push(await authorText(page));
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(250);
  }
  assert.deepEqual(seen, ['Priya Nair', 'Marcus Webb', 'Elena Sorensen', 'Daniel Okafor']);
});

test('v2: skip and undo work without post URNs', async (t) => {
  const page = await withV2(t);
  await start(page);
  await page.keyboard.press('ArrowLeft');
  await waitAuthor(page, 'Marcus Webb');
  await page.keyboard.press('KeyU');
  await waitAuthor(page, 'Priya Nair');
});

test('v2: R then 2 reacts through the click-to-open reactions menu', async (t) => {
  const page = await withV2(t);
  await start(page);
  await page.keyboard.press('KeyR');
  await page.keyboard.press('Digit2');
  await waitAuthor(page, 'Marcus Webb', 10000);
  assert.equal((await mockState(page, 'Priya Nair')).reaction, 'celebrate');
});

test('v2: a reaction never lands on a comment\'s Like button elsewhere on the page', async (t) => {
  const page = await withV2(t);
  await start(page);
  await page.keyboard.press('KeyR');
  await page.keyboard.press('Digit1');
  await waitAuthor(page, 'Marcus Webb', 10000);
  const s = await mockState(page, 'Priya Nair');
  assert.equal(s.commentLiked, undefined);
  assert.equal(s.reaction, 'like');
});

test('v2: reactions work when the picker is pre-rendered hidden and only revealed on click', async (t) => {
  const env = await launch({ scenario: 'v2', query: 'hiddenpicker=1' });
  t.after(() => env.close());
  const page = env.page;
  await start(page);
  await page.keyboard.press('KeyR');
  await page.keyboard.press('Digit2');
  await waitAuthor(page, 'Marcus Webb', 10000);
  const s = await mockState(page, 'Priya Nair');
  assert.equal(s.reaction, 'celebrate');
  assert.equal(s.commentLiked, undefined);
});

test('v2: comment is posted through the new comment box', async (t) => {
  const page = await withV2(t);
  await start(page);
  await page.keyboard.press('KeyC');
  await page.locator('[data-sm="composer-input"]').waitFor();
  await page.keyboard.type('Great point about runbooks');
  await page.keyboard.press('Control+Enter');
  await waitAuthor(page, 'Marcus Webb', 12000);
  assert.deepEqual((await mockState(page, 'Priya Nair')).comments, ['Great point about runbooks']);
  assert.equal(await authorText(page), 'Marcus Webb');
});

test('v2: a dropped comment whose words already appear in the post is not reported as posted', async (t) => {
  const env = await launch({ scenario: 'v2', query: 'dropcomments=1' });
  t.after(() => env.close());
  const page = env.page;
  await start(page);
  await page.keyboard.press('KeyC');
  await page.locator('[data-sm="composer-input"]').waitFor();
  await page.keyboard.type('What actually worked');
  await page.keyboard.press('Control+Enter');
  await page.locator('[data-sm="failure"]').waitFor({ timeout: 15000 });
  assert.equal(await authorText(page), 'Priya Nair');
});

test('v2: S saves through the post menu', async (t) => {
  const page = await withV2(t);
  await start(page);
  await page.keyboard.press('KeyS');
  await waitAuthor(page, 'Marcus Webb', 10000);
  assert.equal((await mockState(page, 'Priya Nair')).saved, true);
});
