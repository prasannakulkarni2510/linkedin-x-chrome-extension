// Styles for the Swipe Mode shadow root. Isolated from LinkedIn's CSS in both directions.
(function (root) {
  'use strict';
  const css = `
:host { all: initial; }
* { box-sizing: border-box; }
[hidden] { display: none !important; }

/* LinkedIn's own palette and type, so the card reads as a LinkedIn post. */
.sm {
  --bg: rgba(0, 0, 0, 0.6);
  --card: #ffffff;
  --text: rgba(0, 0, 0, 0.9);
  --muted: rgba(0, 0, 0, 0.6);
  --line: #e8e8e8;
  --soft: #f4f2ee;
  --hover: rgba(0, 0, 0, 0.08);
  --flash: rgba(10, 102, 194, 0.16);
  --accent: #0a66c2;
  --accent-hover: #004182;
  --accent-ink: #ffffff;
  --skip: #b24020;
  --danger-soft: #fdecea;
  --shadow: 0 0 0 1px rgba(0, 0, 0, 0.08), 0 24px 64px rgba(0, 0, 0, 0.3);
  font: 14px/1.42857 -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "Fira Sans", Ubuntu, Oxygen, "Oxygen Sans", Cantarell, "Droid Sans", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Lucida Grande", Helvetica, Arial, sans-serif;
  color: var(--text);
}
@media (prefers-color-scheme: dark) {
  .sm {
    --bg: rgba(0, 0, 0, 0.75);
    --card: #1b1f23;
    --text: rgba(255, 255, 255, 0.9);
    --muted: rgba(255, 255, 255, 0.6);
    --line: #38434f;
    --soft: #000000;
    --hover: rgba(255, 255, 255, 0.08);
    --flash: rgba(113, 183, 251, 0.22);
    --accent: #71b7fb;
    --accent-hover: #a8d4ff;
    --accent-ink: #000000;
    --skip: #ff8a6b;
    --danger-soft: #3a1d1b;
  }
}
/* X's palette and type on x.com. */
.sm[data-site="x"] {
  --card: #ffffff;
  --text: #0f1419;
  --muted: #536471;
  --line: #eff3f4;
  --soft: #f7f9f9;
  --hover: rgba(15, 20, 25, 0.1);
  --flash: rgba(29, 155, 240, 0.16);
  --accent: #1d9bf0;
  --accent-hover: #1a8cd8;
  --accent-ink: #ffffff;
  --skip: #f4212e;
  --danger-soft: #fee7e9;
  font-family: "TwitterChirp", -apple-system, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 15px;
}
@media (prefers-color-scheme: dark) {
  .sm[data-site="x"] {
    --card: #000000;
    --text: #e7e9ea;
    --muted: #71767b;
    --line: #2f3336;
    --soft: #16181c;
    --hover: rgba(231, 233, 234, 0.1);
    --flash: rgba(29, 155, 240, 0.22);
    --accent: #1d9bf0;
    --accent-hover: #1a8cd8;
    --accent-ink: #ffffff;
    --skip: #f4212e;
    --danger-soft: #2a0f12;
  }
}

button { font: inherit; color: inherit; cursor: pointer; }
.kbd {
  display: inline-block; min-width: 1.6em; padding: 0 0.4em; border-radius: 5px;
  border: 1px solid var(--line); background: var(--soft); color: var(--muted);
  font: 600 11px/1.6 ui-monospace, "Cascadia Mono", Consolas, monospace; text-align: center;
}

/* Launcher */
.sm-launcher {
  position: fixed; left: 20px; bottom: 20px; z-index: 2147483646;
  display: flex; align-items: center; gap: 8px; padding: 10px 14px 10px 12px;
  border: 0; border-radius: 999px; background: var(--accent); color: var(--accent-ink);
  font-weight: 700; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}
.sm-launcher:hover { filter: brightness(1.08); }
.sm-launcher:focus-visible { outline: 3px solid #fbbf24; outline-offset: 2px; }
.sm-launcher svg { width: 18px; height: 18px; }

/* Overlay */
.sm-overlay {
  position: fixed; inset: 0; z-index: 2147483647; display: grid;
  grid-template-rows: auto 1fr; overscroll-behavior: none;
}
.sm-backdrop { position: absolute; inset: 0; background: var(--bg); backdrop-filter: blur(6px); }
.sm-topbar {
  position: relative; display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 14px 20px; color: #fff;
}
.sm-progress { font-weight: 650; font-size: 14px; opacity: 0.92; }
.sm-top-actions { display: flex; gap: 8px; }
.sm-icon-btn {
  display: flex; align-items: center; gap: 6px; height: 36px; padding: 0 12px;
  border-radius: 999px; border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.08); color: #fff; font-weight: 600; font-size: 13px;
}
.sm-icon-btn:hover { background: rgba(255, 255, 255, 0.18); }
.sm-icon-btn .kbd { background: transparent; color: rgba(255, 255, 255, 0.85); border-color: rgba(255, 255, 255, 0.35); }

.sm-stage { position: relative; display: grid; place-items: center; padding: 0 16px 20px; min-height: 0; }
.sm-card {
  position: relative; width: min(555px, 100%); min-height: 420px; max-height: min(860px, 100%);
  display: flex; flex-direction: column; background: var(--card); border-radius: 8px;
  box-shadow: var(--shadow); overflow: hidden; outline: none; touch-action: pan-y;
  will-change: transform;
}
.sm-ghost { position: absolute; pointer-events: none; z-index: 3; }
.sm-stage > .sm-stack, .sm-stage > .sm-card { grid-area: 1 / 1; }
.sm-stage > .sm-panel { grid-area: 1 / 1; }
.sm-card { z-index: 2; }
.sm-stack { align-self: center; background: var(--card); border-radius: 8px; box-shadow: var(--shadow); pointer-events: none; }
.sm-stack-1 { transform: translateY(14px) scale(0.96); opacity: 0.75; z-index: 1; }
.sm-stack-2 { transform: translateY(28px) scale(0.92); opacity: 0.45; z-index: 0; }
.sm-stage--no-card > .sm-stack { display: none; }
.sm-stamp {
  position: absolute; top: 28px; padding: 6px 16px; border: 4px solid; border-radius: 10px;
  font: 800 30px/1 -apple-system, system-ui, "Segoe UI", sans-serif; letter-spacing: 0.08em; background: rgba(255, 255, 255, 0.85);
}
.sm-stamp--left { right: 28px; color: #b24020; transform: rotate(14deg); }
.sm-stamp--right { left: 28px; color: #057642; transform: rotate(-14deg); }
.sm-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 12px 16px 8px; }
.sm-context { font-size: 12px; color: var(--muted); padding-bottom: 8px; margin: 0 -16px 12px; padding-left: 16px; border-bottom: 1px solid var(--line); }
.sm-author { display: flex; gap: 8px; align-items: flex-start; margin: -6px -8px 6px; padding: 6px 8px; border-radius: 8px; }
.sm-progress { display: inline-block; transform-origin: 0 50%; }
.sm-avatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; flex: none; background: var(--soft); display: grid; place-items: center; font-weight: 600; color: var(--muted); }
.sm-author-meta { min-width: 0; }
.sm-name { font-weight: 600; font-size: 14px; line-height: 1.43; }
.sm-headline, .sm-time { font-size: 12px; line-height: 1.33; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sm[data-site="linkedin"] .sm-time::after { content: " \\00B7  \\1F310"; }
.sm-badges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.sm-badge { font-size: 12px; font-weight: 600; padding: 0 8px; border-radius: 4px; background: var(--soft); color: var(--muted); }
.sm-badge--done { background: var(--accent); color: var(--accent-ink); }
.sm-more { display: inline-flex; align-items: center; gap: 6px; margin-top: 4px; padding: 0; border: 0; background: none; color: var(--accent); font-weight: 600; }
.sm-more:hover { text-decoration: underline; }
.sm-text { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 14px; line-height: 1.43; user-select: text; }
.sm-media { margin: 8px -16px 0; display: grid; gap: 2px; }
.sm-media img { width: 100%; border-radius: 0; display: block; background: var(--soft); }
.sm-media--grid { grid-template-columns: 1fr 1fr; }
.sm-placeholder {
  position: relative; border-radius: 12px; overflow: hidden; background: #111; color: #fff;
  min-height: 140px; display: grid; place-items: center; text-align: center;
}
.sm-placeholder img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.55; border-radius: 0; }
.sm-placeholder span { position: relative; font-weight: 650; padding: 8px 14px; background: rgba(0, 0, 0, 0.55); border-radius: 999px; }
.sm-article { display: block; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; color: inherit; text-decoration: none; }
.sm-article img { border-radius: 0; }
.sm-article-title { font-weight: 700; padding: 10px 14px 0; }
.sm-article-sub { font-size: 13px; color: var(--muted); padding: 0 14px 12px; }
.sm-reshare { border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; }
.sm-reshare-author { font-weight: 700; margin-bottom: 4px; }
.sm-poll { border: 1px dashed var(--line); border-radius: 12px; padding: 12px 14px; white-space: pre-wrap; }

.sm-footer { border-top: 1px solid var(--line); background: var(--card); }
.sm-social { display: flex; justify-content: space-between; padding: 4px 8px; }
.sm-social-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; min-height: 48px;
  border: 0; border-radius: 4px; background: transparent; color: var(--muted); font-weight: 600; font-size: 14px;
}
.sm-social-btn:hover { background: var(--hover); color: var(--text); }
.sm-social-btn svg { width: 20px; height: 20px; }
.sm-social-key { font-size: 10px; min-width: 1.4em; }
.sm-swipe-row {
  display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px;
  padding: 10px 16px 12px; border-top: 1px solid var(--line);
}
/* Grab handles: drag here to swipe without selecting text. */
.sm-grip {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  color: var(--muted); font-size: 12px; font-weight: 600;
  cursor: grab; user-select: none; -webkit-user-select: none; touch-action: none;
}
.sm-grip svg { width: 8px; height: 12px; opacity: 0.7; flex: none; }
.sm-grip:hover { color: var(--text); background: var(--hover); }
.sm-grip--top { flex: none; height: 28px; border-bottom: 1px solid var(--line); background: var(--soft); }
.sm-grip--row { align-self: stretch; min-height: 40px; border-radius: 20px; border: 1px dashed var(--line); }
.sm-card.is-dragging, .sm-card.is-dragging * { cursor: grabbing !important; user-select: none !important; }
.sm-author, .sm-context, .sm-badges, .sm-footer { user-select: none; -webkit-user-select: none; }
.sm-btn {
  display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 18px; border-radius: 24px;
  border: 1px solid var(--muted); background: transparent; font-weight: 600; font-size: 16px; color: var(--muted);
}
.sm-btn:hover { background: var(--hover); }
.sm-btn--skip { color: var(--muted); }
.sm-btn--engage { background: var(--accent); color: var(--accent-ink); border-color: transparent; }
.sm-btn--engage:hover { background: var(--accent-hover); }
.sm-btn:focus-visible, .sm-item:focus-visible, .sm-icon-btn:focus-visible { outline: 3px solid #fbbf24; outline-offset: 2px; }
.sm-quick { display: flex; justify-content: center; flex-wrap: wrap; gap: 10px; font-size: 12px; color: var(--muted); }
.sm-quick span { display: inline-flex; align-items: center; gap: 4px; }

.sm-swipe-hint {
  position: absolute; top: 22px; padding: 6px 14px; border-radius: 10px; border: 3px solid;
  font-weight: 800; letter-spacing: 0.08em; opacity: 0; pointer-events: none; transform: rotate(-8deg);
}
.sm-swipe-hint--skip { right: 22px; color: #b24020; transform: rotate(10deg); font-size: 22px; background: rgba(255, 255, 255, 0.85); z-index: 4; }
.sm-swipe-hint--engage { left: 22px; color: var(--accent); transform: rotate(-10deg); font-size: 22px; background: rgba(255, 255, 255, 0.85); z-index: 4; }

/* Sheets inside the card */
.sm-sheet {
  position: absolute; left: 0; right: 0; bottom: 0; background: var(--card);
  border-top: 1px solid var(--line); border-radius: 18px 18px 0 0; padding: 14px 16px 16px;
  box-shadow: 0 -12px 32px rgba(0, 0, 0, 0.12);
}
.sm-sheet-title { display: flex; justify-content: space-between; align-items: center; font-weight: 750; margin-bottom: 8px; }
.sm-sheet-title small { font-weight: 500; color: var(--muted); }
.sm-items { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.sm-item {
  display: flex; align-items: center; gap: 10px; min-height: 42px; padding: 6px 12px; text-align: left;
  border: 1px solid var(--line); border-radius: 12px; background: var(--soft); font-weight: 600;
}
.sm-item:hover { border-color: var(--accent); }
.sm-reactions { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; }
.sm-reaction { flex-direction: column; justify-content: center; gap: 2px; padding: 8px 4px; font-size: 12px; }
.sm-reaction .sm-emoji { font-size: 26px; line-height: 1.1; }
.sm-reaction.is-current { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
.sm-remove { margin-top: 8px; width: 100%; justify-content: center; }
.sm-composer textarea {
  width: 100%; min-height: 110px; resize: vertical; padding: 10px 12px; border-radius: 12px;
  border: 1px solid var(--line); background: var(--soft); color: var(--text); font: inherit;
}
.sm-composer textarea:focus { outline: 2px solid var(--accent); }
.sm-composer-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 8px; }
.sm-count { font-size: 12px; color: var(--muted); }
.sm-row-btns { display: flex; gap: 8px; }
.sm-busy {
  position: absolute; inset: auto 0 0 0; padding: 14px 16px; background: var(--card); border-top: 1px solid var(--line);
  display: flex; align-items: center; gap: 10px; font-weight: 650;
}
.sm-spinner { width: 18px; height: 18px; border-radius: 50%; border: 3px solid var(--line); border-top-color: var(--accent); animation: sm-spin 0.8s linear infinite; }
@keyframes sm-spin { to { transform: rotate(360deg); } }

/* Panels replacing the card */
.sm-panel {
  width: min(520px, 100%); background: var(--card); border-radius: 18px; box-shadow: var(--shadow);
  padding: 28px; text-align: center;
}
.sm-panel h2 { margin: 0 0 6px; font-size: 20px; }
.sm-panel p { margin: 0 0 18px; color: var(--muted); }
.sm-panel .sm-row-btns { justify-content: center; }

/* Dialogs over the card */
.sm-modal-layer { position: absolute; inset: 0; z-index: 6; display: grid; place-items: center; padding: 16px; background: rgba(0, 0, 0, 0.18); }
.sm-dialog { width: min(440px, 100%); background: var(--card); border-radius: 16px; box-shadow: var(--shadow); padding: 22px; }
.sm-dialog h2 { margin: 0 0 6px; font-size: 18px; }
.sm-dialog p { margin: 0 0 16px; color: var(--muted); }
.sm-dialog--failure { border-top: 5px solid var(--skip); }
.sm-help { width: min(560px, 100%); max-height: 100%; overflow: auto; background: var(--card); border-radius: 16px; box-shadow: var(--shadow); padding: 22px; }
.sm-help h2 { margin: 0 0 12px; font-size: 18px; }
.sm-help dl { display: grid; grid-template-columns: auto 1fr; gap: 8px 14px; margin: 0; }
.sm-help dt { text-align: right; }
.sm-help dd { margin: 0; }
.sm-help-foot { margin-top: 14px; font-size: 12px; color: var(--muted); }

.sm-toast {
  position: absolute; left: 50%; bottom: 28px; transform: translateX(-50%); min-width: 260px; max-width: min(560px, 92vw);
  background: #17201d; color: #fff; border-radius: 12px; padding: 12px 16px; box-shadow: var(--shadow);
  font-weight: 600; overflow: hidden;
}
.sm-toast--success { background: #0b5d56; }
.sm-toast--warn { background: #7a4a07; }
.sm-toast-bar { position: absolute; left: 0; bottom: 0; height: 3px; background: rgba(255, 255, 255, 0.85); width: 100%; transform-origin: left; }
.sm-toast-bar.is-running { animation: sm-shrink linear forwards; }
@keyframes sm-shrink { from { transform: scaleX(1); } to { transform: scaleX(0); } }

.sm-native-pill {
  position: fixed; top: 14px; left: 50%; transform: translateX(-50%); z-index: 2147483647;
  background: #17201d; color: #fff; border-radius: 999px; padding: 10px 18px; font-weight: 650;
  box-shadow: var(--shadow); pointer-events: none;
}
.sm-overlay[data-mode="native"] { pointer-events: none; }
.sm-overlay[data-mode="native"] > :not(.sm-native-pill) { display: none; }

.sm-live { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }

@media (max-width: 640px) {
  .sm-items { grid-template-columns: 1fr; }
  .sm-grip--row span, .sm-social-key { display: none; }
  .sm-reactions { grid-template-columns: repeat(3, 1fr); }
}
`;
  (root.SwipeMode = root.SwipeMode || {}).styles = { css };
})(globalThis);
