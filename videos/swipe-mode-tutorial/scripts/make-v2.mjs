// Generates the v2 film: compositions/v2/*.html and the root index.html, from the recordings'
// cues (assets/v2/cues.json, with offsets from dev/prep-v2-footage.js) and the voiceover
// durations (assets/voice-v2/durations.tsv). Re-run after re-recording; never hand-edit times.
// Needs ffmpeg on PATH (extracts the card stills used by the hook).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const A = (p) => path.join(ROOT, p);
const cues = JSON.parse(fs.readFileSync(A('assets/v2/cues.json'), 'utf8'));
const VO = Object.fromEntries(
  fs.readFileSync(A('assets/voice-v2/durations.tsv'), 'utf8').trim().split('\n').map((l) => {
    const [id, d] = l.split('\t');
    return [id, Number(d)];
  })
);
const r2 = (n) => Math.round(n * 100) / 100;

// --- palette, type, logos ------------------------------------------------------------------
const C = { bg: '#eef3f1', ink: '#13201d', muted: '#4b5b57', teal: '#0f766e', amber: '#f5b83d', line: '#cfdcd8', white: '#ffffff' };
const svgOf = (file) =>
  fs.readFileSync(A(file), 'utf8').replace(/<\?xml[^>]*>/, '').replace(/<title>.*?<\/title>/, '').replace(/\s(width|height)="[^"]*"/g, '');
