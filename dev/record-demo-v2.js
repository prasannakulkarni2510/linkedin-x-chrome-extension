// Records the v2 tutorial footage: the real extension on the LinkedIn and X mock feeds, a
// broken-control run, live captures of the GitHub repo, chrome://extensions and the Options page.
// Each beat is held at least as long as its voiceover line, and every keypress is logged as a cue
// so on-screen keycaps press on the exact frame.
// Output: videos/swipe-mode-tutorial/assets/v2/{linkedin,trust,x}.webm, cues.json, *.png
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { startServer } = require('./serve.js');
const { build } = require('./build-test-extension.js');

const VIDEO_DIR = path.join(__dirname, '..', 'videos', 'swipe-mode-tutorial');
const OUT = path.join(VIDEO_DIR, 'assets', 'v2');
const RAW = path.join(__dirname, '.recordings', 'v2');
const REAL_EXT = path.join(__dirname, '..', 'extension');
const REPO = 'https://github.com/prasannakulkarni2510/linkedin-x-chrome-extension';
const VIEW = { width: 1280, height: 800 };
const PAD = 1300; // breathing room after each voiceover line

// Voiceover durations (seconds) from assets/voice-v2.
const VO = {};
for (const line of fs.readFileSync(path.join(VIDEO_DIR, 'assets', 'voice-v2', 'durations.tsv'), 'utf8').trim().split('\n')) {
  const [id, d] = line.split('\t');
  VO[id] = Number(d);
}

