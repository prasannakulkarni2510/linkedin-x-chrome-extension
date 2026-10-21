// End-to-end: real extension in Chromium against the mock feed (dev/mock-feed).
// Run with `npm run e2e`.
const test = require('node:test');
const assert = require('node:assert/strict');
const { launch, start, waitAuthor, authorText, mockState, mode } = require('./helpers.js');

async function withFeed(t, opts) {
  const env = await launch(opts);
  t.after(() => env.close());
  return env.page;
}

test('launcher appears on a page with posts and LinkedIn stays usable', async (t) => {
  const page = await withFeed(t);
  assert.equal(await page.locator('[data-sm="launcher"]').isVisible(), true);
  assert.equal(await page.locator('[data-sm="card"]').count(), 0);
});

test('starting shows the first visible post in a focused card', async (t) => {
  const page = await withFeed(t);
  await start(page);
  await waitAuthor(page, 'Priya Nair');
  assert.equal(await mode(page), 'main');
});

test('long posts show their full text after the native see-more is expanded', async (t) => {
  const page = await withFeed(t);
  await start(page);
  await page.locator('[data-sm="text"]', { hasText: 'What is the one alert your team would delete' }).waitFor({ timeout: 5000 });
});

test('ArrowLeft skips and U brings the skipped post back', async (t) => {
  const page = await withFeed(t);
  await start(page);
  await page.keyboard.press('ArrowLeft');
  await waitAuthor(page, 'Marcus Webb');
  await page.keyboard.press('KeyU');
  await waitAuthor(page, 'Priya Nair');
});

test('promoted posts are left out of the queue by default', async (t) => {
  const page = await withFeed(t);
  await start(page);
  await page.keyboard.press('ArrowLeft');
  await waitAuthor(page, 'Marcus Webb');
  await page.keyboard.press('ArrowLeft');
  await waitAuthor(page, 'Elena Sorensen');
});

test('ArrowRight opens the engage menu and performs nothing', async (t) => {
  const page = await withFeed(t);
  await start(page);
  await page.keyboard.press('ArrowRight');
  await page.locator('[data-sm="engage-menu"]').waitFor();
  assert.equal(await mode(page), 'engage');
  const s = await mockState(page, 'Priya Nair');
  assert.equal(s.reaction, null);
  assert.deepEqual(s.comments, []);
});

test('R then 2 reacts Celebrate on the native post, then advances', async (t) => {
  const page = await withFeed(t);
  await start(page);
  await page.keyboard.press('KeyR');
  await page.locator('[data-sm="reaction-menu"]').waitFor();
  assert.doesNotMatch(await page.locator('[data-sm="reaction-menu"]').innerText(), /\bnull\b/);
  await page.keyboard.press('Digit2');
  await waitAuthor(page, 'Marcus Webb', 10000);
  assert.equal((await mockState(page, 'Priya Nair')).reaction, 'celebrate');
});

test('Escape during the grace window keeps the post for a second action', async (t) => {
  const page = await withFeed(t);
  await start(page);
  await page.keyboard.press('KeyR');
  await page.keyboard.press('Digit1');
  await page.locator('[data-sm="overlay"][data-mode="grace"]').waitFor({ timeout: 8000 });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(2200);
  assert.equal(await authorText(page), 'Priya Nair');
  assert.equal((await mockState(page, 'Priya Nair')).reaction, 'like');
});

test('a comment written in the card is posted through the native comment box', async (t) => {
  const page = await withFeed(t);
  await start(page);
  await page.keyboard.press('KeyC');
  await page.locator('[data-sm="composer-input"]').waitFor();
  await page.keyboard.type('Great point about runbooks');
  await page.keyboard.press('Control+Enter');
  await waitAuthor(page, 'Marcus Webb', 12000);
  assert.deepEqual((await mockState(page, 'Priya Nair')).comments, ['Great point about runbooks']);
});

test('typing a comment never triggers shortcuts', async (t) => {
  const page = await withFeed(t);
  await start(page);
  await page.keyboard.press('KeyC');
  await page.locator('[data-sm="composer-input"]').waitFor();
  await page.keyboard.type('Really nice summary, Priya');
  assert.equal(await mode(page), 'comment');
  assert.equal(await page.locator('[data-sm="composer-input"]').inputValue(), 'Really nice summary, Priya');
  assert.equal(await authorText(page), 'Priya Nair');
});

test('S saves the post through the native control menu', async (t) => {
  const page = await withFeed(t);
  await start(page);
  await page.keyboard.press('KeyS');
  await waitAuthor(page, 'Marcus Webb', 10000);
  assert.equal((await mockState(page, 'Priya Nair')).saved, true);
});

test('a broken native control shows failure and never reports success', async (t) => {
  const page = await withFeed(t, { scenario: 'broken' });
  await start(page);
  await page.keyboard.press('KeyR');
  await page.keyboard.press('Digit2');
  await page.locator('[data-sm="failure"]').waitFor({ timeout: 8000 });
  assert.equal(await mode(page), 'failure');
  assert.equal((await mockState(page, 'Priya Nair')).reaction, null);
  await page.keyboard.press('Escape');
  assert.equal(await mode(page), 'main');
  assert.equal(await authorText(page), 'Priya Nair');
});

test('repost with thoughts hands over to the native composer and resumes after posting', async (t) => {
  const page = await withFeed(t);
  await start(page);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Digit4');
  await page.locator('[data-sm="overlay"][data-mode="native"]').waitFor({ timeout: 8000 });
  await page.locator('.share-actions__primary-action').click();
  await waitAuthor(page, 'Marcus Webb', 12000);
});