const LOGO = {
  linkedin: svgOf('.media/images/logo_001.svg'),
  x: svgOf('.media/images/logo_002.svg'),
  swipe: `<svg viewBox="0 0 128 128"><rect x="4" y="4" width="120" height="120" rx="28" fill="#0f766e"/><rect x="34" y="22" width="60" height="84" rx="12" fill="#ffffff" transform="rotate(-8 64 64)" opacity="0.35"/><rect x="34" y="22" width="60" height="84" rx="12" fill="#ffffff"/><rect x="44" y="36" width="40" height="6" rx="3" fill="#0f766e" opacity="0.55"/><rect x="44" y="48" width="30" height="6" rx="3" fill="#0f766e" opacity="0.35"/><path d="M30 92 16 78l14-14M98 64l14 14-14 14" fill="none" stroke="#fbbf24" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};
const REPO = 'github.com/prasannakulkarni2510/linkedin-x-chrome-extension';

// --- the window every screen beat lives in (one world across scenes) ----------------------
const WIN = { left: 64, top: 96, w: 1216, h: 760, chrome: 44, border: 3 };
const SCALE = WIN.w / 1280; // recordings and captures are 1280x800
const winX = (x) => r2(WIN.border + x * SCALE);
const winY = (y) => r2(WIN.border + WIN.chrome + WIN.border + y * SCALE);

const BASE_CSS = `
  #root { position: absolute; inset: 0; overflow: hidden; background: ${C.bg}; font-family: "Montserrat", sans-serif; color: ${C.ink}; }
  .dots { position: absolute; inset: -60px; background-image: radial-gradient(${C.teal} 2.2px, transparent 2.4px); background-size: 44px 44px; opacity: 0.12; }
  .glow { position: absolute; right: -380px; top: 40px; width: 1000px; height: 1000px; border-radius: 50%; background: radial-gradient(circle, rgba(15,118,110,0.26) 0%, rgba(15,118,110,0) 65%); }
  .top { position: absolute; left: 64px; right: 64px; top: 34px; display: flex; justify-content: space-between; align-items: center; font: 700 24px "JetBrains Mono", monospace; letter-spacing: 0.1em; }
  .top-left { display: flex; align-items: center; gap: 14px; color: ${C.teal}; }
  .top-left svg, .addr svg { display: block; flex: none; }
  .top-right { color: ${C.muted}; }
  .window { position: absolute; left: ${WIN.left}px; top: ${WIN.top}px; width: ${WIN.w + WIN.border * 2}px; height: ${WIN.h + WIN.chrome + WIN.border * 3}px; border-radius: 22px; border: ${WIN.border}px solid ${C.ink}; background: ${C.white}; box-shadow: 0 12px 0 ${C.ink}; overflow: hidden; }
  .chrome { position: absolute; left: 0; right: 0; top: 0; height: ${WIN.chrome}px; display: flex; align-items: center; gap: 10px; padding: 0 18px; background: #f6f9f8; border-bottom: ${WIN.border}px solid ${C.ink}; }
  .wdot { width: 14px; height: 14px; border-radius: 50%; border: 2px solid ${C.ink}; flex: none; }
  .addr { position: relative; margin-left: 18px; flex: 1; height: 30px; border-radius: 15px; background: #e4ecea; display: flex; align-items: center; gap: 10px; padding: 0 16px; font: 700 18px "JetBrains Mono", monospace; color: ${C.muted}; white-space: nowrap; overflow: hidden; }
  .screen { position: absolute; left: 0; top: ${WIN.chrome + WIN.border}px; width: ${WIN.w}px; height: ${WIN.h}px; overflow: hidden; }
  .screen img { position: absolute; left: 0; top: 0; width: ${WIN.w}px; height: ${WIN.h}px; }
  /* Recordings are scaled so their last 8 source pixels fall outside the window: that hides the
     sync marker in the bottom-right corner. */
  .screen video { position: absolute; left: 0; top: 0; width: ${r2((WIN.w * 1280) / 1272)}px; height: ${r2((WIN.h * 800) / 795)}px; }
  .panel { position: absolute; left: 1336px; top: 104px; width: 524px; height: 780px; }
  .step { position: absolute; left: 0; top: 0; width: 524px; opacity: 0; }
  .step-num { font-weight: 900; font-size: 132px; line-height: 0.9; letter-spacing: -0.05em; color: ${C.teal}; }
  .step-of { font: 700 24px "JetBrains Mono", monospace; color: ${C.muted}; letter-spacing: 0.08em; margin-top: 12px; }
  .step-title { font-weight: 900; font-size: 54px; letter-spacing: -0.035em; line-height: 1.04; margin-top: 22px; }
  .step-keys { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 14px 12px; margin-top: 30px; }
  .key-group { display: flex; align-items: center; gap: 8px; }
  .cap-wrap { display: flex; flex-direction: column; align-items: center; gap: 10px; }
  .cap { display: inline-flex; align-items: center; justify-content: center; flex: none; min-width: 80px; height: 80px; padding: 0 16px; border-radius: 16px; background: ${C.white}; border: 3px solid ${C.ink}; box-shadow: 0 8px 0 ${C.ink}; font: 700 36px "JetBrains Mono", monospace; color: ${C.ink}; }
  .cap-small { font-size: 26px; }
  .cap-sub { font: 700 22px "JetBrains Mono", monospace; color: ${C.muted}; letter-spacing: 0.04em; }
  .cap-join { font: 700 28px "JetBrains Mono", monospace; color: ${C.muted}; }
  .step-body { margin-top: 30px; font-size: 32px; line-height: 1.36; }
  .chips { display: flex; flex-direction: column; align-items: flex-start; gap: 14px; margin-top: 24px; }
  .chip { display: inline-flex; align-items: center; gap: 12px; padding: 12px 22px; border-radius: 999px; background: ${C.teal}; color: ${C.white}; font-weight: 700; font-size: 26px; opacity: 0; }
  .chip--warn { background: ${C.ink}; }
  .rail { position: absolute; left: 64px; right: 64px; top: 958px; display: flex; gap: 10px; }
  .rail-seg { flex: 1; min-width: 0; }
  .rail-track { height: 10px; border-radius: 5px; background: ${C.line}; overflow: hidden; }
  .rail-fill { width: 100%; height: 100%; background: ${C.teal}; transform-origin: 0 50%; }
  .rail-label { margin-top: 14px; font: 700 20px "JetBrains Mono", monospace; letter-spacing: 0.06em; color: ${C.muted}; text-align: center; white-space: nowrap; }
  .ring { position: absolute; border: 5px solid ${C.amber}; border-radius: 14px; box-shadow: 0 0 0 6px rgba(245,184,61,0.28); opacity: 0; }
`;

const RAIL = ['START', 'READ', 'ENGAGE', 'REACT', 'COMMENT', 'SAVE', 'TRUST', 'X', 'SWIPE', 'EXIT'];
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function page(id, css, body, script) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
  </head>
  <body>
    <template>
      <style>${BASE_CSS}${css}
      </style>
      <div id="root" data-composition-id="${id}" data-width="1920" data-height="1080">
${body}
      </div>
      <script>
${script}
        window.__timelines["${id}"] = tl;
      </script>
    </template>
  </body>
</html>
`;
}

const windowHtml = (id, addrLogo, addr, screen, addr2) => `        <div id="${id}-window" class="window">
          <div class="chrome"><div class="wdot"></div><div class="wdot"></div><div class="wdot"></div>
            <div id="${id}-addr" class="addr">${addrLogo ? `<span style="width:22px;height:22px">${addrLogo}</span>` : ''}<span id="${id}-addr-text">${esc(addr)}</span>${addr2 ? `<span id="${id}-addr-2" style="position:absolute;left:16px">${esc(addr2)}</span>` : ''}</div>
          </div>
          <div class="screen">
${screen}
          </div>
        </div>`;

const railHtml = (id) =>
  `        <div id="${id}-rail" class="rail">${RAIL.map((l, i) => `<div class="rail-seg"><div class="rail-track"><div id="${id}-fill-${i}" class="rail-fill"></div></div><div id="${id}-label-${i}" class="rail-label">${l}</div></div>`).join('')}</div>`;

// Ambient motion shared by every scene: the dot field drifts, the glow breathes.
const ambient = (id, D) => `
        tl.fromTo("#${id}-dots", { x: 0, y: 0 }, { x: -44, y: -22, duration: ${D}, ease: "none" }, 0);
        tl.fromTo("#${id}-glow", { scale: 0.92 }, { scale: 1.06, duration: 4, ease: "sine.inOut", yoyo: true, repeat: ${Math.max(0, Math.floor(D / 4) - 1)} }, 0);`;

// --- demo scenes (real recordings) --------------------------------------------------------
// Recorder clock -> video seconds, piecewise linear through every cue's measured video time
// (dev/prep-v2-footage.js reads each cue's sync-marker flip).
function videoTime(rec, t) {
  const pts = cues[rec].cues.map((c) => [c.t, c.v]);
  if (t <= pts[0][0]) return t + (pts[0][1] - pts[0][0]);
  for (let i = 1; i < pts.length; i++) {
    const [t0, v0] = pts[i - 1];
    const [t1, v1] = pts[i];
    if (t <= t1) return t1 === t0 ? v1 : v0 + ((t - t0) * (v1 - v0)) / (t1 - t0);
  }
  const [tl, vl] = pts[pts.length - 1];
  return t + (vl - tl);
}

function demoScene({ id, rec, site, m0, end, steps, railDone }) {
  const D = r2(end - m0);
  const keyCues = cues[rec].cues.filter((c) => c.id === 'key');
  const local = (t) => r2(videoTime(rec, t) - m0);
  const cueT = (pred) => cues[rec].cues.find(pred).t;
  let ptr = 0;
  const built = steps.map((s) => {
    const at = local(s.from);
    ptr = keyCues.findIndex((k, i) => i >= ptr && k.t >= s.from - 0.01);
    const press = (s.press || []).map(([g, label]) => {
      const i = keyCues.findIndex((k, j) => j >= ptr && k.key === label);
      if (i < 0) throw new Error(`${id}: no key cue "${label}" for step ${s.title}`);
      ptr = i + 1;
      return [g, local(keyCues[i].t)];
    });
    (s.pressAt || []).forEach(([g, pred]) => press.push([g, local(cueT(pred))]));
    const chips = (s.chips || []).map(([text, pred, warn]) => [text, local(cueT(pred)) + (warn ? 0 : 0.1), !!warn]);
    return { ...s, at, press, chips };
  });
  const logo = LOGO[site];
  const siteName = site === 'x' ? 'X' : 'LINKEDIN';
  const addr = site === 'x' ? 'x.com/home · demo timeline' : 'linkedin.com/feed · demo feed';
  const body = `        <div id="${id}-dots" class="dots"></div>
        <div id="${id}-glow" class="glow" data-layout-allow-overflow=""></div>
        <div id="${id}-top" class="top"><div class="top-left">SWIPE MODE ON <span style="width:30px;height:30px">${logo}</span> ${siteName}</div><div class="top-right">REAL RECORDING · MOCK FEED, FICTIONAL PEOPLE</div></div>
${windowHtml(id, logo, addr, `            <video id="${id}-video" class="clip" data-layout-allow-overflow="" src="assets/v2/${rec}.mp4" muted playsinline data-start="0" data-duration="${D}" data-media-start="${r2(m0)}" data-track-index="0"></video>`)}
        <div id="${id}-panel" class="panel"></div>
${railHtml(id)}`;
  const script = `        const STEPS = ${JSON.stringify(built.map(({ n, title, keys, body: b, at, press, chips }) => ({ n, title, keys, body: b, at, press, chips })))};
        const RAILDONE = ${JSON.stringify(railDone)};
        const D = ${D};
        const panel = document.getElementById("${id}-panel");
        const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
        STEPS.forEach((s, i) => {
          const block = el("div", "step");
          block.id = "${id}-step-" + i;
          block.append(el("div", "step-num", String(s.n).padStart(2, "0")), el("div", "step-of", "OF 10"), el("div", "step-title", s.title));
          const keys = el("div", "step-keys");
          s.caps = [];
          (s.keys || []).forEach((group, g) => {
            if (g > 0 && group.join) keys.append(el("span", "cap-join", group.join));
            const wrap = el("div", "key-group");
            const caps = [];
            group.caps.forEach((k, j) => {
              if (j > 0) wrap.append(el("span", "cap-join", "+"));
              const [label, sub] = k.split("|");
              const cw = el("div", "cap-wrap");
              const cap = el("span", "cap" + (label.length > 3 ? " cap-small" : ""), label);
              cw.append(cap);
              if (sub) cw.append(el("span", "cap-sub", sub));
              wrap.append(cw);
              caps.push(cap);
            });
            keys.append(wrap);
            s.caps.push(caps);
          });
          if ((s.keys || []).length) block.append(keys);
          block.append(el("div", "step-body", s.body));
          const chips = el("div", "chips");
          s.chips.forEach(([text, , warn], c) => { const ch = el("div", "chip" + (warn ? " chip--warn" : ""), text); ch.id = "${id}-chip-" + i + "-" + c; chips.append(ch); });
          block.append(chips);
          panel.append(block);
        });

        const tl = gsap.timeline({ paused: true });
${ambient(id, D)}
        tl.fromTo("#${id}-top", { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power1.out" }, 0);
        RAILDONE.forEach((i) => tl.set("#${id}-fill-" + i, { scaleX: 1 }, 0).set("#${id}-label-" + i, { color: "${C.teal}" }, 0));
        for (let i = 0; i < ${RAIL.length}; i++) if (!RAILDONE.includes(i)) tl.set("#${id}-fill-" + i, { scaleX: 0 }, 0);

        function pressCaps(caps, t) {
          caps.forEach((cap) => {
            tl.to(cap, { scale: 0.9, y: 6, boxShadow: "0 2px 0 ${C.ink}", duration: 0.1, ease: "power1.in" }, t);
            tl.to(cap, { scale: 1, y: 0, boxShadow: "0 8px 0 ${C.ink}", duration: 0.5, ease: "back.out(2)" }, t + 0.1);
            tl.to(cap, { backgroundColor: "${C.amber}", duration: 0.08, ease: "none" }, t);
            tl.to(cap, { backgroundColor: "${C.white}", duration: 0.25, ease: "power1.out" }, t + 0.3);
          });
        }

        STEPS.forEach((s, i) => {
          const sel = "#${id}-step-" + i;
          const next = STEPS[i + 1];
          tl.fromTo(sel, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, s.at);
          if (document.querySelector(sel + " .cap-wrap")) tl.fromTo(sel + " .cap-wrap", { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(2.2)", stagger: 0.06 }, s.at + 0.12);
          if (next) tl.to(sel, { opacity: 0, y: -18, duration: 0.25, ease: "power2.in" }, next.at - 0.28);
          s.press.forEach(([g, t]) => pressCaps(s.caps[g], t));
          s.chips.forEach(([, t], c) => tl.fromTo("#${id}-chip-" + i + "-" + c, { opacity: 0, scale: 0.8, x: -12 }, { opacity: 1, scale: 1, x: 0, duration: 0.4, ease: "back.out(2)" }, t));
          const r = s.n - 1;
          tl.fromTo("#${id}-fill-" + r, { scaleX: 0 }, { scaleX: 1, duration: 0.45, ease: "power2.out" }, s.at);
          tl.fromTo("#${id}-label-" + r, { color: "${C.muted}" }, { color: "${C.teal}", duration: 0.3, ease: "none" }, s.at);
        });`;
  return { D, html: page(id, '', body, script), beatLocal: (beat) => local(cues[rec].cues.find((c) => c.id === 'beat' && c.beat === beat).t) };
}

const K = (caps, join) => ({ caps, join });
const isKey = (label) => (c) => c.id === 'key' && c.key === label;
const beatT = (rec, beat) => cues[rec].cues.find((c) => c.id === 'beat' && c.beat === beat).t;
const cueT = (rec, pred) => cues[rec].cues.find(pred).t;
const lastT = (rec, pred) => cues[rec].cues.filter(pred).pop().t;

// LinkedIn: beats 03–07
const li = 'linkedin';
const liM0 = videoTime(li, beatT(li, '03-start')) - 0.4;
const liEnd = Math.min(cues[li].duration - 0.15, videoTime(li, lastT(li, () => true)) + 2.2);
const sKey = cueT(li, isKey('S'));
const linkedinScene = demoScene({
  id: 'v2-linkedin',
  rec: li,
  site: 'linkedin',
  m0: liM0,
  end: liEnd,
  railDone: [],
  steps: [
    { n: 1, title: 'Start', from: beatT(li, '03-start') + 0.2, keys: [K(['Alt', 'Shift', 'S'])], pressAt: [[0, (c) => c.id === 'click']], body: 'Click the Swipe Mode button, or press Alt+Shift+S.', chips: [['✓ One post, the whole card', (c) => c.id === 'click']] },
    { n: 2, title: 'Read · skip · undo', from: beatT(li, '04-read'), keys: [K(['↓|read']), K(['←|skip']), K(['U|undo'])], press: [[0, '↓'], [0, '↓'], [0, '↑'], [1, '←'], [2, 'U'], [1, '←'], [1, '←']], body: 'Arrows scroll the card. Left skips, U brings it back.', chips: [['✓ Promoted post left out', (c) => c.id === 'promoted-skipped']] },
    { n: 3, title: 'Engage menu', from: beatT(li, '05-engage'), keys: [K(['→'])], press: [[0, '→']], body: 'Your options, numbered 1 to 8. Nothing happens until you pick.', chips: [] },
    { n: 4, title: 'React', from: beatT(li, '06-react'), keys: [K(['R']), K(['1–6'], 'then'), K(['Esc|stay'], 'or')], press: [[0, 'R'], [1, '2'], [0, 'R'], [1, '1'], [2, 'Esc']], body: 'React by number. It moves on only after LinkedIn confirms.', chips: [['✓ Reacted · Celebrate', (c) => c.id === 'confirmed'], ['✓ Stayed for one more action', (c) => c.id === 'stayed']] },
    { n: 5, title: 'Comment', from: beatT(li, '07-comment'), keys: [K(['C']), K(['Ctrl', 'Enter'], 'then')], press: [[0, 'C'], [1, 'Ctrl+Enter']], body: "Write it in the card. Ctrl+Enter posts it through LinkedIn's comment box.", chips: [['✓ Comment posted', isKey('S')]] },
    { n: 6, title: 'Save · repost', from: sKey - 0.6, keys: [K(['S|save']), K(['3|repost']), K(['4|thoughts'])], press: [[0, 'S'], [1, '3'], [2, '4']], body: "4 opens LinkedIn's own composer for your thoughts.", chips: [['✓ Saved · Reposted', (c) => c.id === 'native']] },
  ],
});

// Trust: beat 08 (broken control, then the pacing guard)
const tr = 'trust';
const trustScene = demoScene({
  id: 'v2-trust',
  rec: tr,
  site: 'linkedin',
  m0: videoTime(tr, beatT(tr, '08-trust')) - 0.5,
  end: videoTime(tr, cueT(tr, (c) => c.id === 'pacing')) + 2.0,
  railDone: [0, 1, 2, 3, 4, 5],
  steps: [
    { n: 7, title: 'Honest results', from: beatT(tr, '08-trust'), keys: [], body: 'Done only when the site confirms it. Never on a guess.', chips: [["✗ Couldn't complete · nothing marked done", (c) => c.id === 'failure', true], ['⏱ Pacing guard · human speed', (c) => c.id === 'pacing']] },
  ],
});

// X: beats 09–11
const xr = 'x';
const xScene = demoScene({
  id: 'v2-x',
  rec: xr,
  site: 'x',
  m0: videoTime(xr, beatT(xr, '09-x')) - 0.3,
  // Long enough for the exit line (starts 0.3s into its beat), never past the recording.
  end: Math.min(cues[xr].duration - 0.05, Math.max(videoTime(xr, cueT(xr, (c) => c.id === 'exited')) + 1.3, videoTime(xr, beatT(xr, '11-exit')) + 0.3 + VO['11-exit'] + 0.6)),
  railDone: [0, 1, 2, 3, 4, 5, 6],
  steps: [
    { n: 8, title: 'Same keys on X', from: beatT(xr, '09-x') + 0.2, keys: [K(['R|like']), K(['C|reply']), K(['S|bookmark']), K(['4|quote'])], press: [[0, 'R'], [1, 'C'], [1, 'Ctrl+Enter'], [2, 'S'], [3, '4']], body: "X's own shortcuts are off while Swipe Mode is open.", chips: [['✓ Liked · Replied · Bookmarked · Quoted', (c) => c.id === 'click' && c.what === 'post']] },
    { n: 9, title: 'Swipe or drag', from: beatT(xr, '10-swipe'), keys: [K(['Swipe|trackpad']), K(['⠿ Drag|grip']), K(['Hold|menu'])], pressAt: [[0, (c) => c.id === 'trackpad'], [1, (c) => c.id === 'drag'], [2, (c) => c.id === 'longpress']], body: 'The grip handle never selects text.', chips: [] },
    { n: 10, title: 'Help · exit', from: beatT(xr, '11-exit'), keys: [K(['?|help']), K(['Esc|back']), K(['X|stay here'])], press: [[0, '?'], [1, 'Esc'], [1, 'Esc']], body: 'Esc returns you to where you started.', chips: [['✓ Back where you started', (c) => c.id === 'exited']] },
  ],
});

// --- hook ----------------------------------------------------------------------------------
fs.mkdirSync(A('assets/v2/stills'), { recursive: true });
const grab = (rec, t, out, crop) =>
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(r2(t)), '-i', A(`assets/v2/${rec}.mp4`), '-frames:v', '1', ...(crop ? ['-vf', `crop=${crop}`] : []), A(`assets/v2/stills/${out}`)]);
// The Swipe Mode card mid-read on LinkedIn and on X, and the plain feed before Swipe Mode starts.
grab(li, videoTime(li, beatT(li, '04-read')) + 0.1, 'card-linkedin.png', '560:490:360:172');
grab(xr, videoTime(xr, cueT(xr, isKey('R'))) - 0.3, 'card-x.png', '560:450:360:190');
grab(li, Math.max(0.1, videoTime(li, beatT(li, '03-start')) - 0.2), 'feed-linkedin.png');

