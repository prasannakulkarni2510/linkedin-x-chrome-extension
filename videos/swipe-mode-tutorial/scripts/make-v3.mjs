// Builds the v3 film from assets/v3/timeline.json (voice, one entry per subtitle phrase) and
// assets/v3/rec.json (when each take started and each key was pressed). Every scene, subtitle and
// keycap is placed from those two files, so picture, keys and voice stay in sync.
// Writes index.html (v2's root is kept in archive/index.v2.html) and compositions/v3/*.html.
// Needs ffmpeg on PATH (music bed).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const A = (p) => path.join(ROOT, p);
const T = JSON.parse(fs.readFileSync(A('assets/v3/timeline.json'), 'utf8'));
const REC = JSON.parse(fs.readFileSync(A('assets/v3/rec.json'), 'utf8'));
const B = Object.fromEntries(T.beats.map((b) => [b.id, b]));
const r2 = (n) => Math.round(n * 100) / 100;
const END_HOLD = 2.8;
const D = r2(T.duration + END_HOLD);
fs.mkdirSync(A('compositions/v3'), { recursive: true });

// --- design ----------------------------------------------------------------------------------
// Warm paper, ink, the extension's teal, amber only for key presses. One motion personality
// (calm, polished): rise-and-fade entrances on power3.out, faster power2.in exits, the hero
// first and supporting elements staggered within ~0.3s, and soft light drifting behind.
const C = { paper: '#f4f1ea', ink: '#14181f', muted: '#5b6470', teal: '#0f766e', amber: '#f5b83d', line: '#e3ddd1' };
const FONT = `"Montserrat", sans-serif`;
const MONO = `"JetBrains Mono", monospace`;
const IN = 'power3.out';
const OUT = 'power2.in';

// Marks reused from v2: the Swipe Mode icon and the LinkedIn and X logos.
const v2hook = fs.readFileSync(A('compositions/v2/01-hook.html'), 'utf8').replace(/ data-hf-id="[^"]*"/g, '');
const ICON = v2hook.match(/<div id="v2-hook-icon" class="icon">(<svg[\s\S]*?<\/svg>)<\/div>/)[1];
const LI = v2hook.match(/<div id="v2-hook-li" class="site"><span>(<svg[\s\S]*?<\/svg>)<\/span>/)[1];
const XLOGO = fs
  .readFileSync(A('compositions/v2/05-x.html'), 'utf8')
  .replace(/ data-hf-id="[^"]*"/g, '')
  .match(/<svg fill="#000000" role="img" viewBox="0 0 24 24"[\s\S]*?<\/svg>/)[0];
const GH = `<svg viewBox="0 0 24 24"><path fill="${C.ink}" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`;
const MAIL = `<svg viewBox="0 0 24 24" fill="none" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M3.5 6.5 12 13l8.5-6.5"/></svg>`;
const MOUSE = `<svg viewBox="0 0 24 24" fill="none" stroke="${C.ink}" stroke-width="1.8" stroke-linecap="round"><rect x="7" y="3" width="10" height="17" rx="5"/><path d="M12 7v3"/><path d="M3 21 21 3" stroke="${C.teal}" stroke-width="2.2"/></svg>`;

// Scene shell: a sub-composition with its own paused timeline.
function scene(id, dur, css, body, script) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
  </head>
  <body>
    <template>
      <style>
  #root { position: absolute; inset: 0; overflow: hidden; font-family: ${FONT}; color: ${C.ink}; }
  ${css}
      </style>
      <div id="root" data-composition-id="${id}" data-width="1920" data-height="1080" data-duration="${dur}">
${body}
      </div>
      <script>
        const tl = gsap.timeline({ paused: true });
${script}
        window.__timelines["${id}"] = tl;
      </script>
    </template>
  </body>