// A visible cursor, since headless recordings don't draw the real one.
function cursorScript() {
  addEventListener('DOMContentLoaded', () => {
    const c = document.createElement('div');
    c.id = 'demo-cursor';
    c.innerHTML =
      '<svg width="34" height="34" viewBox="0 0 24 24"><path d="M4 2l15 10-6.5 1.5L9 20z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg><span></span>';
    c.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;transform:translate(-200px,-200px);transition:transform .4s cubic-bezier(.2,.8,.2,1)';
    const ring = c.querySelector('span');
    ring.style.cssText = 'position:absolute;left:-14px;top:-14px;width:28px;height:28px;border-radius:50%;border:3px solid #fbbf24;opacity:0';
    document.documentElement.appendChild(c);
    addEventListener('mousemove', (e) => (c.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 2}px)`), true);
    addEventListener('mousedown', () => ring.animate([{ opacity: 1, transform: 'scale(.5)' }, { opacity: 0, transform: 'scale(2.2)' }], { duration: 500 }), true);
    window.__cursor = (show) => (c.style.display = show ? '' : 'none');
    // Sync marker: a 5x5 square in the bottom-right corner flips black/white at every cue, so
    // dev/prep-v2-footage.js can read each cue's exact video time. The film crops it out.
    const m = document.createElement('div');
    m.id = 'demo-sync';
    m.style.cssText = 'position:fixed;right:0;bottom:0;width:5px;height:5px;z-index:2147483647;pointer-events:none;background:#000';
    document.documentElement.appendChild(m);
    let on = false;
    window.__mark = () => {
      on = !on;
      m.style.background = on ? '#fff' : '#000';
      document.documentElement.appendChild(m); // stay above anything added since
    };
  });
}

function recorder(page, name) {
  const t0 = Date.now();
  const cues = [];
  const now = () => Date.now() - t0;
  // Every cue also flips the sync marker; evaluate runs before any later input on the same page.
  const cue = (id, extra) => {
    cues.push(Object.assign({ id, t: Math.round(now() / 10) / 100 }, extra || {}));
    page.evaluate(() => window.__mark && window.__mark()).catch(() => {});
  };
  const wait = (ms) => page.waitForTimeout(ms);
  const key = async (k, label) => {
    cue('key', { key: label || k });
    await page.keyboard.press(k);
  };
  // A beat starts now and lasts at least its voiceover line plus breathing room.
  const beat = async (id, fn) => {
    const start = now();
    cue('beat', { beat: id });
    await fn();
    const min = start + VO[id] * 1000 + PAD;
    if (now() < min) await wait(min - now());
  };
  const mode = () => page.locator('[data-sm="overlay"]').getAttribute('data-mode');
  const waitMode = (m, timeout = 12000) => page.locator(`[data-sm="overlay"][data-mode="${m}"]`).waitFor({ timeout });
  const waitAuthor = (n, timeout = 12000) => page.locator('[data-sm="author"]', { hasText: n }).waitFor({ timeout });
  const cursor = (show) => page.evaluate((s) => window.__cursor && window.__cursor(s), show);
  const moveTo = async (loc, steps = 14) => {
    const b = await loc.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps });
    return b;
  };
  return { name, cues, cue, wait, key, beat, mode, waitMode, waitAuthor, cursor, moveTo, now };
}

async function startSwipe(r, page) {
  await r.cursor(true);
  await page.mouse.move(640, 420);
  await r.wait(300);
  await r.moveTo(page.locator('[data-sm="launcher"]'));
  await r.wait(500);
  r.cue('click', { what: 'launcher' });
  await page.mouse.down();
  await page.mouse.up();
  await page.locator('[data-sm="card"]').waitFor();
  await r.cursor(false);
}

async function linkedin(page, port) {
  const r = recorder(page, 'linkedin');
  await page.goto(`http://localhost:${port}/`);
  await page.locator('[data-sm="launcher"]').waitFor();
  await r.wait(900);

  await r.beat('03-start', async () => {
    await r.wait(600);
    await startSwipe(r, page);
  });

  await r.beat('04-read', async () => {
    await r.wait(400);
    await r.key('ArrowDown', '↓');
    await r.wait(650);
    await r.key('ArrowDown', '↓');
    await r.wait(650);
    await r.key('ArrowUp', '↑');
    await r.wait(1500);
    await r.key('ArrowLeft', '←');
    await r.waitAuthor('Marcus Webb');
    await r.wait(1100);
    await r.key('KeyU', 'U');
    await r.waitAuthor('Priya Nair');
    await r.wait(1100);
    await r.key('ArrowLeft', '←');
    await r.waitAuthor('Marcus Webb');
    await r.wait(800);
    await r.key('ArrowLeft', '←');
    await r.waitAuthor('Elena Sorensen'); // the promoted post is passed over
    r.cue('promoted-skipped');
  });

  await r.beat('05-engage', async () => {
    await r.wait(500);
    await r.key('ArrowRight', '→');
    await r.waitMode('engage');
    await r.wait(VO['05-engage'] * 1000 - 600);
    await r.key('Escape', 'Esc');
  });

  await r.beat('06-react', async () => {
    await r.wait(400);
    await r.key('KeyR', 'R');
    await r.waitMode('reaction');
    await r.wait(700);
    await r.key('Digit2', '2');
    await r.waitMode('grace');
    r.cue('confirmed');
    await r.waitAuthor('Daniel Okafor');
    await r.wait(900);
    await r.key('KeyR', 'R');
    await r.waitMode('reaction');
    await r.wait(500);
    await r.key('Digit1', '1');
    await r.waitMode('grace');
    await r.wait(500);
    await r.key('Escape', 'Esc');
    r.cue('stayed');
  });

  await r.beat('07-comment', async () => {
    await r.wait(300);
    await r.key('KeyC', 'C');
    await page.locator('[data-sm="composer-input"]').waitFor();
    r.cue('typing');
    await page.keyboard.type('Congratulations on the round!', { delay: 35 });
    await r.wait(250);
    await r.key('Control+Enter', 'Ctrl+Enter');
    await r.waitAuthor('Hana Kobayashi');
    await r.wait(500);
    await r.key('KeyS', 'S');
    await r.waitAuthor('Tom Alvarez');
    await r.wait(500);
    await r.key('ArrowRight', '→');
    await r.waitMode('engage');
    await r.wait(400);
    await r.key('Digit3', '3');
    await r.waitAuthor('Amara Chen');
    await r.wait(500);
    await r.key('ArrowRight', '→');
    await r.waitMode('engage');
    await r.wait(400);
    await r.key('Digit4', '4');
    await r.waitMode('native');
    r.cue('native');
    await r.cursor(true);
    await r.wait(500);
    await r.moveTo(page.locator('.share-actions__primary-action'));
    await r.wait(300);
    r.cue('click', { what: 'post' });
    await page.mouse.down();
    await page.mouse.up();
    await r.cursor(false);
    await r.waitAuthor('Rafael Duarte');
  });
  await r.wait(400);
  return r;
}

async function trust(page, port) {
  const r = recorder(page, 'trust');
  await page.goto(`http://localhost:${port}/?scenario=broken`);
  await page.locator('[data-sm="launcher"]').waitFor();
  await r.wait(600);
  r.cue('click', { what: 'launcher' });
  await page.locator('[data-sm="launcher"]').click();
  await page.locator('[data-sm="card"]').waitFor();
  await r.wait(800);
  await r.beat('08-trust', async () => {
    await r.key('KeyR', 'R');
    await r.waitMode('reaction');
    await r.wait(300);
    await r.key('Digit2', '2');
    await r.waitMode('failure');
    r.cue('failure');
    await r.wait(2600);
    await r.key('Escape', 'Esc');
    await r.wait(500);
    await r.key('KeyS', 'S');
    await r.waitMode('grace');
    await r.key('KeyS', 'S'); // straight away: the pacing guard holds it
    r.cue('pacing');
    await r.wait(1800);
  });
  await r.wait(300);
  return r;
}

async function x(page, port) {
  const r = recorder(page, 'x');
  await page.goto(`http://localhost:${port}/x/`);
  await page.locator('[data-sm="launcher"]').waitFor();
  await r.wait(700);

  await r.beat('09-x', async () => {
    await startSwipe(r, page);
    await r.wait(900);
    await r.key('KeyR', 'R');
    await r.waitAuthor('Marcus Webb');
    await r.wait(400);
    await r.key('KeyC', 'C');
    await page.locator('[data-sm="composer-input"]').waitFor();
    r.cue('typing');
    await page.keyboard.type('Love this breakdown.', { delay: 35 });
    await r.wait(200);
    await r.key('Control+Enter', 'Ctrl+Enter');
    await r.waitAuthor('Elena Sorensen');
    await r.wait(400);
    await r.key('KeyS', 'S');
    await r.waitAuthor('Daniel Okafor');
    await r.wait(400);
    await r.key('ArrowRight', '→');
    await r.waitMode('engage');
    await r.wait(500);
    await r.key('Digit4', '4');
    await r.waitMode('native');
    r.cue('native');
    await r.cursor(true);
    await r.moveTo(page.locator('[data-testid="tweetTextarea_0"]'), 10);
    await page.mouse.down();
    await page.mouse.up();
    await page.keyboard.type('Huge milestone.', { delay: 35 });
    await r.moveTo(page.locator('[data-testid="tweetButton"]'), 10);
    r.cue('click', { what: 'post' });
    await page.mouse.down();
    await page.mouse.up();
    await r.cursor(false);
    await r.waitAuthor('Hana Kobayashi');
  });

  await r.beat('10-swipe', async () => {
    await r.wait(300);
    r.cue('trackpad');
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          const card = document.getElementById('swipe-mode-root').shadowRoot.querySelector('[data-sm="card"]');
          const deltas = [...Array(8).fill(30), ...Array.from({ length: 40 }, (_, k) => Math.max(1, Math.round(30 * Math.pow(0.9, k))))];
          let i = 0;
          (function frame() {
            if (i >= deltas.length) return resolve();
            card.dispatchEvent(new WheelEvent('wheel', { deltaX: deltas[i++], bubbles: true, composed: true, cancelable: true }));
            requestAnimationFrame(frame);
          })();
        })
    );
    await r.waitAuthor('Tom Alvarez');
    await r.wait(700);
    await r.cursor(true);
    const grip = page.locator('[data-sm="grip"].sm-grip--top');
    const b = await r.moveTo(grip);
    await r.wait(350);
    r.cue('drag');
    const y = b.y + b.height / 2;
    const x0 = b.x + b.width / 2;
    await page.mouse.down();
    await page.mouse.move(x0 - 120, y + 6, { steps: 10 });
    await page.mouse.move(x0 - 330, y + 22, { steps: 12 });
    await page.mouse.up();
    await r.waitAuthor('Amara Chen');
    await r.wait(500);
    const head = page.locator('[data-sm="card"] .sm-author');
    await r.moveTo(head, 8);
    r.cue('longpress');
    await page.mouse.down();
    await r.waitMode('engage', 3000);
    await page.mouse.up();
    await r.wait(900);
    await r.cursor(false);
    await r.key('Escape', 'Esc');
  });

  await r.beat('11-exit', async () => {
    await r.wait(300);
    await r.key('Shift+Slash', '?');
    await r.waitMode('help');
    await r.wait(2200);
    await r.key('Escape', 'Esc');
    await r.wait(1500);
    await r.key('Escape', 'Esc');
    await page.locator('[data-sm="card"]').waitFor({ state: 'detached' });
    r.cue('exited');
  });
  await r.wait(400);
  return r;
}