const HOOK_D = 9.2;
const hook = page(
  'v2-hook',
  `
  .ghost { position: absolute; left: -40px; bottom: -70px; font-weight: 900; font-size: 300px; letter-spacing: -0.04em; color: ${C.teal}; opacity: 0.12; white-space: nowrap; }
  .feedwin { position: absolute; left: 1010px; top: 96px; width: 780px; height: 860px; border-radius: 22px; border: 3px solid ${C.ink}; box-shadow: 0 12px 0 ${C.ink}; overflow: hidden; background: ${C.white}; }
  .feedstrip { position: absolute; left: -160px; top: 0; width: 1100px; height: 2752px; background-image: url("assets/v2/stills/feed-linkedin.png"); background-size: 1100px 688px; background-repeat: repeat-y; }
  .lead { position: absolute; left: 120px; top: 330px; width: 820px; }
  .lead h1 { margin: 0; font-weight: 900; font-size: 116px; line-height: 0.98; letter-spacing: -0.045em; }
  .lead p { margin: 26px 0 0; font-size: 46px; line-height: 1.25; color: ${C.muted}; }
  .brand { position: absolute; left: 120px; top: 190px; width: 860px; }
  .icon { width: 176px; height: 176px; }
  .icon svg { width: 100%; height: 100%; display: block; }
  .brand h1 { margin: 34px 0 0; font-weight: 900; font-size: 150px; line-height: 0.92; letter-spacing: -0.05em; }
  .brand p { margin: 24px 0 0; font-size: 50px; line-height: 1.2; color: ${C.teal}; font-weight: 700; }
  .works { display: flex; gap: 22px; margin-top: 54px; }
  .site { display: flex; align-items: center; gap: 18px; padding: 16px 28px 16px 16px; border-radius: 22px; background: ${C.white}; border: 3px solid ${C.ink}; box-shadow: 0 8px 0 ${C.ink}; font-weight: 900; font-size: 40px; }
  .site span { width: 64px; height: 64px; display: block; }
  .site svg { width: 100%; height: 100%; display: block; }
  .stack { position: absolute; left: 1100px; top: 190px; width: 620px; height: 560px; }
  .card { position: absolute; left: 0; top: 0; width: 620px; height: 543px; border-radius: 18px; overflow: hidden; border: 3px solid ${C.ink}; box-shadow: 0 12px 0 ${C.ink}; background: ${C.white}; }
  .card img { display: block; width: 100%; height: 100%; }
  .card-back { background: ${C.white}; }`,
  `        <div id="v2-hook-dots" class="dots"></div>
        <div id="v2-hook-glow" class="glow" data-layout-allow-overflow=""></div>
        <div id="v2-hook-ghost" class="ghost" data-layout-allow-overflow="">ONE AT A TIME</div>
        <div id="v2-hook-feedwin" class="feedwin"><div id="v2-hook-strip" class="feedstrip"></div></div>
        <div id="v2-hook-lead" class="lead"><h1>Endless scrolling</h1><p>buries the posts you care about.</p></div>
        <div id="v2-hook-stack" class="stack">
          <div id="v2-hook-back2" class="card card-back"></div>
          <div id="v2-hook-back1" class="card"><img src="assets/v2/stills/card-x.png" alt="" /></div>
          <div id="v2-hook-front" class="card"><img src="assets/v2/stills/card-linkedin.png" alt="" /></div>
        </div>
        <div id="v2-hook-brand" class="brand">
          <div id="v2-hook-icon" class="icon">${LOGO.swipe}</div>
          <h1 id="v2-hook-title">Swipe Mode</h1>
          <p id="v2-hook-tag">Your feed, one post at a time.</p>
          <div class="works"><div id="v2-hook-li" class="site"><span>${LOGO.linkedin}</span>LinkedIn</div><div id="v2-hook-x" class="site"><span>${LOGO.x}</span>X</div></div>
        </div>`,
  `        const tl = gsap.timeline({ paused: true });
${ambient('v2-hook', HOOK_D)}
        tl.fromTo("#v2-hook-ghost", { x: 0 }, { x: -260, duration: ${HOOK_D}, ease: "none" }, 0);
        // Beat 1: the endless feed scrolls, faster and faster.
        tl.fromTo("#v2-hook-feedwin", { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, 0);
        tl.fromTo("#v2-hook-strip", { y: 0 }, { y: -2064, duration: 3.0, ease: "power2.in" }, 0.2);
        tl.fromTo("#v2-hook-lead h1", { opacity: 0, x: -50 }, { opacity: 1, x: 0, duration: 0.55, ease: "expo.out" }, 0.25);
        tl.fromTo("#v2-hook-lead p", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, 0.9);
        // Beat 2: the scroll stops, one post comes forward, Swipe Mode takes the stage.
        tl.to("#v2-hook-feedwin", { opacity: 0, scale: 0.9, duration: 0.45, ease: "power2.in" }, 3.0);
        tl.to("#v2-hook-lead", { opacity: 0, y: -30, duration: 0.35, ease: "power2.in" }, 3.0);
        tl.fromTo("#v2-hook-back2", { opacity: 0, rotation: 0, x: 0, y: 0 }, { opacity: 0.55, rotation: 7, x: 46, y: 26, duration: 0.6, ease: "power3.out" }, 3.35);
        tl.fromTo("#v2-hook-back1", { opacity: 0, rotation: 0, x: 0, y: 0 }, { opacity: 1, rotation: 3.5, x: 24, y: 12, duration: 0.6, ease: "power3.out" }, 3.3);
        tl.fromTo("#v2-hook-front", { opacity: 0, scale: 0.7, y: 120, rotation: -6 }, { opacity: 1, scale: 1, y: 0, rotation: -1.5, duration: 0.8, ease: "back.out(1.6)" }, 3.2);
        tl.fromTo("#v2-hook-icon", { opacity: 0, scale: 0.3, rotation: -25 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.7, ease: "back.out(2.4)" }, 3.25);
        tl.fromTo("#v2-hook-title", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.55, ease: "expo.out" }, 3.5);
        tl.fromTo("#v2-hook-tag", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, 3.85);
        // Beat 3: the two sites land as the voice names them.
        tl.fromTo("#v2-hook-li", { opacity: 0, y: 40, scale: 0.8 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "back.out(2)" }, 4.75);
        tl.fromTo("#v2-hook-x", { opacity: 0, y: 40, scale: 0.8 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "back.out(2)" }, 6.0);
        tl.to("#v2-hook-front", { rotation: 1.5, duration: 4, ease: "sine.inOut" }, 4.0);`
);

