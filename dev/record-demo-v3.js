// Records the v3 video footage: the real extension on the mock LinkedIn and X pages, driven
// only by the keyboard, timed to the voiceover. Every phrase in videos/.../assets/v3/timeline.json
// fires its keys at the moment the phrase is spoken, so picture and voice line up by construction.
// Frames come from Chrome's screencast (sharp JPEGs with timestamps), not Playwright's low-bitrate
// recorder. Output: videos/swipe-mode-tutorial/assets/v3/{linkedin,trust,x,shot}.mp4, rec.json,
// result.png (the screenshot the extension really saved).
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const { startServer } = require('./serve.js');
const { build } = require('./build-test-extension.js');

const VIDEO_DIR = path.join(__dirname, '..', 'videos', 'swipe-mode-tutorial');
const OUT = path.join(VIDEO_DIR, 'assets', 'v3');
const FRAMES = path.join(__dirname, '.recordings', 'v3');
const VIEW = { width: 1440, height: 900 };
const SCALE = 1.5; // 2160x1350 frames, sharp enough for zooming in on the card
const timeline = JSON.parse(fs.readFileSync(path.join(OUT, 'timeline.json'), 'utf8'));
const beatById = Object.fromEntries(timeline.beats.map((b) => [b.id, b]));

const KEYS = { '↓': 'ArrowDown', '←': 'ArrowLeft', '→': 'ArrowRight', Enter: 'Enter' };
const keyOf = (label) => KEYS[label] || (/^\d$/.test(label) ? 'Digit' + label : 'Key' + label);
const sleepUntil = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms - Date.now())));

// Chrome's screencast: one JPEG per painted frame, stamped with wall-clock time.
async function screencast(page, name) {
  const dir = path.join(FRAMES, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const file = path.join(dir, String(frames.length).padStart(5, '0') + '.jpg');
    fs.writeFileSync(file, Buffer.from(data, 'base64'));
    frames.push({ file, t: metadata.timestamp });
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: VIEW.width * SCALE, maxHeight: VIEW.height * SCALE });
  return {
    async stop() {
      await cdp.send('Page.stopScreencast');
      await new Promise((r) => setTimeout(r, 300));
      return { frames, end: Date.now() / 1000 };
    },
  };
}

// Variable-rate frames to a constant 30 fps H.264 file. Returns the wall time of its first frame.
function encode(name, { frames, end }) {
  const list = path.join(FRAMES, name + '.ffconcat');
  const lines = ['ffconcat version 1.0'];
  frames.forEach((f, i) => {
    const next = i + 1 < frames.length ? frames[i + 1].t : end;
    lines.push(`file '${f.file.replace(/\\/g, '/')}'`, `duration ${Math.max(0.001, next - f.t).toFixed(4)}`);
  });
  lines.push(`file '${frames[frames.length - 1].file.replace(/\\/g, '/')}'`);
  fs.writeFileSync(list, lines.join('\n') + '\n');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-movflags', '+faststart', path.join(OUT, name + '.mp4')]);
  return frames[0].t;
}

