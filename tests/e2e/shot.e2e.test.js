// End-to-end for tweet screenshots on the mock X post page (dev/mock-feed/x?view=status).
// Saving to a folder needs Chrome's folder picker, which tests can't drive; these cover the
// camera button, the reply picker and the rendered 1:1 image.
const test = require('node:test');
const assert = require('node:assert/strict');
const { launch } = require('./helpers.js');

async function postPage(t) {
  const env = await launch({ path: 'x/', query: 'view=status', scenario: 'default' });
  t.after(() => env.close());
  return env.page;
}

const panel = (page) => page.locator('[data-sm="shot-panel"]');

async function previewPixels(page) {
  return page.evaluate(() => {
    const c = document.getElementById('swipe-mode-shot').shadowRoot.querySelector('[data-sm="shot-preview"]');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let dark = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] < 128 && d[i + 1] < 128 && d[i + 2] < 128) dark++;
    return { w: c.width, h: c.height, corner: Array.from(d.slice(0, 3)), dark };
  });
}

test('shot: camera button opens the panel, lists replies, and renders a white square', async (t) => {
  const page = await postPage(t);
  assert.match(new URL(page.url()).pathname, /\/status\//);
  const buttons = page.locator('[data-sm="shot-button"]');
  await buttons.first().waitFor({ timeout: 5000 });
  assert.equal(await buttons.count(), 7); // the post, its four replies, two recommended posts
  await buttons.first().click();
  await panel(page).waitFor();
  assert.match(new URL(page.url()).pathname, /\/status\//, 'clicking the camera does not open the post');

  const replies = page.locator('[data-sm="shot-reply"]');
  await replies.first().waitFor({ timeout: 5000 });
  assert.equal(await replies.count(), 4);
  assert.match(await replies.first().innerText(), /Ivy Holt/);
  assert.match(await replies.first().innerText(), /😂/, 'emoji drawn as images keep their character');

  await page.waitForTimeout(600);
  const before = await previewPixels(page);
  assert.equal(before.w, 1080);
  assert.equal(before.h, 1080);
  assert.deepEqual(before.corner, [255, 255, 255]);
  assert.ok(before.dark > 1000, 'text was drawn');

  await replies.nth(0).click();
  await replies.nth(1).click();
  await page.waitForTimeout(600);
  const after = await previewPixels(page);
  assert.notEqual(after.dark, before.dark, 'picked replies change the image');
  assert.match(await panel(page).innerText(), /2 of 4 picked/);
});

test('shot: keys typed in the panel never reach X, and Escape closes it', async (t) => {
  const page = await postPage(t);
  await page.locator('[data-sm="shot-button"]').first().click();
  await panel(page).waitFor();
  await page.locator('[data-sm="shot-save"]').focus();
  await page.keyboard.press('KeyL');
  assert.equal(await page.evaluate(() => window.__mockFeed.shortcutsFired()), 0);
  await page.keyboard.press('Escape');
  await panel(page).waitFor({ state: 'detached' });
});

test('shot: on the timeline the panel starts loading the replies by itself', async (t) => {
  const env = await launch({ path: 'x/' });
  t.after(() => env.close());
  const page = env.page;
  await page.locator('[data-sm="shot-button"]').first().click();
  await panel(page).waitFor();
  assert.match(await page.locator('[data-sm="shot-away"]').innerText(), /Loading replies/);
  assert.equal(new URL(page.url()).pathname, '/x/');
});

const { start, waitAuthor } = require('./helpers.js');

test('shot: P in Swipe Mode opens the panel over the card, Esc goes back to the same post', async (t) => {
  const page = await postPage(t);
  await start(page);
  await waitAuthor(page, 'Marcus Webb');
  await page.keyboard.press('KeyP');
  await panel(page).waitFor();
  assert.equal(await page.locator('[data-sm="overlay"]').getAttribute('data-mode'), 'shot');
  const replies = page.locator('[data-sm="shot-reply"]');
  await replies.first().waitFor({ timeout: 5000 });
  assert.equal(await replies.count(), 4);
  await replies.nth(1).click();
  await page.keyboard.press('KeyL');
  assert.equal(await page.evaluate(() => window.__mockFeed.shortcutsFired()), 0);
  await page.keyboard.press('Escape');
  await panel(page).waitFor({ state: 'detached' });
  assert.equal(await page.locator('[data-sm="overlay"]').getAttribute('data-mode'), 'main');
  await waitAuthor(page, 'Marcus Webb');
});

// Playwright can't serve pages to tabs an extension opens, so this drives the service worker's
// background-tab reader directly against the mock post page.
test("shot: the background tab reads a post's replies and closes again", async (t) => {
  const env = await launch({ path: 'x/' });
  t.after(() => env.close());
  const { page, context, port } = env;
  const id = await page.evaluate(() => window.__mockFeed.idOfAuthor('Marcus Webb'));
  const sw = context.serviceWorkers()[0] || (await context.waitForEvent('serviceworker'));
  const res = await sw.evaluate(([url, pid]) => self.readThreadInTab(url, pid, 0, null), [`http://localhost:${port}/x/?view=status`, id]);
  assert.equal(res.status, 'ok');
  assert.deepEqual(res.replies.map((r) => r.name), ['Ivy Holt', 'Sam Patel', 'Noor Aziz', 'Leo Grant']);
  assert.ok(res.replies.every((r) => r.avatarUrl), 'every reply carries its profile picture');
  await page.waitForTimeout(500);
  assert.equal(context.pages().length, 1);
});

test('shot: the panel works from the keyboard, inside Swipe Mode and on its own', async (t) => {
  const page = await postPage(t);
  await start(page);
  await waitAuthor(page, 'Marcus Webb');
  await page.keyboard.press('KeyP');
  await panel(page).waitFor();
  await page.locator('[data-sm="shot-reply"]').first().waitFor({ timeout: 5000 });
  const count = () => panel(page).innerText().then((s) => (s.match(/(\d+) of 4 picked/) || [])[1]);
  await page.keyboard.press('Digit1'); // reply 1
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space'); // reply 3
  assert.equal(await count(), '2');
  const rows = page.locator('[data-sm="shot-reply"] input');
  assert.deepEqual(await Promise.all([0, 1, 2, 3].map((i) => rows.nth(i).isChecked())), [true, false, true, false]);
  await page.keyboard.press('KeyI');
  assert.equal(await panel(page).locator('.opt input').isChecked(), false);
  await page.keyboard.press('KeyL');
  assert.equal(await page.evaluate(() => window.__mockFeed.shortcutsFired()), 0);
  await page.keyboard.press('Escape');
  await panel(page).waitFor({ state: 'detached' });
  await page.keyboard.press('KeyX'); // exit Swipe Mode, stay here

  await page.locator('[data-sm="shot-button"]').first().click();
  await panel(page).waitFor();
  await page.keyboard.press('Digit2');
  await page.keyboard.press('Digit4');
  assert.equal(await count(), '2');
  await page.keyboard.press('Escape');
  await panel(page).waitFor({ state: 'detached' });
});

test('shot: R removes a reply and the next one takes its place; U brings it back; photos show', async (t) => {
  const page = await postPage(t);
  await start(page);
  await waitAuthor(page, 'Marcus Webb');
  await page.keyboard.press('KeyP');
  const rows = page.locator('[data-sm="shot-reply"]');
  await rows.first().waitFor({ timeout: 5000 });
  const names = () => rows.evaluateAll((els) => els.map((e) => e.querySelector('.n').firstChild.textContent.trim()));
  const picked = () => rows.evaluateAll((els) => els.filter((e) => e.querySelector('input').checked).map((e) => e.querySelector('.n').firstChild.textContent.trim()));
  const current = () => page.locator('[data-sm="shot-reply"].is-cur .n').evaluate((e) => e.firstChild.textContent.trim());

  assert.equal(await page.locator('[data-sm="shot-reply"]', { hasText: 'Noor Aziz' }).locator('[data-sm="shot-reply-photo"] img').count(), 1);

  await page.keyboard.press('Digit1'); // pick Ivy
  await page.keyboard.press('KeyR'); // remove Ivy (highlighted)
  assert.deepEqual(await names(), ['Sam Patel', 'Noor Aziz', 'Leo Grant']);
  assert.deepEqual(await picked(), ['Sam Patel'], 'the next reply took the removed one\'s place');
  assert.equal(await current(), 'Sam Patel');
  assert.match(await panel(page).innerText(), /1 of 3 picked/);

  await page.keyboard.press('KeyU');
  assert.deepEqual(await names(), ['Ivy Holt', 'Sam Patel', 'Noor Aziz', 'Leo Grant']);
  assert.deepEqual(await picked(), ['Ivy Holt']);

  await page.keyboard.press('Shift+Slash');
  await page.locator('[data-sm="shot-help"]').waitFor();
  assert.match(await page.locator('[data-sm="shot-help"]').innerText(), /Remove the reply/);
});

test('shot: a long post cut off on the timeline is drawn in full, from its own page', async (t) => {
  const env = await launch({ path: 'x/' });
  t.after(() => env.close());
  const { page, context, port } = env;
  const id = await page.evaluate(() => window.__mockFeed.idOfAuthor('Priya Nair'));
  const sw = context.serviceWorkers()[0] || (await context.waitForEvent('serviceworker'));
  const res = await sw.evaluate(([url, pid]) => self.readThreadInTab(url, pid, 0, null), [`http://localhost:${port}/x/?view=status&post=0`, id]);
  assert.equal(res.status, 'ok');
  assert.match(res.main.text, /deleting alerts nobody could explain/);
  assert.equal(res.main.continues, false);
});

// The folder is normally picked in Chrome's folder dialog, which tests can't drive. The browser's
// private test storage (OPFS) gives a real folder handle that needs no permission prompt.
async function useTestFolder(context) {
  const sw = context.serviceWorkers()[0] || (await context.waitForEvent('serviceworker'));
  await sw.evaluate(async () => self.SwipeMode.folderStore.setFolder(await navigator.storage.getDirectory()));
  return sw;
}

test('shot: Enter saves into the folder and goes back to the card', async (t) => {
  const env = await launch({ path: 'x/', query: 'view=status', scenario: 'default' });
  t.after(() => env.close());
  const { page, context } = env;
  const sw = await useTestFolder(context);
  await start(page);
  await waitAuthor(page, 'Marcus Webb');
  await page.keyboard.press('KeyP');
  await page.locator('[data-sm="shot-reply"]').first().waitFor({ timeout: 5000 });
  await page.keyboard.press('Digit1');
  await page.keyboard.press('Enter');
  await panel(page).waitFor({ state: 'detached', timeout: 10000 });
  await page.locator('[data-sm="overlay"]', { hasText: /Saved tweet-marcuswebb-\d+-1-reply\.png/ }).waitFor({ timeout: 5000 });
  assert.equal(await page.locator('[data-sm="overlay"]').getAttribute('data-mode'), 'main');
  const files = await sw.evaluate(async () => {
    const out = [];
    for await (const [name, h] of (await navigator.storage.getDirectory()).entries()) out.push([name, (await h.getFile()).size]);
    return out;
  });
  assert.equal(files.length, 1);
  assert.match(files[0][0], /^tweet-marcuswebb-\d+-1-reply\.png$/);
  assert.ok(files[0][1] > 10000, 'a real PNG was written');
});

test('shot: S saves and keeps the panel open', async (t) => {
  const env = await launch({ path: 'x/', query: 'view=status', scenario: 'default' });
  t.after(() => env.close());
  const { page, context } = env;
  await useTestFolder(context);
  await start(page);
  await waitAuthor(page, 'Marcus Webb');
  await page.keyboard.press('KeyP');
  await panel(page).waitFor();
  await page.keyboard.press('KeyS');
  await page.locator('[data-sm="shot-msg"]', { hasText: /Saved tweet-marcuswebb/ }).waitFor({ timeout: 10000 });
  assert.equal(await panel(page).count(), 1);
});

test('shot: M loads more replies on the post page, under Swipe Mode', async (t) => {
  const page = await postPage(t);
  await start(page);
  await waitAuthor(page, 'Marcus Webb');
  await page.keyboard.press('KeyP');
  const rows = page.locator('[data-sm="shot-reply"]');
  await rows.first().waitFor({ timeout: 5000 });
  assert.equal(await rows.count(), 4);
  await page.keyboard.press('KeyM');
  await page.locator('[data-sm="shot-reply"]', { hasText: 'Ken Ito' }).waitFor({ timeout: 5000 });
  assert.equal(await rows.count(), 6);
  await page.locator('[data-sm="shot-msg"]', { hasText: /2 more replies loaded/ }).waitFor({ timeout: 5000 });
});

test('shot: the folder window is keyboard first', async (t) => {
  const env = await launch({ path: 'x/' });
  t.after(() => env.close());
  const { context } = env;
  const sw = context.serviceWorkers()[0] || (await context.waitForEvent('serviceworker'));
  const page = await context.newPage();
  await page.goto(sw.url().replace('src/background/service-worker.js', 'shot/folder.html?mode=choose'));
  await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'choose');
  assert.match(await page.innerText('body'), /Enter/);
});

test("shot: posts under X's Discover more are not offered as replies", async (t) => {
  const page = await postPage(t);
  await page.locator('[data-sm="shot-button"]').first().click();
  const rows = page.locator('[data-sm="shot-reply"]');
  await rows.first().waitFor({ timeout: 5000 });
  await page.waitForTimeout(600);
  const text = await page.locator('[data-sm="shot-replies"]').innerText();
  assert.equal(await rows.count(), 4);
  assert.doesNotMatch(text, /Sofia Rossi|Kwame Mensah/);
});

test("shot: a reply X cut off is marked, and its full text comes from its own page", async (t) => {
  const page = await postPage(t);
  await page.locator('[data-sm="shot-button"]').first().click();
  const leo = page.locator('[data-sm="shot-reply"]', { hasText: 'Leo Grant' });
  await leo.waitFor({ timeout: 5000 });
  assert.match(await leo.locator('[data-sm="shot-cut"]').innerText(), /cut this reply off/);

  const { context } = { context: page.context() };
  const sw = context.serviceWorkers()[0] || (await context.waitForEvent('serviceworker'));
  const id = await leo.getAttribute('data-id');
  const port = new URL(page.url()).port;
  const res = await sw.evaluate(([url, pid]) => self.readThreadInTab(url, pid, 0, null, true), [`http://localhost:${port}/x/?view=status&id=${id}`, id]);
  assert.equal(res.status, 'ok');
  assert.match(res.main.text, /Curious how you defined it.$/);
  assert.deepEqual(res.replies, []);
});
