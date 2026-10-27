// Records the tutorial footage: the real extension driven on the mock feed, plus a cue file
// with the time of every step. Output: videos/swipe-mode-tutorial/assets/demo.webm + demo-cues.json
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { startServer } = require('./serve.js');
const { build } = require('./build-test-extension.js');

const OUT_DIR = path.join(__dirname, '..', 'videos', 'swipe-mode-tutorial', 'assets');
const RAW_DIR = path.join(__dirname, '.recordings');

// A visible cursor, since headless recordings don't draw the real one.
function cursorScript() {
  addEventListener('DOMContentLoaded', () => {
    const c = document.createElement('div');
    c.id = 'demo-cursor';
    c.innerHTML =
      '<svg width="34" height="34" viewBox="0 0 24 24"><path d="M4 2l15 10-6.5 1.5L9 20z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg><span></span>';
    c.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;transform:translate(-200px,-200px);transition:transform .45s cubic-bezier(.2,.8,.2,1)';
    const ring = c.querySelector('span');
    ring.style.cssText = 'position:absolute;left:-14px;top:-14px;width:28px;height:28px;border-radius:50%;border:3px solid #fbbf24;opacity:0';
    document.documentElement.appendChild(c);
    addEventListener('mousemove', (e) => (c.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 2}px)`), true);
    addEventListener('mousedown', () => ring.animate([{ opacity: 1, transform: 'scale(.5)' }, { opacity: 0, transform: 'scale(2.2)' }], { duration: 500 }), true);
    window.__hideCursor = () => (c.style.display = 'none');
  });
}

(async () => {
  const ext = build();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.rmSync(RAW_DIR, { recursive: true, force: true });
  const server = await startServer(0);
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    viewport: { width: 1280, height: 720 },
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, '--force-prefers-reduced-motion=0'],
    recordVideo: { dir: RAW_DIR, size: { width: 1280, height: 720 } },
  });
  const t0 = Date.now();
  const cues = [];
  const cue = (id) => cues.push({ id, t: Math.round((Date.now() - t0) / 100) / 10 });
  const page = context.pages()[0] || (await context.newPage());
  await page.addInitScript(cursorScript);
  const wait = (ms) => page.waitForTimeout(ms);
  const key = async (k, id) => {
    if (id) cue(id);
    await page.keyboard.press(k);
  };

  await page.goto(`http://localhost:${server.port}/`);
  await page.locator('[data-sm="launcher"]').waitFor();
  cue('feed');
  await wait(1800);

  const box = await page.locator('[data-sm="launcher"]').boundingBox();
  await page.mouse.move(640, 360);
  await wait(300);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
  await wait(700);
  cue('start');
  await page.mouse.down();
  await page.mouse.up();
  await page.evaluate(() => window.__hideCursor && window.__hideCursor());
  await page.locator('[data-sm="card"]').waitFor();
  await wait(2600);

  await key('ArrowDown', 'read');
  await wait(700);
  await key('ArrowDown');
  await wait(700);
  await key('ArrowUp');
  await wait(1600);

  await key('ArrowLeft', 'skip');
  await wait(2200);
  await key('KeyU', 'undo');
  await wait(2200);

  await key('ArrowRight', 'engage');
  await wait(2600);
  await key('Escape');
  await wait(900);

  await key('KeyR', 'react-open');
  await wait(1700);
  await key('Digit2', 'react');
  await page.locator('[data-sm="author"]', { hasText: 'Marcus Webb' }).waitFor({ timeout: 15000 });
  await wait(1400);

  await key('KeyC', 'comment');
  await wait(700);
  await page.keyboard.type('Love this breakdown. The meeting stat is wild.', { delay: 45 });
  await wait(600);
  await key('Control+Enter', 'comment-post');
  await page.locator('[data-sm="author"]', { hasText: 'Elena Sorensen' }).waitFor({ timeout: 15000 });
  await wait(1400);

  await key('KeyS', 'save');
  await page.locator('[data-sm="author"]', { hasText: 'Daniel Okafor' }).waitFor({ timeout: 15000 });
  await wait(1600);

  await key('Shift+Slash', 'help');
  await wait(3200);
  await key('Escape');
  await wait(900);

  cue('swipe');
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
  await wait(2200);

  await key('Escape', 'exit');
  await page.locator('[data-sm="card"]').waitFor({ state: 'detached' });
  await wait(2200);
  cue('end');

  const video = page.video();
  await context.close();
  server.close();
  const raw = await video.path();
  fs.copyFileSync(raw, path.join(OUT_DIR, 'demo.webm'));
  fs.writeFileSync(path.join(OUT_DIR, 'demo-cues.json'), JSON.stringify(cues, null, 2));
  console.log(JSON.stringify(cues));
})();