// Runs consecutive beats on one page. Beat starts are scheduled from the first one, so waiting
// never adds up; each phrase's keys fire at (phrase start + at) seconds into the voiceover.
async function runBeats(page, ids, rec, actions) {
  let wall = Date.now();
  for (const id of ids) {
    const b = beatById[id];
    rec.beats[id] = wall / 1000;
    for (const ph of b.phrases) {
      if (!ph.keys.length) continue;
      await sleepUntil(wall + (ph.start - b.start + ph.at) * 1000);
      for (let i = 0; i < ph.keys.length; i++) {
        if (i) await page.waitForTimeout(500);
        const label = ph.keys[i];
        rec.keys.push({ beat: id, key: label, t: Date.now() / 1000 });
        if (actions[label]) await actions[label]();
        else await page.keyboard.press(keyOf(label));
      }
    }
    wall += (b.end - b.start) * 1000;
    await sleepUntil(wall);
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const ext = build();
  const server = await startServer(0);
  const base = `http://localhost:${server.port}`;
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    viewport: VIEW,
    deviceScaleFactor: SCALE,
    colorScheme: 'light',
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, '--force-prefers-reduced-motion=0', '--hide-scrollbars'],
  });
  const sw = context.serviceWorkers()[0] || (await context.waitForEvent('serviceworker'));
  // Alt+Shift+S is a browser shortcut the headless keyboard can't reach; this sends the same
  // message the shortcut does (service-worker.js toggleIn).
  const toggle = (page) => async () => {
    const url = page.url();
    await sw.evaluate(async (u) => {
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find((t) => t.url === u);
      await chrome.tabs.sendMessage(tab.id, { type: 'swipe-mode:toggle' });
    }, url);
  };
  // The screenshot folder: a named folder in the browser's private storage stands in for the one
  // you pick in Chrome's folder dialog, which a script can't drive.
  await sw.evaluate(async () => {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('Tweet screenshots', { create: true });
    await self.SwipeMode.folderStore.setFolder(dir);
  });

  // Re-recording some takes (node dev/record-demo-v3.js trust) keeps the others' timings.
  const prev = process.argv.length > 2 && fs.existsSync(path.join(OUT, 'rec.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'rec.json'), 'utf8')) : null;
  const rec = prev || { scale: SCALE, view: VIEW, recordings: {}, beats: {}, keys: [] };
  for (const name of process.argv.slice(2)) {
    const ids = (prev && prev.recordings[name] && prev.recordings[name].beats) || [];
    rec.keys = rec.keys.filter((k) => !ids.includes(k.beat));
  }
  const take = async (name, url, ids, prep) => {
    const page = await context.newPage();
    await page.goto(base + url);
    await page.locator('[data-sm="launcher"]').waitFor({ timeout: 15000 });
    if (prep) await prep(page);
    await page.waitForTimeout(800);
    const cast = await screencast(page, name);
    await page.waitForTimeout(400);
    await runBeats(page, ids, rec, { 'Alt+Shift+S': toggle(page) });
    await page.waitForTimeout(600);
    const t0 = encode(name, await cast.stop());
    rec.recordings[name] = { file: `assets/v3/${name}.mp4`, t0, beats: ids };
    await page.close();
    console.log(`${name}: ${ids.join(', ')}`);
  };
  const startNow = async (page) => {
    await toggle(page)();
    await page.locator('[data-sm="card"]').waitFor();
  };

  // The trust take: Swipe Mode waits a few seconds for LinkedIn before saying it couldn't confirm.
  // A first, unrecorded try measures that wait; the recorded try is pressed early by that much,
  // so the message lands on the phrase that announces it.
  const trustPrep = async (page) => {
    await startNow(page);
    const t = Date.now();
    await page.keyboard.press('KeyR');
    await page.waitForTimeout(500);
    await page.keyboard.press('Digit1');
    await page.locator('[data-sm="overlay"][data-mode="failure"]').waitFor({ timeout: 20000 });
    const wait = (Date.now() - t) / 1000;
    await page.keyboard.press('Escape');
    await page.locator('[data-sm="overlay"][data-mode="main"]').waitFor();
    const b = beatById['li-trust'];
    const announce = b.phrases[1].start - b.start; // "Swipe Mode tells you..."
    return { lead: Math.max(0.6, wait - announce - 0.1), wait };
  };

  const only = process.argv.slice(2);
  const want = (n) => !only.length || only.includes(n);
  if (want('linkedin')) await take('linkedin', '/', ['li-start', 'li-skip', 'li-act']);
  if (want('trust')) {
    const page = await context.newPage();
    await page.goto(base + '/?scenario=broken');
    await page.locator('[data-sm="launcher"]').waitFor({ timeout: 15000 });
    const { lead, wait } = await trustPrep(page);
    await page.waitForTimeout(600);
    const cast = await screencast(page, 'trust');
    await page.waitForTimeout(300);
    await page.keyboard.press('KeyR');
    await page.waitForTimeout(500);
    await page.keyboard.press('Digit1');
    await page.waitForTimeout(lead * 1000 - 500);
    await runBeats(page, ['li-trust'], rec, {});
    await page.waitForTimeout(600);
    rec.recordings.trust = { file: 'assets/v3/trust.mp4', t0: encode('trust', await cast.stop()), beats: ['li-trust'] };
    await page.close();
    console.log(`trust: li-trust (LinkedIn wait ${wait.toFixed(1)}s, pressed ${lead.toFixed(1)}s early)`);
  }
  if (want('x')) await take('x', '/x/', ['x']);
  if (want('shot')) await take('shot', '/x/?view=status&scenario=default', ['shot'], startNow);

  // The image the extension saved during the shot take.
  const saved = await sw.evaluate(async () => {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('Tweet screenshots');
    for await (const [name, h] of dir.entries()) {
      const buf = new Uint8Array(await (await h.getFile()).arrayBuffer());
      let bin = '';
      for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
      return { name, data: btoa(bin) };
    }
    return null;
  });
  if (saved) {
    fs.writeFileSync(path.join(OUT, 'result.png'), Buffer.from(saved.data, 'base64'));
    rec.saved = saved.name;
  }
  fs.writeFileSync(path.join(OUT, 'rec.json'), JSON.stringify(rec, null, 2));
  console.log('saved image:', saved ? saved.name : 'none');
  await context.close();
  server.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