</html>
`;
}

// Paper with two soft lights drifting slowly: the ambient layer under every scene.
const BG_CSS = `
  .paper { position: absolute; inset: 0; background: ${C.paper}; }
  .light { position: absolute; border-radius: 50%; filter: blur(10px); }
  .light-a { left: -320px; top: -360px; width: 1100px; height: 1100px; background: radial-gradient(circle, rgba(15,118,110,0.16) 0%, rgba(15,118,110,0) 65%); }
  .light-b { right: -360px; bottom: -420px; width: 1200px; height: 1200px; background: radial-gradient(circle, rgba(245,184,61,0.16) 0%, rgba(245,184,61,0) 65%); }`;
const bg = (p) => `        <div id="${p}-paper" class="paper"></div>
        <div id="${p}-la" class="light light-a" data-layout-allow-overflow=""></div>
        <div id="${p}-lb" class="light light-b" data-layout-allow-overflow=""></div>`;
const bgMotion = (p, dur) => `        tl.fromTo("#${p}-la", { x: 0, y: 0 }, { x: 140, y: 90, duration: ${dur}, ease: "sine.inOut" }, 0);
        tl.fromTo("#${p}-lb", { x: 0, y: 0 }, { x: -120, y: -70, duration: ${dur}, ease: "sine.inOut" }, 0);`;
const rise = (sel, t, extra = '') => `        tl.fromTo("${sel}", { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.6, ease: "${IN}"${extra} }, ${r2(t)});`;
const leave = (sel, t) => `        tl.to("${sel}", { opacity: 0, y: -16, duration: 0.3, ease: "${OUT}" }, ${r2(t)});`;

const files = {};
const hosts = [];
const host = (id, file, start, dur, track, kind) => {
  hosts.push(
    `      <div id="${id}-host" data-composition-id="${id}" data-composition-src="compositions/v3/${file}" data-start="${r2(start)}" data-duration="${r2(dur)}" data-track-index="${track}" data-track-kind="${kind}" data-width="1920" data-height="1080"></div>`
  );
};
const rel = (beat, i, s0) => r2(B[beat].phrases[i].start - s0);

// --- 1. hook: the finished image first ---------------------------------------------------------
{
  const s0 = 0;
  const dur = r2(B.title.start);
  files['hook.html'] = scene(
    'v3-hook',
    dur,
    `${BG_CSS}
  .shot { position: absolute; left: 1010px; top: 150px; width: 700px; height: 700px; border-radius: 22px; overflow: hidden; background: #fff; box-shadow: 0 40px 90px rgba(20,24,31,0.20), 0 0 0 1px rgba(20,24,31,0.06); }
  .shot img { display: block; width: 100%; height: 100%; }
  .big { position: absolute; left: 220px; font-weight: 800; font-size: 104px; line-height: 1; letter-spacing: -0.04em; white-space: nowrap; }
  .big b { color: ${C.teal}; }
  #v3-hook-l1 { top: 360px; }
  #v3-hook-l2 { top: 500px; }
  .sub { position: absolute; left: 224px; top: 660px; font: 700 26px ${MONO}; letter-spacing: 0.08em; color: ${C.muted}; }`,
    `${bg('v3-hook')}
        <div id="v3-hook-shot" class="shot"><img src="assets/v3/result.png" alt="" /></div>
        <div id="v3-hook-l1" class="big"><b>5</b> keypresses.</div>
        <div id="v3-hook-l2" class="big"><b>0</b> mouse clicks.</div>
        <div id="v3-hook-sub" class="sub">ONE SQUARE IMAGE · POST + REPLIES</div>`,
    `${bgMotion('v3-hook', dur)}
        tl.fromTo("#v3-hook-shot", { opacity: 0, y: 40, scale: 0.94, rotation: -2.5 }, { opacity: 1, y: 0, scale: 1, rotation: 0, duration: 0.9, ease: "${IN}" }, 0.05);
        tl.to("#v3-hook-shot", { scale: 1.03, duration: ${r2(dur - 0.95 - 0.42)}, ease: "none" }, 0.95);
${rise('#v3-hook-l1', rel('hook', 0, s0) + 0.15)}
${rise('#v3-hook-l2', rel('hook', 1, s0))}
${rise('#v3-hook-sub', rel('hook', 1, s0) + 0.25)}
        tl.to(["#v3-hook-l1", "#v3-hook-l2", "#v3-hook-sub"], { opacity: 0, y: -16, duration: 0.3, ease: "${OUT}", stagger: 0.04 }, ${r2(dur - 0.4)});
        tl.to("#v3-hook-shot", { opacity: 0, scale: 0.96, duration: 0.35, ease: "${OUT}" }, ${r2(dur - 0.38)});`
  );
  host('v3-hook', 'hook.html', s0, dur, 1, 'graphics');
}

// --- 2. title ---------------------------------------------------------------------------------
{
  const s0 = B.title.start;
  const dur = r2(B['li-start'].start - s0);
  files['title.html'] = scene(
    'v3-title',
    dur,
    `${BG_CSS}
  .wrap { position: absolute; left: 0; right: 0; top: 250px; display: flex; flex-direction: column; align-items: center; text-align: center; }
  .icon { width: 150px; height: 150px; }
  .icon svg { width: 100%; height: 100%; display: block; }
  h1 { margin: 34px 0 0; font-weight: 800; font-size: 150px; letter-spacing: -0.045em; line-height: 1; }
  .tag { margin-top: 34px; font-weight: 500; font-size: 44px; color: ${C.muted}; letter-spacing: -0.01em; }
  .tag b { color: ${C.ink}; font-weight: 700; }
  .sites { display: flex; gap: 18px; margin-top: 40px; }
  .site { display: flex; align-items: center; gap: 14px; padding: 14px 26px; border-radius: 999px; background: #fff; box-shadow: 0 10px 30px rgba(20,24,31,0.08), 0 0 0 1px rgba(20,24,31,0.06); font-weight: 700; font-size: 30px; }
  .site span { width: 34px; height: 34px; display: block; }
  .site svg { width: 100%; height: 100%; display: block; }`,
    `${bg('v3-title')}
        <div class="wrap">
          <div id="v3-title-icon" class="icon">${ICON}</div>
          <h1 id="v3-title-h1">Swipe Mode</h1>
          <div id="v3-title-tag" class="tag">Your feed, <b>one post at a time.</b></div>
          <div class="sites">
            <div id="v3-title-li" class="site"><span>${LI}</span>LinkedIn</div>
            <div id="v3-title-x" class="site"><span>${XLOGO}</span>X</div>
          </div>
        </div>`,
    `${bgMotion('v3-title', dur)}
        tl.fromTo("#v3-title-icon", { opacity: 0, scale: 0.6, y: 20 }, { opacity: 1, scale: 1, y: 0, duration: 0.7, ease: "back.out(1.6)" }, 0.05);
${rise('#v3-title-h1', 0.22)}
${rise('#v3-title-li', rel('title', 1, s0) + 0.3)}
${rise('#v3-title-x', rel('title', 1, s0) + 0.42)}
${rise('#v3-title-tag', rel('title', 2, s0))}
        tl.to(["#v3-title-icon", "#v3-title-h1", "#v3-title-tag", "#v3-title-li", "#v3-title-x"], { opacity: 0, y: -16, duration: 0.3, ease: "${OUT}", stagger: 0.03 }, ${r2(dur - 0.45)});`
  );
  host('v3-title', 'title.html', s0, dur, 1, 'graphics');
}

// --- 3. footage scenes: one browser window that never moves ----------------------------------
const WIN = { left: 220, top: 58, w: 1480, bar: 40, h: 925 };
const K = WIN.w / REC.view.width; // source px -> window px
const cam = (s, fx, fy) => {
  const clamp = (v, lo) => Math.min(0, Math.max(lo, v));
  return {
    s,
    x: r2(clamp(WIN.w / 2 - s * K * fx, WIN.w - s * WIN.w)),
    y: r2(clamp(WIN.h / 2 - s * K * fy, WIN.h - s * WIN.h)),
  };
};
const CARD = cam(1.08, 720, 515);
const CARD_PUSH = cam(1.12, 720, 515);
const PANEL = cam(1.34, 1100, 470);
const WIDE = cam(1.0, 720, 450);

const WIN_CSS = `
  .win { position: absolute; left: ${WIN.left}px; top: ${WIN.top}px; width: ${WIN.w}px; height: ${WIN.bar + WIN.h}px; border-radius: 18px; overflow: hidden; background: #fff; box-shadow: 0 40px 100px rgba(20,24,31,0.18), 0 0 0 1px rgba(20,24,31,0.08); }
  .bar { position: absolute; left: 0; right: 0; top: 0; height: ${WIN.bar}px; display: flex; align-items: center; gap: 9px; padding: 0 16px; background: #fbfaf7; border-bottom: 1px solid ${C.line}; }
  .dot { width: 12px; height: 12px; border-radius: 50%; background: #ddd6c8; flex: none; }
  .addr { margin-left: 14px; height: 26px; border-radius: 13px; background: #efeae0; display: flex; align-items: center; gap: 9px; padding: 0 14px; font: 600 15px ${MONO}; color: ${C.muted}; white-space: nowrap; }
  .addr span { width: 16px; height: 16px; display: block; }
  .addr svg { width: 100%; height: 100%; display: block; }
  .screen { position: absolute; left: 0; top: ${WIN.bar}px; width: ${WIN.w}px; height: ${WIN.h}px; overflow: hidden; background: #fff; }
  .cam { position: absolute; left: 0; top: 0; width: ${WIN.w}px; height: ${WIN.h}px; transform-origin: 0 0; }
  .cam video { position: absolute; left: 0; top: 0; width: ${WIN.w}px; height: ${WIN.h}px; }`;

function footage(id, rec, address, logo, beats, camScript, opts = {}) {
  const r = REC.recordings[rec];
  const s0 = B[beats[0]].start;
  const end = B[beats[beats.length - 1]].end;
  const dur = r2(end - s0);
  const mediaStart = r2(REC.beats[beats[0]] - r.t0);
  files[`${id}.html`] = scene(
    `v3-${id}`,
    dur,
    `${BG_CSS}${WIN_CSS}`,
    `${bg(`v3-${id}`)}
        <div id="v3-${id}-win" class="win">
          <div class="bar"><div class="dot"></div><div class="dot"></div><div class="dot"></div>
            <div class="addr"><span>${logo}</span>${address}</div>
          </div>
          <div class="screen">
            <div id="v3-${id}-cam" class="cam" data-layout-allow-overflow="">
              <video id="v3-${id}-video" class="clip" src="${r.file}" muted playsinline data-start="0" data-duration="${dur}" data-media-start="${mediaStart}" data-track-index="0"></video>
            </div>
          </div>
        </div>`,
    `${bgMotion(`v3-${id}`, dur)}
${opts.enter ? `        tl.fromTo("#v3-${id}-win", { opacity: 0, y: 40, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "${IN}" }, 0);` : ''}
${opts.exit ? `        tl.to("#v3-${id}-win", { opacity: 0, scale: 0.97, duration: 0.35, ease: "${OUT}" }, ${r2(dur - 0.38)});` : ''}
${camScript(dur, s0)}`
  );
  host(`v3-${id}`, `${id}.html`, s0, dur, 1, 'graphics');
  return { s0, dur };
}
const camSet = (id, c, t) => `        tl.set("#v3-${id}-cam", { scale: ${c.s}, x: ${c.x}, y: ${c.y} }, ${r2(t)});`;
const camTo = (id, c, t, d = 0.9) => `        tl.to("#v3-${id}-cam", { scale: ${c.s}, x: ${c.x}, y: ${c.y}, duration: ${d}, ease: "power2.inOut" }, ${r2(t)});`;
// A slow push in over the whole take: the camera breathes, nothing jumps.
const drift = (id) => (dur) => `${camSet(id, CARD, 0)}
        tl.to("#v3-${id}-cam", { scale: ${CARD_PUSH.s}, x: ${CARD_PUSH.x}, y: ${CARD_PUSH.y}, duration: ${dur}, ease: "none" }, 0);`;

// Key press times on the film clock.
const KEYS = REC.keys.map((k) => ({ key: k.key, beat: k.beat, t: r2(B[k.beat].start + (k.t - REC.beats[k.beat])) }));
const keyAt = (beat, key) => KEYS.find((k) => k.beat === beat && k.key === key).t;

const li = footage('linkedin', 'linkedin', 'linkedin.com/feed · demo feed', LI, ['li-start', 'li-skip', 'li-act'], drift('linkedin'), { enter: true });
footage('trust', 'trust', 'linkedin.com/feed · demo feed', LI, ['li-trust'], drift('trust'));
footage('x', 'x', 'x.com/home · demo timeline', XLOGO, ['x'], drift('x'));
footage('shot', 'shot', 'x.com/marcuswebb/status · demo post', XLOGO, ['shot'], (dur, s0) => {
  const tP = keyAt('shot', 'P') - s0;
  const tE = keyAt('shot', 'Enter') - s0;
  return `${camSet('shot', CARD, 0)}
${camTo('shot', PANEL, tP + 0.35)}
${camTo('shot', WIDE, tE + 0.15, 0.8)}`;
}, { exit: true });
const footStart = li.s0;
const footEnd = B.shot.end;

// --- 4. HUD: mouse clicks stay at 0 (top right, in the window bar) ----------------------------
{
  const dur = r2(footEnd - footStart);
  files['hud.html'] = scene(
    'v3-hud',
    dur,
    `
  .hud { position: absolute; left: ${WIN.left + WIN.w - 250}px; top: ${WIN.top + 7}px; width: 234px; height: 26px; border-radius: 13px; background: #fff; box-shadow: 0 0 0 1px ${C.line}; display: flex; align-items: center; gap: 9px; padding: 0 12px; font: 600 15px ${MONO}; color: ${C.muted}; white-space: nowrap; }
  .hud span { width: 18px; height: 18px; display: block; flex: none; }
  .hud svg { width: 100%; height: 100%; display: block; }
  .hud b { margin-left: auto; color: ${C.teal}; font-size: 17px; }`,
    `        <div id="v3-hud-pill" class="hud"><span>${MOUSE}</span>mouse clicks<b>0</b></div>`,
    `        tl.fromTo("#v3-hud-pill", { opacity: 0, x: 12 }, { opacity: 1, x: 0, duration: 0.5, ease: "${IN}" }, 0.6);
        tl.to("#v3-hud-pill", { opacity: 0, duration: 0.3, ease: "${OUT}" }, ${r2(dur - 0.38)});`
  );
  host('v3-hud', 'hud.html', footStart, dur, 2, 'graphics');
}

// --- 5. keycaps: each press pops above the subtitle, on the frame it happened -------------------
{
  const dur = r2(footEnd - footStart);
  // Presses close together (R then 2) share one row.
  const groups = [];
  for (const k of KEYS) {
    const g = groups[groups.length - 1];
    if (g && k.t - g.keys[g.keys.length - 1].t < 0.9) g.keys.push(k);
    else groups.push({ keys: [k] });
  }
  const label = (k) => (k === 'Alt+Shift+S' ? ['Alt', 'Shift', 'S'] : [k]);
  let body = '';
  let js = '';
  groups.forEach((g, i) => {
    const caps = g.keys.flatMap((k, j) => label(k.key).map((l, n) => ({ l, t: k.t, id: `v3-keys-${i}-${j}-${n}` })));
    body += `        <div id="v3-keys-g${i}" class="row">${caps.map((c) => `<div id="${c.id}" class="cap${c.l.length > 2 ? ' wide' : ''}">${c.l}</div>`).join('<span class="plus">+</span>'.repeat(0))}</div>\n`;
    const t0 = r2(g.keys[0].t - footStart);
    // Gone before the next row arrives, so two rows never share the spot.
    const nextAt = groups[i + 1] ? groups[i + 1].keys[0].t - footStart - 0.4 : Infinity;
    const tEnd = r2(Math.min(g.keys[g.keys.length - 1].t - footStart + 1.25, nextAt));
    js += `        tl.fromTo("#v3-keys-g${i}", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.22, ease: "${IN}" }, ${r2(Math.max(0, t0 - 0.12))});\n`;
    caps.forEach((c) => {
      const t = r2(c.t - footStart);
      js += `        tl.to("#${c.id}", { y: 5, boxShadow: "0 1px 0 ${C.ink}", backgroundColor: "${C.amber}", duration: 0.08, ease: "power1.in" }, ${t});\n`;
      js += `        tl.to("#${c.id}", { y: 0, boxShadow: "0 6px 0 ${C.ink}", backgroundColor: "#ffffff", duration: 0.35, ease: "back.out(2)" }, ${r2(t + 0.1)});\n`;
    });
    js += `        tl.to("#v3-keys-g${i}", { opacity: 0, y: -8, duration: 0.25, ease: "${OUT}" }, ${tEnd});\n`;
  });
  // The extension's own "Saved" toast sits where the subtitle goes; say it here instead, once the
  // Enter keycap has gone.
  const savedAt = r2(keyAt('shot', 'Enter') - footStart + 1.35);
  body += `        <div id="v3-keys-saved" class="saved">✓ Saved to Tweet screenshots/</div>\n`;
  js += `        tl.fromTo("#v3-keys-saved", { opacity: 0, y: 14, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "back.out(1.6)" }, ${savedAt});\n`;
  js += `        tl.to("#v3-keys-saved", { opacity: 0, duration: 0.3, ease: "${OUT}" }, ${r2(dur - 0.4)});\n`;
  files['keys.html'] = scene(
    'v3-keys',
    dur,
    `
  .saved { position: absolute; left: 50%; top: 800px; transform: translateX(-50%); padding: 14px 26px; border-radius: 999px; background: ${C.teal}; color: #fff; font-weight: 700; font-size: 30px; white-space: nowrap; opacity: 0; box-shadow: 0 12px 30px rgba(15,118,110,0.3); }
  .row { position: absolute; left: 0; right: 0; top: 784px; display: flex; justify-content: center; gap: 14px; opacity: 0; }
  .cap { min-width: 76px; height: 76px; padding: 0 18px; border-radius: 16px; background: #fff; border: 2px solid ${C.ink}; box-shadow: 0 6px 0 ${C.ink}; display: flex; align-items: center; justify-content: center; font: 700 34px ${MONO}; color: ${C.ink}; }
  .cap.wide { font-size: 26px; }`,
    body,
    js
  );
  host('v3-keys', 'keys.html', footStart, dur, 3, 'graphics');
}

// --- 6. result: the real saved image --------------------------------------------------------------
{
  const s0 = B.result.start;
  const dur = r2(B.result.end - s0);
  files['result.html'] = scene(
    'v3-result',
    dur,
    `${BG_CSS}
  .shot { position: absolute; left: 300px; top: 130px; width: 720px; height: 720px; border-radius: 22px; overflow: hidden; background: #fff; box-shadow: 0 40px 90px rgba(20,24,31,0.2), 0 0 0 1px rgba(20,24,31,0.06); }
  .shot img { display: block; width: 100%; height: 100%; }
  .facts { position: absolute; left: 1110px; top: 300px; display: flex; flex-direction: column; gap: 22px; }
  .fact { font-weight: 800; font-size: 60px; letter-spacing: -0.035em; line-height: 1.05; }
  .fact small { display: block; margin-top: 8px; font: 600 24px ${MONO}; letter-spacing: 0.04em; color: ${C.muted}; }
  .file { margin-top: 18px; display: inline-flex; padding: 12px 20px; border-radius: 12px; background: ${C.ink}; color: #fff; font: 600 20px ${MONO}; }`,
    `${bg('v3-result')}
        <div id="v3-result-shot" class="shot"><img src="assets/v3/result.png" alt="" /></div>
        <div class="facts">
          <div id="v3-result-f1" class="fact">1080 × 1080<small>SQUARE, READY TO POST</small></div>
          <div id="v3-result-f2" class="fact">White background<small>POST + THE REPLIES YOU PICKED</small></div>
          <div id="v3-result-f3" class="file">Tweet screenshots/${(REC.saved || 'tweet.png').replace(/-(\d{4})\d+(\d{4})-/, '-$1…$2-')}</div>
        </div>`,
    `${bgMotion('v3-result', dur)}
        tl.fromTo("#v3-result-shot", { opacity: 0, y: 40, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "${IN}" }, 0);
${rise('#v3-result-f1', 0.2)}
${rise('#v3-result-f2', 0.32)}
${rise('#v3-result-f3', 0.44)}
        tl.to(["#v3-result-shot", "#v3-result-f1", "#v3-result-f2", "#v3-result-f3"], { opacity: 0, y: -16, duration: 0.3, ease: "${OUT}", stagger: 0.03 }, ${r2(dur - 0.42)});`
  );
  host('v3-result', 'result.html', s0, dur, 1, 'graphics');
}

// --- 7. install --------------------------------------------------------------------------------
{
  const s0 = B.install.start;
  const dur = r2(B.install.end - s0);
  const steps = [
    ['1', 'Download the ZIP', 'from GitHub'],
    ['2', 'Developer mode', 'chrome://extensions'],
    ['3', 'Load unpacked', 'pick the extension folder'],
  ];
  files['install.html'] = scene(
    'v3-install',
    dur,
    `${BG_CSS}
  h2 { position: absolute; left: 0; right: 0; top: 210px; margin: 0; text-align: center; font-weight: 800; font-size: 110px; letter-spacing: -0.045em; }
  .url { position: absolute; left: 0; right: 0; top: 380px; display: flex; justify-content: center; }
  .url div { display: flex; align-items: center; gap: 16px; padding: 18px 30px; border-radius: 16px; background: #fff; box-shadow: 0 14px 40px rgba(20,24,31,0.1), 0 0 0 1px rgba(20,24,31,0.06); font: 600 30px ${MONO}; }
  .url span { width: 36px; height: 36px; display: block; }
  .url svg { width: 100%; height: 100%; display: block; }
  .steps { position: absolute; left: 260px; right: 260px; top: 560px; display: flex; gap: 30px; }
  .step { flex: 1; padding: 34px 34px 38px; border-radius: 24px; background: #fff; box-shadow: 0 14px 40px rgba(20,24,31,0.08), 0 0 0 1px rgba(20,24,31,0.06); }
  .n { width: 56px; height: 56px; border-radius: 50%; background: ${C.teal}; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 28px; }
  .t { margin-top: 22px; font-weight: 800; font-size: 40px; letter-spacing: -0.02em; }
  .d { margin-top: 10px; font: 600 22px ${MONO}; color: ${C.muted}; }`,
    `${bg('v3-install')}
        <h2 id="v3-install-h">Free on GitHub</h2>
        <div class="url"><div id="v3-install-url"><span>${GH}</span>github.com/prasannakulkarni2510/linkedin-x-chrome-extension</div></div>
        <div class="steps">
${steps.map(([n, t, d], i) => `          <div id="v3-install-s${i}" class="step"><div class="n">${n}</div><div class="t">${t}</div><div class="d">${d}</div></div>`).join('\n')}
        </div>`,
    `${bgMotion('v3-install', dur)}
${rise('#v3-install-h', 0)}
${rise('#v3-install-url', 0.18)}
${steps.map((_, i) => rise(`#v3-install-s${i}`, rel('install', 1, s0) + i * 0.12)).join('\n')}
        tl.to(["#v3-install-h", "#v3-install-url", "#v3-install-s0", "#v3-install-s1", "#v3-install-s2"], { opacity: 0, y: -16, duration: 0.3, ease: "${OUT}", stagger: 0.03 }, ${r2(dur - 0.42)});`
  );
  host('v3-install', 'install.html', s0, dur, 1, 'graphics');
}

// --- 8. end: who made it, and the other project -------------------------------------------------
{
  const s0 = B.credits.start;
  const dur = r2(D - s0);
  const tP = rel('pacos', 0, s0);
  files['end.html'] = scene(
    'v3-end',
    dur,
    `${BG_CSS}
  .me { position: absolute; left: 200px; top: 200px; width: 760px; }
  .photo { width: 230px; height: 230px; border-radius: 50%; overflow: hidden; box-shadow: 0 0 0 8px #fff, 0 0 0 11px ${C.teal}, 0 30px 60px rgba(20,24,31,0.2); }
  .photo img { display: block; width: 100%; height: 100%; object-fit: cover; }
  .name { margin-top: 44px; font-weight: 800; font-size: 68px; letter-spacing: -0.035em; line-height: 1.05; white-space: nowrap; }
  .role { margin-top: 10px; font-weight: 500; font-size: 32px; color: ${C.muted}; }
  .links { margin-top: 38px; display: flex; flex-direction: column; gap: 16px; }
  .link { display: flex; align-items: center; gap: 18px; font: 600 26px ${MONO}; white-space: nowrap; }
  .link span { width: 34px; height: 34px; display: block; flex: none; }
  .link svg { width: 100%; height: 100%; display: block; }
  .card { position: absolute; left: 1100px; top: 170px; width: 620px; height: 740px; border-radius: 30px; background: #151d30; color: #fff; display: flex; flex-direction: column; align-items: center; padding-top: 52px; box-shadow: 0 40px 100px rgba(20,24,31,0.28); }
  .card .lbl { font: 600 22px ${MONO}; letter-spacing: 0.14em; color: #9aa6c0; }
  .card .pn { margin-top: 10px; font-weight: 800; font-size: 76px; letter-spacing: 0.02em; }
  .card .pn b { color: #ff5a36; }
  .qr { margin-top: 26px; width: 380px; height: 380px; border-radius: 22px; overflow: hidden; }
  .qr img { display: block; width: 100%; height: 100%; }
  .card .u { margin-top: 26px; font: 600 26px ${MONO}; color: #dfe5f2; }
  .brand { position: absolute; left: 1100px; top: 400px; width: 620px; display: flex; flex-direction: column; align-items: center; text-align: center; }
  .brand .bi { width: 120px; height: 120px; }
  .brand .bi svg { width: 100%; height: 100%; display: block; }
  .brand .bt { margin-top: 24px; font-weight: 800; font-size: 64px; letter-spacing: -0.04em; }
  .brand .bs { margin-top: 10px; font-weight: 500; font-size: 28px; color: ${C.muted}; }
  .note { position: absolute; left: 0; right: 0; top: 990px; text-align: center; font-size: 18px; color: ${C.muted}; }`,
    `${bg('v3-end')}
        <div class="me">
          <div id="v3-end-photo" class="photo"><img src="assets/v3/prasanna.png" alt="" /></div>
          <div id="v3-end-name" class="name">Prasanna (Ram) Kulkarni</div>
          <div id="v3-end-role" class="role">AI &amp; Software Engineer</div>
          <div class="links">
            <div id="v3-end-l0" class="link"><span>${GH}</span>github.com/prasannakulkarni2510</div>
            <div id="v3-end-l1" class="link"><span>${LI}</span>linkedin.com/in/prasanna-kulkarni-032650180</div>
            <div id="v3-end-l2" class="link"><span>${MAIL}</span>kulkarniprasanna25@gmail.com</div>
          </div>
        </div>
        <div id="v3-end-brand" class="brand"><div class="bi">${ICON}</div><div class="bt">Swipe Mode</div><div class="bs">Free on GitHub · LinkedIn and X</div></div>
        <div id="v3-end-card" class="card">
          <div class="lbl">MY OTHER PROJECT</div>
          <div class="pn">PAC<b>OS</b></div>
          <div class="qr"><img src="assets/v3/pacos-qr.jpg" alt="" /></div>
          <div class="u">pacos.onrender.com</div>
        </div>
        <div id="v3-end-note" class="note">Not affiliated with LinkedIn or X. Demo pages with fictional people.</div>`,
    `${bgMotion('v3-end', dur)}
        tl.fromTo("#v3-end-photo", { opacity: 0, scale: 0.85, y: 20 }, { opacity: 1, scale: 1, y: 0, duration: 0.8, ease: "${IN}" }, 0);
${rise('#v3-end-name', 0.18)}
${rise('#v3-end-role', 0.3)}
${rise('#v3-end-l0', rel('credits', 1, s0) + 0.0)}
${rise('#v3-end-l1', rel('credits', 1, s0) + 0.1)}
${rise('#v3-end-l2', rel('credits', 1, s0) + 0.2)}
${rise('#v3-end-brand', 0.4)}
${rise('#v3-end-note', 0.6)}
${leave('#v3-end-brand', tP - 0.35)}
        tl.fromTo("#v3-end-card", { opacity: 0, y: 50, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "${IN}" }, ${r2(tP)});`
  );
  host('v3-end', 'end.html', s0, dur, 1, 'graphics');
}

// --- 9. subtitles: one track, one phrase at a time -----------------------------------------------
{
  const phrases = T.beats.flatMap((b) => b.phrases);
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  files['captions.html'] = scene(
    'v3-captions',
    D,
    `
  .cap { position: absolute; left: 50%; top: 900px; transform: translateX(-50%); max-width: 1320px; padding: 14px 30px 16px; border-radius: 18px; background: rgba(255,255,255,0.94); box-shadow: 0 12px 34px rgba(20,24,31,0.14), 0 0 0 1px rgba(20,24,31,0.06); font-weight: 600; font-size: 34px; line-height: 1.3; text-align: center; color: ${C.ink}; opacity: 0; white-space: nowrap; }`,
    phrases.map((p, i) => `        <div id="v3-cap-${i}" class="cap">${esc(p.text)}</div>`).join('\n'),
    phrases
      .map((p, i) => {
        const next = phrases[i + 1];
        const out = next && next.start - p.end < 0.6 ? r2(next.start - 0.22) : r2(p.end + 0.25);
        return `        tl.fromTo("#v3-cap-${i}", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.2, ease: "${IN}" }, ${r2(Math.max(0, p.start - 0.05))});
        tl.to("#v3-cap-${i}", { opacity: 0, duration: 0.14, ease: "${OUT}" }, ${out});`;
      })
      .join('\n')
  );
  host('v3-captions', 'captions.html', 0, D, 4, 'captions');
}

// --- assets and the root --------------------------------------------------------------------------
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', A('assets/bgm-v2/bed-long.wav'), '-t', String(D), '-af', `afade=t=in:d=1.5,afade=t=out:st=${r2(D - 3)}:d=3`, A('assets/v3/bed.wav')]);
for (const [name, html] of Object.entries(files)) fs.writeFileSync(A(`compositions/v3/${name}`), html);
// v2's root lives in archive/index.v2.html: a second root beside index.html would also play.
const carve = JSON.stringify({ enabled: true, sources: ['voiceover'], strength: 0.85 }).replace(/"/g, '&quot;');
fs.writeFileSync(
  A('index.html'),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>Swipe Mode — v3</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      body { margin: 0; background: ${C.paper}; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; background: ${C.paper}; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-width="1920" data-height="1080" data-duration="${D}">
${hosts.join('\n')}
      <hf-audio-group id="voiceover" data-label="Voiceover" data-volume="1"></hf-audio-group>
      <audio id="vo" src="assets/v3/voice/narration.wav" data-start="0" data-duration="${T.duration}" data-track-index="5" data-volume="1" data-audio-group="voiceover"></audio>
      <audio id="bgm" src="assets/v3/bed.wav" data-start="0" data-duration="${D}" data-track-index="6" data-volume="0.26" data-fx-carve="${carve}"></audio>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`
);
console.log(`v3: ${D}s, ${Object.keys(files).length} scenes, ${KEYS.length} key presses`);