test('help overlay lists shortcuts for the current state', async (t) => {
  const page = await withFeed(t);
  await start(page);
  await page.keyboard.press('Shift+Slash');
  const help = page.locator('[data-sm="help"]');
  await help.waitFor();
  const text = await help.innerText();
  assert.match(text, /Skip this post/);
  assert.match(text, /Undo the last skip/);
  assert.doesNotMatch(text, /\[object/);
  await page.keyboard.press('Escape');
  assert.equal(await mode(page), 'main');
});

test('a horizontal trackpad swipe over the card skips the post', async (t) => {
  const page = await withFeed(t);
  await start(page);
  const card = await page.locator('[data-sm="card"]').boundingBox();
  await page.mouse.move(card.x + card.width / 2, card.y + card.height / 2);
  for (let i = 0; i < 6; i++) await page.mouse.wheel(40, 0);
  await waitAuthor(page, 'Marcus Webb');
});

test('one swipe with its momentum tail skips exactly one post', async (t) => {
  const page = await withFeed(t);
  await start(page);
  // Trackpads send a steady stream with a decaying tail. Generate it inside the page so the
  // test runner's scheduling can't split it into two gestures.
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        const card = document.getElementById('swipe-mode-root').shadowRoot.querySelector('[data-sm="card"]');
        const deltas = [...Array(8).fill(30), ...Array.from({ length: 50 }, (_, k) => Math.max(1, Math.round(30 * Math.pow(0.92, k))))];
        let i = 0;
        (function frame() {
          if (i >= deltas.length) return resolve();
          card.dispatchEvent(new WheelEvent('wheel', { deltaX: deltas[i++], bubbles: true, composed: true, cancelable: true }));
          requestAnimationFrame(frame);
        })();
      })
  );
  await waitAuthor(page, 'Marcus Webb');
  await page.waitForTimeout(400);
  assert.equal(await authorText(page), 'Marcus Webb');
});

test('Escape exits and restores the original scroll position', async (t) => {
  const page = await withFeed(t);
  await page.evaluate(() => window.scrollTo(0, 700));
  await page.waitForTimeout(200);
  const before = await page.evaluate(() => window.scrollY);
  await start(page);
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(250);
  }
  await page.keyboard.press('Escape');
  await page.locator('[data-sm="card"]').waitFor({ state: 'detached' });
  const after = await page.evaluate(() => window.scrollY);
  assert.ok(Math.abs(after - before) <= 40, `scroll ${before} -> ${after}`);
});

test('when no post can be read, it says so and offers a layout report instead of "No more posts"', async (t) => {
  const page = await withFeed(t, { scenario: 'unreadable' });
  await page.locator('[data-sm="launcher"]').click();
  const end = page.locator('[data-sm="end"]');
  await end.waitFor({ timeout: 15000 });
  assert.match(await end.innerText(), /couldn't read the posts/i);
  assert.doesNotMatch(await end.innerText(), /No more posts found/);
  await page.locator('[data-sm="copy-report"]').waitFor();
});

test('queue refills from infinite scroll and ends with a no-more-posts state', async (t) => {
  const page = await withFeed(t, { scenario: 'short' });
  await start(page);
  const end = page.locator('[data-sm="end"]');
  for (let i = 0; i < 40 && !(await end.isVisible()); i++) {
    if ((await mode(page)) === 'main') await page.keyboard.press('KeyN');
    await page.waitForTimeout(350);
  }
  await end.waitFor({ timeout: 15000 });
  assert.match(await end.innerText(), /No more posts found/);
  await page.keyboard.press('Escape');
  await page.locator('[data-sm="card"]').waitFor({ state: 'detached' });
});

test('dragging the grip handle with a mouse swipes and never selects text', async (t) => {
  const page = await withFeed(t);
  await start(page);
  for (const sel of ['[data-sm="grip"].sm-grip--top', '[data-sm="grip"].sm-grip--row']) {
    const box = await page.locator(sel).boundingBox();
    const y = box.y + box.height / 2;
    const x = box.x + box.width / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    // Wander vertically first, as a hand does: a handle still swipes.
    await page.mouse.move(x - 4, y + 8, { steps: 2 });
    await page.mouse.move(x - 260, y + 30, { steps: 12 });
    await page.mouse.up();
    const selected = await page.evaluate(() => {
      const root = document.getElementById('swipe-mode-root').shadowRoot;
      return String((root.getSelection && root.getSelection()) || '') + String(document.getSelection());
    });
    assert.equal(selected, '');
    if (sel.endsWith('--top')) await waitAuthor(page, 'Marcus Webb');
    else await waitAuthor(page, 'Elena Sorensen');
  }
});

test('failure and help dialogs sit on top of the card, not behind it', async (t) => {
  const page = await withFeed(t, { scenario: 'broken' });
  await start(page);
  const onTop = (sel) =>
    page.evaluate((s) => {
      const root = document.getElementById('swipe-mode-root').shadowRoot;
      const el = root.querySelector(s);
      const r = el.getBoundingClientRect();
      const hit = root.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!hit && el.contains(hit);
    }, sel);
  await page.keyboard.press('KeyR');
  await page.keyboard.press('Digit2');
  await page.locator('[data-sm="failure"]').waitFor({ timeout: 8000 });
  assert.equal(await onTop('[data-sm="failure"]'), true);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Shift+Slash');
  await page.locator('[data-sm="help"]').waitFor();
  assert.equal(await onTop('[data-sm="help"]'), true);
});