// --- install (live captures) -----------------------------------------------------------------
const INSTALL_D = 9.8;
// Rings in capture pixels (1280x800): Download ZIP, Developer mode, Load unpacked, the Swipe Mode card.
const rings = [
  { id: 'zip', x: 548, y: 541, w: 380, h: 30, at: 2.1 },
  { id: 'dev', x: 1122, y: 12, w: 156, h: 34, at: 3.6 },
  { id: 'load', x: 18, y: 62, w: 136, h: 44, at: 5.3 },
  { id: 'card', x: 338, y: 197, w: 412, h: 220, at: 6.7 },
];
const ringHtml = rings
  .map((g) => `            <div id="v2-install-ring-${g.id}" class="ring" style="left:${winX(g.x) - WIN.border}px;top:${r2(g.y * SCALE)}px;width:${r2(g.w * SCALE)}px;height:${r2(g.h * SCALE)}px"></div>`)
  .join('\n');
const installSteps = [
  ['Download the ZIP from GitHub', 2.1],
  ['Turn on Developer mode', 3.6],
  ['Click Load unpacked', 5.3],
  ['Pick the extension folder', 6.7],
];
const install = page(
  'v2-install',
  `
  .ins-head { font: 700 24px "JetBrains Mono", monospace; color: ${C.muted}; letter-spacing: 0.08em; }
  .ins-title { font-weight: 900; font-size: 60px; letter-spacing: -0.035em; line-height: 1.04; margin-top: 18px; }
  .ins-list { margin-top: 40px; display: flex; flex-direction: column; gap: 26px; }
  .ins-row { display: flex; align-items: center; gap: 22px; font-size: 32px; font-weight: 700; }
  .ins-dot { position: relative; width: 64px; height: 64px; flex: none; border-radius: 50%; border: 3px solid ${C.ink}; background: ${C.white}; display: grid; place-items: center; font: 700 28px "JetBrains Mono", monospace; }
  .ins-check { position: absolute; inset: -3px; border-radius: 50%; background: ${C.teal}; color: ${C.white}; display: grid; place-items: center; font-size: 34px; }
  .ins-done { margin-top: 40px; display: inline-flex; padding: 12px 22px; border-radius: 999px; background: ${C.teal}; color: ${C.white}; font-weight: 700; font-size: 26px; }`,
  `        <div id="v2-install-dots" class="dots"></div>
        <div id="v2-install-glow" class="glow" data-layout-allow-overflow=""></div>
        <div id="v2-install-top" class="top"><div class="top-left">SWIPE MODE · INSTALL</div><div class="top-right">LIVE CAPTURES · GITHUB AND CHROME</div></div>
${windowHtml('v2-install', '', 'github.com/prasannakulkarni2510/linkedin-x-chrome-extension', `            <img id="v2-install-s1" src="assets/v2/github-repo.png" alt="" />
            <img id="v2-install-s2" src="assets/v2/github-code.png" alt="" />
            <img id="v2-install-s3" src="assets/v2/ext-off.png" alt="" />
            <img id="v2-install-s4" src="assets/v2/ext-on.png" alt="" />
${ringHtml}`, 'chrome://extensions')}
        <div id="v2-install-panel" class="panel">
          <div id="v2-install-head" class="ins-head">FROM GITHUB · NO STORE NEEDED</div>
          <div id="v2-install-title" class="ins-title">Install in four steps</div>
          <div class="ins-list">${installSteps.map(([t], i) => `<div id="v2-install-row-${i}" class="ins-row"><div class="ins-dot">${i + 1}<div id="v2-install-check-${i}" class="ins-check">✓</div></div><div>${esc(t)}</div></div>`).join('')}</div>
          <div id="v2-install-done" class="ins-done">✓ Swipe Mode 0.2.0 loaded</div>
        </div>
${railHtml('v2-install')}`,
  `        const tl = gsap.timeline({ paused: true });
${ambient('v2-install', INSTALL_D)}
        for (let i = 0; i < ${RAIL.length}; i++) tl.set("#v2-install-fill-" + i, { scaleX: 0 }, 0);
        tl.fromTo("#v2-install-window", { opacity: 0, y: 40, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "power3.out" }, 0);
        tl.fromTo("#v2-install-top", { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power1.out" }, 0.1);
        tl.fromTo("#v2-install-rail", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, 0.3);
        tl.fromTo("#v2-install-head", { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" }, 0.25);
        tl.fromTo("#v2-install-title", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: "expo.out" }, 0.35);
        ${installSteps.map((_, i) => `tl.fromTo("#v2-install-row-${i}", { opacity: 0, x: 30 }, { opacity: 0.45, x: 0, duration: 0.4, ease: "power2.out" }, ${r2(0.6 + i * 0.12)});`).join('\n        ')}
        ${installSteps.map((_, i) => `tl.set("#v2-install-check-${i}", { scale: 0, opacity: 0 }, 0);`).join('\n        ')}
        // Screens follow the voice: repo, Code menu, extensions page, developer mode on.
        tl.set("#v2-install-s2", { opacity: 0 }, 0).set("#v2-install-s3", { opacity: 0 }, 0).set("#v2-install-s4", { opacity: 0 }, 0);
        tl.to("#v2-install-s2", { opacity: 1, duration: 0.25, ease: "none" }, 1.8);
        tl.to("#v2-install-s3", { opacity: 1, duration: 0.25, ease: "none" }, 3.3);
        tl.to("#v2-install-s4", { opacity: 1, duration: 0.25, ease: "none" }, 4.6);
        tl.set("#v2-install-addr-2", { opacity: 0 }, 0);
        tl.to("#v2-install-addr-text", { opacity: 0, duration: 0.15, ease: "none" }, 3.3);
        tl.to("#v2-install-addr-2", { opacity: 1, duration: 0.15, ease: "none" }, 3.35);
        ${rings
          .map((g, i) => {
            const next = rings[i + 1];
            const out = next ? next.at - 0.15 : INSTALL_D;
            return `tl.fromTo("#v2-install-ring-${g.id}", { opacity: 0, scale: 1.25 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)" }, ${g.at});
        ${next ? `tl.to("#v2-install-ring-${g.id}", { opacity: 0, duration: 0.2, ease: "power1.in" }, ${r2(out)});` : ''}`;
          })
          .join('\n        ')}
        ${installSteps.map(([, t], i) => `tl.to("#v2-install-row-${i}", { opacity: 1, duration: 0.2, ease: "none" }, ${t});
        tl.to("#v2-install-check-${i}", { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2.4)" }, ${r2(t + 0.25)});`).join('\n        ')}
        tl.fromTo("#v2-install-done", { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)" }, 7.6);`
);

// --- settings (Options page capture) ---------------------------------------------------------
const SETTINGS_D = 8.4;
const optH = Number(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=height', '-of', 'csv=p=0', A('assets/v2/options.png')], { encoding: 'utf8' }).trim());
const optTravel = r2(Math.max(0, optH * SCALE - WIN.h));
const settingsRows = [
  ['Wait after an action', '0 to 4 seconds', 1.2],
  ['Pacing guard', 'on by default', 2.6],
  ['Promoted posts', 'left out', 3.4],
  ['Check my tab', 'if a site changes', 4.3],
];
const settings = page(
  'v2-settings',
  `
  .set-head { font: 700 24px "JetBrains Mono", monospace; color: ${C.muted}; letter-spacing: 0.08em; }
  .set-title { font-weight: 900; font-size: 60px; letter-spacing: -0.035em; line-height: 1.04; margin-top: 18px; }
  .set-list { margin-top: 40px; display: flex; flex-direction: column; gap: 20px; }
  .set-row { padding: 18px 24px; border-radius: 18px; border: 3px solid ${C.ink}; background: ${C.white}; box-shadow: 0 8px 0 ${C.ink}; }
  .set-row b { display: block; font-size: 32px; font-weight: 900; }
  .set-row span { display: block; margin-top: 6px; font: 700 24px "JetBrains Mono", monospace; color: ${C.teal}; }
  #v2-settings-page { position: absolute; left: 0; top: 0; width: ${WIN.w}px; height: ${r2(optH * SCALE)}px; }
  #v2-settings-page img { position: static; width: ${WIN.w}px; height: ${r2(optH * SCALE)}px; display: block; }`,
  `        <div id="v2-settings-dots" class="dots"></div>
        <div id="v2-settings-glow" class="glow" data-layout-allow-overflow=""></div>
        <div id="v2-settings-top" class="top"><div class="top-left">SWIPE MODE · OPTIONS</div><div class="top-right">REAL OPTIONS PAGE</div></div>
${windowHtml('v2-settings', `<svg viewBox="0 0 128 128">${LOGO.swipe.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</svg>`, 'Swipe Mode · Options', `            <div id="v2-settings-page"><img src="assets/v2/options.png" alt="" /></div>`)}
        <div id="v2-settings-panel" class="panel">
          <div id="v2-settings-head" class="set-head">RIGHT-CLICK THE ICON · OPTIONS</div>
          <div id="v2-settings-title" class="set-title">Make it yours</div>
          <div class="set-list">${settingsRows.map(([b, s], i) => `<div id="v2-settings-row-${i}" class="set-row"><b>${esc(b)}</b><span>${esc(s)}</span></div>`).join('')}</div>
        </div>
${railHtml('v2-settings')}`,
  `        const tl = gsap.timeline({ paused: true });
${ambient('v2-settings', SETTINGS_D)}
        for (let i = 0; i < ${RAIL.length}; i++) tl.set("#v2-settings-fill-" + i, { scaleX: 1 }, 0).set("#v2-settings-label-" + i, { color: "${C.teal}" }, 0);
        tl.fromTo("#v2-settings-top", { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power1.out" }, 0);
        tl.fromTo("#v2-settings-page", { y: 0 }, { y: -${optTravel}, duration: 5.6, ease: "sine.inOut" }, 0.9);
        tl.fromTo("#v2-settings-head", { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" }, 0.2);
        tl.fromTo("#v2-settings-title", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: "expo.out" }, 0.3);
        ${settingsRows.map(([, , t], i) => `tl.fromTo("#v2-settings-row-${i}", { opacity: 0, x: 40, rotation: 1.5 }, { opacity: 1, x: 0, rotation: 0, duration: 0.5, ease: "back.out(1.8)" }, ${t});`).join('\n        ')}`
);

// --- close ----------------------------------------------------------------------------------
const CLOSE_D = 7.4;
const close = page(
  'v2-close',
  `
  .ghost { position: absolute; left: -40px; bottom: -70px; font-weight: 900; font-size: 300px; letter-spacing: -0.04em; color: ${C.teal}; opacity: 0.12; white-space: nowrap; }
  .cl { position: absolute; left: 140px; top: 170px; width: 1100px; }
  .cl-icon { width: 150px; height: 150px; }
  .cl-icon svg { width: 100%; height: 100%; display: block; }
  .cl h1 { margin: 30px 0 0; font-weight: 900; font-size: 140px; line-height: 0.92; letter-spacing: -0.05em; }
  .cl p { margin: 22px 0 0; font-size: 58px; font-weight: 700; color: ${C.teal}; letter-spacing: -0.02em; }
  .cl-sites { display: flex; align-items: center; gap: 20px; margin-top: 46px; font-size: 34px; font-weight: 700; color: ${C.muted}; }
  .cl-sites i { width: 64px; height: 64px; display: block; }
  .cl-sites svg { width: 100%; height: 100%; display: block; }
  .addr-pill { display: inline-flex; align-items: center; gap: 16px; margin-top: 40px; padding: 18px 28px; border-radius: 18px; background: ${C.ink}; color: ${C.white}; font: 700 30px "JetBrains Mono", monospace; }
  .fine { position: absolute; left: 140px; bottom: 60px; font-size: 24px; color: ${C.muted}; }
  .stack { position: absolute; left: 1290px; top: 230px; width: 520px; height: 460px; }
  .card { position: absolute; left: 0; top: 0; width: 520px; height: 455px; border-radius: 18px; overflow: hidden; border: 3px solid ${C.ink}; box-shadow: 0 12px 0 ${C.ink}; background: ${C.white}; }
  .card img { display: block; width: 100%; height: 100%; }`,
  `        <div id="v2-close-dots" class="dots"></div>
        <div id="v2-close-glow" class="glow" data-layout-allow-overflow=""></div>
        <div id="v2-close-ghost" class="ghost" data-layout-allow-overflow="">YOUR CHOICE</div>
        <div class="stack">
          <div id="v2-close-c2" class="card"><img src="assets/v2/stills/card-linkedin.png" alt="" /></div>
          <div id="v2-close-c1" class="card"><img src="assets/v2/stills/card-x.png" alt="" /></div>
        </div>
        <div class="cl">
          <div id="v2-close-icon" class="cl-icon">${LOGO.swipe}</div>
          <h1 id="v2-close-title">Swipe Mode</h1>
          <p id="v2-close-tag">Every action stays your choice.</p>
          <div id="v2-close-sites" class="cl-sites">Works on <i>${LOGO.linkedin}</i> LinkedIn and <i>${LOGO.x}</i> X</div>
          <div id="v2-close-addr" class="addr-pill">${REPO}</div>
        </div>
        <div id="v2-close-fine" class="fine">Not affiliated with LinkedIn or X. Demo feeds with fictional people.</div>`,
  `        const tl = gsap.timeline({ paused: true });
${ambient('v2-close', CLOSE_D)}
        tl.fromTo("#v2-close-ghost", { x: 0 }, { x: -200, duration: ${CLOSE_D}, ease: "none" }, 0);
        tl.fromTo("#v2-close-c2", { opacity: 0, x: 80, rotation: 0 }, { opacity: 1, x: 30, rotation: 6, duration: 0.7, ease: "power3.out" }, 0.1);
        tl.fromTo("#v2-close-c1", { opacity: 0, x: 80, rotation: 0 }, { opacity: 1, x: 0, rotation: -3, duration: 0.7, ease: "power3.out" }, 0.25);
        tl.to("#v2-close-c1", { rotation: 1, duration: 5, ease: "sine.inOut" }, 1.0);
        tl.fromTo("#v2-close-icon", { opacity: 0, scale: 0.3, rotation: -25 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.7, ease: "back.out(2.4)" }, 0.2);
        tl.fromTo("#v2-close-title", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.55, ease: "expo.out" }, 0.45);
        tl.fromTo("#v2-close-tag", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, 1.4);
        tl.fromTo("#v2-close-sites", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, 2.3);
        tl.fromTo("#v2-close-addr", { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(2)" }, 2.9);
        tl.fromTo("#v2-close-fine", { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power1.out" }, 3.4);`
);

// --- assemble -------------------------------------------------------------------------------
const scenes = [
  { id: 'v2-hook', file: '01-hook.html', html: hook, D: HOOK_D, vo: [['01-hook', 0.5]] },
  { id: 'v2-install', file: '02-install.html', html: install, D: INSTALL_D, vo: [['02-install', 0.55]] },
  { id: 'v2-linkedin', file: '03-linkedin.html', html: linkedinScene.html, D: linkedinScene.D, vo: ['03-start', '04-read', '05-engage', '06-react', '07-comment'].map((b) => [b, linkedinScene.beatLocal(b) + 0.3]) },
  { id: 'v2-trust', file: '04-trust.html', html: trustScene.html, D: trustScene.D, vo: [['08-trust', trustScene.beatLocal('08-trust') + 0.2]] },
  { id: 'v2-x', file: '05-x.html', html: xScene.html, D: xScene.D, vo: ['09-x', '10-swipe', '11-exit'].map((b) => [b, xScene.beatLocal(b) + 0.3]) },
  { id: 'v2-settings', file: '06-settings.html', html: settings, D: SETTINGS_D, vo: [['12-settings', 0.6]] },
  { id: 'v2-close', file: '07-close.html', html: close, D: CLOSE_D, vo: [['13-close', 1.1]] },
];

fs.mkdirSync(A('compositions/v2'), { recursive: true });
let t = 0;
let voEnd = 0;
const hosts = [];
const audios = [];
const timing = [];
for (const s of scenes) {
  fs.writeFileSync(A(`compositions/v2/${s.file}`), s.html);
  const start = r2(t);
  hosts.push(`      <div id="${s.id}-host" data-composition-id="${s.id}" data-composition-src="compositions/v2/${s.file}" data-start="${start}" data-duration="${r2(s.D)}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>`);
  for (const [vid, local] of s.vo) {
    // Lines never overlap: footage drift can pull two beats closer than the recorder intended.
    const vs = r2(Math.max(start + local, voEnd + 0.25));
    voEnd = vs + VO[vid];
    // A line must finish inside its own scene: catch drift when recordings change.
    if (vs + VO[vid] > start + s.D + 0.05) console.warn(`warning: ${vid} runs ${r2(vs + VO[vid] - start - s.D)}s past ${s.id}`);
    audios.push(`      <audio id="vo-${vid}" src="assets/voice-v2/${vid}.wav" data-start="${vs}" data-duration="${r2(VO[vid])}" data-track-index="2" data-volume="1" data-audio-group="voiceover"></audio>`);
    timing.push({ vo: vid, start: vs, end: r2(vs + VO[vid]) });
  }
  timing.push({ scene: s.id, start, end: r2(start + s.D), mid: r2(start + s.D / 2) });
  t += s.D;
}
const TOTAL = r2(t);

// Music bed: the project's MusicGen track, trimmed to the film, faded in and out.
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', A('assets/bgm-v2/bed-long.wav'), '-t', String(TOTAL), '-af', `afade=t=in:d=1.2,afade=t=out:st=${r2(TOTAL - 3)}:d=3`, A('assets/bgm-v2/bed.wav')]);

const index = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>Swipe Mode — how to use (v2)</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      body { margin: 0; background: ${C.bg}; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; background: ${C.bg}; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-width="1920" data-height="1080" data-duration="${TOTAL}">
${hosts.join('\n')}
      <hf-audio-group id="voiceover" data-label="Voiceover" data-volume="1"></hf-audio-group>
${audios.join('\n')}
      <audio id="bgm" src="assets/bgm-v2/bed.wav" data-start="0" data-duration="${TOTAL}" data-track-index="3" data-volume="0.3"></audio>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
fs.writeFileSync(A('index.html'), index);
fs.writeFileSync(A('assets/v2/timing.json'), JSON.stringify({ total: TOTAL, timing }, null, 2));
console.log(`v2 film: ${TOTAL}s`);
for (const x of timing.filter((x) => x.scene)) console.log(`  ${x.scene.padEnd(12)} ${String(x.start).padStart(6)} → ${x.end}`);