async function stills(port) {
  const shots = {};
  // Live GitHub repository page, then its Code menu with Download ZIP.
  const browser = await chromium.launch();
  const gh = await browser.newPage({ viewport: VIEW, colorScheme: 'light' });
  await gh.goto(REPO, { waitUntil: 'networkidle', timeout: 60000 });
  await gh.screenshot({ path: path.join(OUT, 'github-repo.png') });
  const code = gh.getByRole('button', { name: /^Code/ }).first();
  await code.click();
  await gh.getByText('Download ZIP').first().waitFor({ timeout: 10000 });
  await gh.screenshot({ path: path.join(OUT, 'github-code.png') });
  shots.github = true;
  await browser.close();

  // chrome://extensions with the real extension folder loaded, and its Options page.
  const ctx = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    viewport: VIEW,
    colorScheme: 'light',
    args: [`--disable-extensions-except=${REAL_EXT}`, `--load-extension=${REAL_EXT}`],
  });
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker');
  const extId = new URL(sw.url()).host;
  const ext = ctx.pages()[0] || (await ctx.newPage());
  await ext.goto('chrome://extensions');
  await ext.waitForTimeout(800);
  const dev = () =>
    ext.evaluateHandle(() =>
      document.querySelector('extensions-manager').shadowRoot.querySelector('extensions-toolbar').shadowRoot.querySelector('#devMode')
    );
  const on = await ext.evaluate((el) => el.checked, await dev());
  if (on) await (await dev()).click(); // start from "off" so the step is visible
  await ext.waitForTimeout(400);
  await ext.screenshot({ path: path.join(OUT, 'ext-off.png') });
  await (await dev()).click();
  await ext.waitForTimeout(700);
  await ext.screenshot({ path: path.join(OUT, 'ext-on.png') });
  const opts = await ctx.newPage();
  await opts.goto(`chrome-extension://${extId}/options/options.html`);
  await opts.waitForTimeout(600);
  await opts.screenshot({ path: path.join(OUT, 'options.png'), fullPage: true });
  shots.extensions = true;
  await ctx.close();
  return shots;
}

(async () => {
  const ext = build();
  fs.mkdirSync(OUT, { recursive: true });
  fs.rmSync(RAW, { recursive: true, force: true });
  const server = await startServer(0);
  const result = {};
  try {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: true,
      viewport: VIEW,
      colorScheme: 'light',
      args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, '--force-prefers-reduced-motion=0'],
      recordVideo: { dir: RAW, size: VIEW },
    });
    await context.addInitScript(cursorScript);
    for (const [name, fn] of [['linkedin', linkedin], ['trust', trust], ['x', x]]) {
      const page = await context.newPage();
      const r = await fn(page, server.port);
      const video = page.video();
      await page.close();
      fs.copyFileSync(await video.path(), path.join(OUT, name + '.webm'));
      result[name] = { cues: r.cues, length: r.now() / 1000 };
      console.log(`${name}: ${(r.now() / 1000).toFixed(1)}s, ${r.cues.length} cues`);
    }
    await context.close();
    result.stills = await stills(server.port);
  } finally {
    server.close();
  }
  fs.writeFileSync(path.join(OUT, 'cues.json'), JSON.stringify(result, null, 2));
  console.log('Wrote ' + OUT);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
