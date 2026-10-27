// Tweet screenshots: a camera button on every post opens a side panel where you pick replies and
// save the post plus those replies as one 1:1 PNG (see shot-render.js), meme style, white
// background. Replies are read from the post's own page, so on the timeline the panel offers to
// open it. Works on its own, with or without Swipe Mode running. Nothing is posted or clicked on X
// except the post's own link when you ask to open it.
(function (root) {
  'use strict';
  const NS = root.SwipeMode;
  const { SEL } = NS.selectors;
  const det = NS.detector;
  const dom = NS.dom;
  const { render } = NS.shotRender;

  const MARK = 'data-sm-shot';
  const PENDING_KEY = 'swipe-mode:shot-open';
  const statusIdFromPath = () => (/\/status\/(\d+)/.exec(location.pathname) || [])[1] || null;
  const idOf = (rec) => (rec && rec.keys[0] && rec.keys[0].startsWith('x:') ? rec.keys[0].slice(2) : null);

  // --- reading posts ---------------------------------------------------------------------
  // Post text as shown: X draws emoji as <img alt="😀">, which innerText drops, and hides parts
  // of long links ("https://", the tail after "…"), which textContent keeps.
  function richText(el) {
    if (!el) return '';
    let out = '';
    const walk = (node) => {
      for (const n of node.childNodes) {
        if (n.nodeType === 3) out += n.nodeValue;
        else if (n.nodeType === 1) {
          if (n.tagName === 'IMG') out += n.getAttribute('alt') || '';
          else if (n.tagName === 'BR') out += '\n';
          else if (n.getClientRects().length || !n.isConnected) walk(n);
        }
      }
    };
    walk(el);
    return out.replace(/\n{3,}/g, '\n\n').trim();
  }

  // Gradient stops: a saturated one means gold, all muted means grey.
  function badgeColor(svg) {
    const stops = Array.from(svg.querySelectorAll('stop')).map((s) => getComputedStyle(s).stopColor);
    if (stops.length) {
      const vivid = stops.some((c) => {
        const [r, g, b] = (c.match(/\d+/g) || []).map(Number);
        return Math.max(r, g, b) - Math.min(r, g, b) > 80;
      });
      return vivid ? '#e2b719' : '#829aab';
    }
    return getComputedStyle(svg).color || '#1d9bf0'; // blue: the path fills with currentColor
  }

  const bigger = (url) => (url || '').replace(/_(normal|bigger|mini)(\.\w+)(\?|$)/, '_200x200$2$3').replace(/([?&]name=)\w+/, '$1medium');

  function snapshot(el) {
    const rec = det.extract(el);
    if (!rec) return null;
    const quoteEl = det.quoteOf(el);
    const excl = quoteEl ? [quoteEl] : [];
    const userEl = dom.qOwn(el, SEL.userName, excl);
    const badgeEl = userEl && dom.q(userEl, SEL.verified);
    const images = rec.images.slice();
    if (rec.video && rec.video.poster && images.length < 4) images.push(rec.video.poster);
    return {
      id: idOf(rec),
      url: rec.url,
      pageY: rec.pageY,
      name: rec.author.name,
      handle: rec.author.headline,
      time: rec.author.time,
      verified: badgeEl ? badgeColor(badgeEl) : null,
      text: richText(dom.qOwn(el, SEL.text, excl)) || rec.text,
      continues: !!rec.continues,
      promoted: !!rec.promoted,
      avatarUrl: bigger(rec.author.avatarUrl),
      thumbUrl: rec.author.avatarUrl,
      imageUrls: images.map(bigger),
      quote: rec.reshare && (rec.reshare.author || rec.reshare.text) ? { author: rec.reshare.author, text: richText(dom.q(quoteEl, SEL.text)) || rec.reshare.text } : null,
    };
  }

  // On a post's page: the post itself, and the posts below it up to X's next section heading
  // ("Discover more", which lists recommended posts, not replies). Ads are left out. X unmounts
  // posts far from the viewport, so replies are remembered once seen.
  const follows = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

  function readThread(mainId, seen) {
    const els = det.findPostElements(document);
    const focal = els.find((el) => idOf(det.extract(el) || null) === mainId);
    if (!focal) return null;
    const end = dom.qa(document, SEL.sectionHeading).find((hd) => !hd.closest('article') && follows(focal, hd));
    for (const el of els) {
      if (el === focal || !follows(focal, el) || (end && follows(end, el))) continue;
      const s = snapshot(el);
      if (s && s.id && s.id !== mainId && !s.promoted) seen.set(s.id, s);
    }
    return focal;
  }

  // Waits for the post, then for its replies to stop arriving, scrolling down `scrolls` screens
  // for more. Returns plain snapshots (no elements), so they can travel between tabs.
  async function readForOtherTab(id, scrolls, mainOnly) {
    const seen = new Map();
    const found = await dom.waitFor(() => readThread(id, seen), { timeout: 15000, interval: 250 });
    if (!found) return { status: 'error', error: 'The post didn’t appear on its page.' };
    if (mainOnly) return { status: 'ok', main: snapshot(found), replies: [] };
    const settle = async () => {
      let last = -1;
      for (let i = 0; i < 12 && seen.size !== last; i++) {
        last = seen.size;
        await dom.sleep(700);
        readThread(id, seen);
      }
    };
    await settle();
    for (let i = 0; i < scrolls; i++) {
      window.scrollBy({ top: window.innerHeight * 1.5, behavior: 'instant' });
      await settle();
    }
    // The post as its own page shows it: the timeline cuts long posts off at "Show more".
    const focal = readThread(id, seen) || found;
    return { status: 'ok', main: focal.isConnected ? snapshot(focal) : null, replies: Array.from(seen.values()) };
  }

  // --- images ------------------------------------------------------------------------------
  // X's image hosts don't allow reading pixels from x.com, so the service worker fetches them.
  const imageCache = new Map();
  function loadImage(url) {
    if (!url) return Promise.resolve(null);
    if (!imageCache.has(url)) {
      const decode = async (src, cors) => {
        const img = new Image();
        if (cors) img.crossOrigin = 'anonymous';
        img.src = src;
        await img.decode();
        return img;
      };
      const p = (async () => {
        if (url.startsWith('data:')) return decode(url);
        const res = await chrome.runtime.sendMessage({ type: 'swipe-mode:fetch-image', url }).catch(() => null);
        if (res && res.status === 'ok') return decode(res.dataUrl);
        // Fallback: X's image hosts usually allow CORS reads too. A smaller avatar beats none.
        return decode(url, true).catch(() => decode(url.replace('_200x200', '_normal'), true));
      })().catch(() => null);
      imageCache.set(url, p);
    }
    return imageCache.get(url);
  }

  async function toDrawable(s) {
    const [avatar, ...images] = await Promise.all([loadImage(s.avatarUrl), ...s.imageUrls.map(loadImage)]);
    return Object.assign({}, s, { avatar, images: images.filter(Boolean) });
  }

  // --- panel -------------------------------------------------------------------------------
  const CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
[hidden] { display: none !important; }
.p {
  --bg: #ffffff; --text: #0f1419; --muted: #536471; --line: #eff3f4; --soft: #f7f9f9; --accent: #1d9bf0; --hover: rgba(15,20,25,.06);
  position: fixed; top: 0; right: 0; bottom: 0; width: min(400px, 100vw); display: flex; flex-direction: column;
  background: var(--bg); color: var(--text); border-left: 1px solid var(--line); box-shadow: -8px 0 32px rgba(0,0,0,.18);
  font: 15px/1.35 "TwitterChirp", -apple-system, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
@media (prefers-color-scheme: dark) {
  .p { --bg: #000000; --text: #e7e9ea; --muted: #71767b; --line: #2f3336; --soft: #16181c; --hover: rgba(231,233,234,.08); }
}
button { font: inherit; color: inherit; cursor: pointer; }
.head { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-bottom: 1px solid var(--line); }
.head h2 { flex: 1; margin: 0; font-size: 18px; font-weight: 800; }
.x { border: 0; background: none; width: 34px; height: 34px; border-radius: 50%; font-size: 18px; }
.x:hover { background: var(--hover); }
.scroll { flex: 1; overflow-y: auto; overscroll-behavior: contain; }
.preview { display: block; width: calc(100% - 32px); aspect-ratio: 1; margin: 16px; border-radius: 12px; border: 1px solid var(--line); background: #fff; }
.opt { display: flex; align-items: center; gap: 8px; padding: 0 16px 12px; color: var(--muted); font-size: 14px; }
.sec { padding: 12px 16px 6px; border-top: 1px solid var(--line); display: flex; align-items: baseline; gap: 8px; }
.sec b { font-size: 16px; }
.sec span { color: var(--muted); font-size: 13px; }
.note { margin: 6px 16px 12px; padding: 12px; border-radius: 12px; background: var(--soft); color: var(--muted); font-size: 14px; }
.note button { display: block; margin-top: 10px; }
.reply { display: flex; gap: 10px; align-items: flex-start; padding: 10px 16px; cursor: pointer; }
.reply:hover { background: var(--hover); }
.reply input { margin: 12px 0 0; width: 18px; height: 18px; accent-color: var(--accent); flex: none; }
.reply .av { width: 36px; height: 36px; border-radius: 50%; flex: none; object-fit: cover; background: var(--line); }
.reply .t { flex: 1; }
.reply .ph { display: flex; gap: 4px; margin-top: 6px; }
.reply .ph img { flex: 1; min-width: 0; height: 96px; object-fit: cover; border-radius: 10px; border: 1px solid var(--line); background: var(--soft); }
.reply .ph img:only-child { height: auto; max-height: 180px; }
.rm { flex: none; border: 0; background: none; width: 28px; height: 28px; border-radius: 50%; color: var(--muted); font-size: 13px; opacity: 0; }
.reply:hover .rm, .reply.is-cur .rm { opacity: 1; }
.rm:hover { background: var(--hover); color: #f4212e; }
.help { margin: 0 16px 12px; padding: 10px 12px; border-radius: 12px; background: var(--soft); display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; font-size: 13px; }
.help dt { margin: 0; white-space: nowrap; }
.help dd { margin: 0; color: var(--muted); }
.reply .t { min-width: 0; font-size: 14px; }
.reply .n { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.reply .n span { font-weight: 400; color: var(--muted); }
.reply .s { color: var(--text); white-space: pre-wrap; overflow-wrap: anywhere; }
.reply .cut { margin-top: 4px; font-size: 12px; color: var(--muted); font-style: italic; }
.reply.is-cur { box-shadow: inset 3px 0 0 var(--accent); background: var(--hover); }
.reply .num { width: 14px; margin-top: 11px; flex: none; font-size: 12px; color: var(--muted); text-align: center; }
kbd { display: inline-block; min-width: 18px; padding: 0 5px; border: 1px solid var(--line); border-bottom-width: 2px; border-radius: 5px; font-family: inherit; font-size: 11px; font-weight: 600; line-height: 16px; color: var(--muted); text-align: center; background: var(--bg); }
.save kbd { color: inherit; background: transparent; border-color: currentColor; opacity: .7; margin-left: 6px; vertical-align: 1px; }
.pill kbd { margin-left: 4px; }
.opt kbd { margin-left: auto; }
.keys { display: flex; flex-wrap: wrap; gap: 4px 12px; padding: 0 16px 8px; font-size: 12px; color: var(--muted); }
.foot { border-top: 1px solid var(--line); padding: 12px 16px 16px; }
.where { color: var(--muted); font-size: 13px; margin-bottom: 10px; }
.link { border: 0; background: none; padding: 0; color: var(--accent); font-size: 13px; }
.link:hover { text-decoration: underline; }
.pill { border: 1px solid var(--line); background: transparent; border-radius: 999px; padding: 7px 16px; font-weight: 700; }
.save { width: 100%; border: 0; border-radius: 999px; padding: 12px; font-weight: 700; font-size: 16px; background: var(--text); color: var(--bg); }
.save:disabled { opacity: .5; cursor: default; }
.msg { min-height: 1.3em; margin-top: 8px; font-size: 13px; color: var(--muted); }
.msg.ok { color: #00ba7c; }
.msg.err { color: #f4212e; }
`;

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    kids.flat().forEach((c) => c != null && c !== false && el.append(c.nodeType ? c : document.createTextNode(String(c))));
    return el;
  }

  let panel = null; // { host, main, replies: Map, picked: Set, ... }

  function closePanel() {
    if (!panel) return;
    const p = panel;
    p.host.remove();
    panel = null;
    if (p.opts.onClose) p.opts.onClose();
  }

  // opts.onClose: called once when the panel closes (Swipe Mode uses it to return to the card).
  function openPanel(el, opts) {
    const main = snapshot(el);
    if (!main) return false;
    closePanel();
    opts = opts || {};
    const host = h('div', { id: 'swipe-mode-shot', style: 'all: initial; position: fixed; z-index: 2147483647;' });
    const shadow = host.attachShadow({ mode: 'open' });
    const ui = {
      preview: h('canvas', { class: 'preview', 'data-sm': 'shot-preview', role: 'img', 'aria-label': 'Screenshot preview' }),
      images: h('input', { type: 'checkbox', checked: true, onchange: () => schedule() }),
      count: h('span'),
      list: h('div', { 'data-sm': 'shot-replies' }),
      away: h('div', { class: 'note', hidden: true, 'data-sm': 'shot-away' }),
      help: h(
        'dl',
        { class: 'help', hidden: true, 'data-sm': 'shot-help' },
        [
          ['↑ ↓ or J K', 'Move through replies'],
          ['Space or X', 'Pick or unpick the highlighted reply'],
          ['1–9', 'Pick or unpick that reply'],
          ['R', 'Remove the reply from the list; the next one takes its place'],
          ['U', 'Bring back the last removed reply'],
          ['I', 'Photos on or off'],
          ['M', 'Load more replies'],
          ['Enter', 'Save, then back to the card'],
          ['S', 'Save and stay here'],
          ['F', 'Change the folder'],
          ['?', 'Show or hide this list'],
          ['Esc or P', 'Close'],
        ].flatMap(([k, t]) => [h('dt', null, h('kbd', { text: k })), h('dd', { text: t })])
      ),
      empty: h('div', { class: 'note', hidden: true, text: 'No replies loaded yet. Press M to load more.' }),
      where: h('div', { class: 'where' }),
      save: h('button', { class: 'save', type: 'button', 'data-sm': 'shot-save', onclick: () => save(true) }, 'Save screenshot ', h('kbd', { text: 'Enter' })),
      msg: h('div', { class: 'msg', role: 'status', 'data-sm': 'shot-msg' }),
    };
    shadow.append(
      h('style', { text: CSS }),
      h(
        'div',
        { class: 'p', role: 'dialog', 'aria-label': 'Tweet screenshot', 'data-sm': 'shot-panel' },
        h('div', { class: 'head' }, h('h2', { text: 'Screenshot' }), h('kbd', { text: 'Esc' }), h('button', { class: 'x', type: 'button', 'aria-label': 'Close', onclick: closePanel }, '✕')),
        h(
          'div',
          { class: 'scroll' },
          ui.preview,
          h('label', { class: 'opt' }, ui.images, 'Include photos', h('kbd', { text: 'I' })),
          h('div', { class: 'sec' }, h('b', { text: 'Add replies' }), ui.count),
          h('div', { class: 'keys' }, [['↑↓', 'move'], ['Space', 'pick'], ['1–9', 'pick reply'], ['R', 'remove'], ['Enter', 'save & back'], ['?', 'all keys']].map(([k, t]) => h('span', null, h('kbd', { text: k }), ' ' + t))),
          ui.help,
          ui.away,
          ui.empty,
          ui.list
        ),
        h('div', { class: 'foot' }, ui.where, ui.save, ui.msg)
      )
    );
    // Keys typed in the panel must not reach X's single-letter shortcuts.
    host.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing || e.code === 'Tab') return;
      if (key({ code: e.code, shift: e.shiftKey, help: e.key === '?' || (e.code === 'Slash' && e.shiftKey) })) e.preventDefault();
    });
    document.documentElement.append(host);
    panel = { host, ui, main, opts, replies: new Map(), picked: new Set(), removed: [], cursor: 0, timer: 0, version: 0, remote: null };
    refreshReplies();
    refreshFolder();
    schedule(0);
    if (!onPostPage()) loadRemote(0);
    ui.save.focus();
    return true;
  }

  const onPostPage = () => panel && statusIdFromPath() === panel.main.id;

  // Not on the post's page: read its replies through a background tab (see the service worker),
  // so Swipe Mode and the timeline stay where they are. scrolls: how far down to read.
  async function loadRemote(scrolls) {
    const p = panel;
    if (!p || !p.main.id || !p.main.url) return showAway('This post has no link to read replies from.');
    p.remote = { scrolls, loading: true };
    showAway('Loading replies from the post…');
    let res = null;
    try {
      res = await chrome.runtime.sendMessage({ type: 'swipe-mode:shot-thread', url: p.main.url, id: p.main.id, scrolls });
    } catch (_) {}
    if (panel !== p) return;
    p.remote.loading = false;
    if (!res || res.status !== 'ok') return showAway('Couldn’t load the replies. ' + ((res && res.error) || ''), true);
    if (res.main && res.main.text.length > p.main.text.length) {
      p.main = Object.assign({}, p.main, { text: res.main.text, continues: false });
      schedule();
    }
    for (const r of res.replies) if (r.id && !p.replies.has(r.id)) p.replies.set(r.id, r);
    refreshReplies();
    const more = scrolls < 6 ? h('button', { class: 'pill', type: 'button', 'data-sm': 'shot-more', onclick: () => loadRemote(scrolls + 2) }, 'Load more replies ', h('kbd', { text: 'M' })) : null;
    showAway(p.replies.size ? `${p.replies.size} replies loaded from the post.` : 'No replies on this post yet.', false, more);
  }

  // More replies: from the background tab, or on the post's own page by scrolling the page (which
  // sits under Swipe Mode, out of reach of the mouse wheel) to its last reply so X loads the next.
  function loadMore() {
    if (!onPostPage()) {
      const more = panel.ui.away.querySelector('[data-sm="shot-more"]');
      if (more) more.click();
      return;
    }
    const els = det.findPostElements(document);
    const last = els[els.length - 1];
    if (last) last.scrollIntoView({ block: 'start', behavior: 'instant' });
    window.scrollBy({ top: window.innerHeight, behavior: 'instant' });
    const before = shown().length;
    say('Loading more replies…');
    const p = panel;
    setTimeout(() => {
      if (panel !== p) return;
      refreshReplies();
      const added = shown().length - before;
      say(added > 0 ? `${added} more ${added === 1 ? 'reply' : 'replies'} loaded.` : 'No more replies loaded. Press M again to keep looking.');
    }, 1500);
  }

  function showAway(text, failed, extra) {
    if (!panel) return;
    const { away } = panel.ui;
    away.hidden = false;
    const retry = failed ? h('button', { class: 'pill', type: 'button', onclick: () => loadRemote(panel.remote ? panel.remote.scrolls : 0), text: 'Try again' }) : null;
    // Outside Swipe Mode you can also just go to the post.
    const go = failed && !panel.opts.onClose ? h('button', { class: 'pill', type: 'button', onclick: () => openPost(), text: 'Open the post' }) : null;
    away.replaceChildren(text, extra || '', retry || '', go || '');
  }

  // Opens the post's page in this tab (X's own link, so X's router handles it) and reopens the
  // panel there.
  function openPost() {
    const id = panel && panel.main.id;
    const el = id && det.findPostElements(document).find((e) => idOf(det.extract(e) || null) === id);
    const link = el && el.querySelector(`a[href*="/status/${id}"]:has(time)`);
    if (!link) return say('Could not find the post’s link on this page.', 'err');
    try {
      sessionStorage.setItem(PENDING_KEY, id);
    } catch (_) {}
    closePanel();
    link.click();
  }

  function refreshReplies() {
    if (!panel) return;
    const onPage = onPostPage() && readThread(panel.main.id, panel.replies);
    if (onPage && panel.main.continues) {
      const full = snapshot(onPage);
      if (full && full.text.length > panel.main.text.length) {
        panel.main = Object.assign({}, panel.main, { text: full.text, continues: false });
        schedule();
      }
    }
    const { ui, picked } = panel;
    const list = shown();
    ui.empty.hidden = !onPage || list.length > 0;
    updateCount();
    const ids = list.map((r) => r.id).join();
    if (ui.list.dataset.ids === ids) return;
    ui.list.dataset.ids = ids;
    ui.list.replaceChildren(
      ...list.map((r, i) =>
        h(
          'label',
          { class: 'reply', 'data-sm': 'shot-reply', 'data-id': r.id },
          h('input', {
            type: 'checkbox',
            tabindex: '-1',
            checked: picked.has(r.id),
            onchange: (e) => setPicked(r.id, e.target.checked),
          }),
          h('span', { class: 'num', text: i < 9 ? String(i + 1) : '' }),
          r.thumbUrl ? h('img', { class: 'av', src: r.thumbUrl, alt: '' }) : h('img', { class: 'av', alt: '' }),
          h(
            'div',
            { class: 't' },
            h('div', { class: 'n' }, r.name + ' ', h('span', { text: r.handle })),
            r.text ? h('div', { class: 's', text: r.text }) : null,
            r.continues ? h('div', { class: 'cut', 'data-sm': 'shot-cut', text: 'X cut this reply off. Picking it loads the rest.' }) : null,
            r.imageUrls.length
              ? h('div', { class: 'ph', 'data-sm': 'shot-reply-photo' }, r.imageUrls.slice(0, 4).map((u) => h('img', { src: u, alt: 'Photo in this reply', loading: 'lazy' })))
              : null
          ),
          h('button', {
            class: 'rm',
            type: 'button',
            tabindex: '-1',
            title: 'Remove from the list (R)',
            'aria-label': 'Remove ' + r.name + ' from the list',
            text: '✕',
            onclick: (e) => {
              e.preventDefault();
              removeAt(rows().findIndex((row) => row.dataset.id === r.id));
            },
          })
        )
      )
    );
    moveCursor(0);
  }

  const rows = () => (panel ? Array.from(panel.ui.list.children) : []);

  // Replies in page order, minus the ones you removed with R.
  function shown() {
    const gone = new Set(panel.removed.map((x) => x.id));
    return Array.from(panel.replies.values())
      .filter((r) => !gone.has(r.id))
      .sort((a, b) => a.pageY - b.pageY);
  }

  function updateCount() {
    const n = shown().length;
    panel.ui.count.textContent = n ? `${panel.picked.size} of ${n} picked` : '';
  }

  // R takes the reply out of the list. The next reply moves into its place and gets the highlight;
  // if the removed one was picked, the next one is picked instead, so the image keeps the same
  // number of replies. U brings the last removed reply back.
  function removeAt(i) {
    const row = rows()[i];
    if (!row) return;
    const id = row.dataset.id;
    const wasPicked = panel.picked.delete(id);
    const entry = { id, wasPicked, replacement: null };
    panel.removed.push(entry);
    panel.cursor = i;
    refreshReplies();
    const next = rows()[panel.cursor];
    if (wasPicked && next && !panel.picked.has(next.dataset.id)) {
      entry.replacement = next.dataset.id;
      setPicked(next.dataset.id, true);
    } else {
      updateCount();
      schedule();
    }
  }

  function restoreLast() {
    const entry = panel.removed.pop();
    if (!entry) return;
    if (entry.replacement) panel.picked.delete(entry.replacement);
    if (entry.wasPicked) panel.picked.add(entry.id);
    refreshReplies();
    rows().forEach((row) => (row.querySelector('input').checked = panel.picked.has(row.dataset.id)));
    panel.cursor = Math.max(0, rows().findIndex((row) => row.dataset.id === entry.id));
    moveCursor(0);
    updateCount();
    schedule();
  }

  function setPicked(id, on) {
    const { picked } = panel;
    if (on) picked.add(id);
    else picked.delete(id);
    if (on) expandReply(panel.replies.get(id));
    const row = rows().find((r) => r.dataset.id === id);
    if (row) row.querySelector('input').checked = on;
    updateCount();
    schedule();
  }

  // X cuts long replies off at "Show more", like long posts. The reply's own page has all of it.
  // Fetches run one after another (each opens a background tab); saving waits for them.
  function expandReply(r) {
    const p = panel;
    if (!r || !r.continues || r.expanding || !r.url) return;
    r.expanding = true;
    markCut(r);
    p.expandQueue = (p.expandQueue || Promise.resolve()).then(async () => {
      let res = null;
      try {
        res = await chrome.runtime.sendMessage({ type: 'swipe-mode:shot-thread', url: r.url, id: r.id, mainOnly: true });
      } catch (_) {}
      r.expanding = false;
      if (res && res.status === 'ok' && res.main && res.main.text.length > r.text.length) {
        r.text = res.main.text;
        r.continues = false;
      } else {
        r.expandFailed = true;
      }
      if (panel !== p) return;
      markCut(r);
      schedule();
    });
  }

  // The row's text and its "cut off" note follow the reply's current state.
  function markCut(r) {
    const row = rows().find((x) => x.dataset.id === r.id);
    if (!row) return;
    const s = row.querySelector('.s');
    if (s) s.textContent = r.text;
    let note = row.querySelector('.cut');
    if (!r.continues) return note && note.remove();
    if (!note) {
      note = h('div', { class: 'cut', 'data-sm': 'shot-cut' });
      row.querySelector('.t').append(note);
    }
    note.textContent = r.expanding ? 'Loading the full reply…' : r.expandFailed ? 'X cut this reply off; couldn’t load the rest.' : 'X cut this reply off. Picking it loads the rest.';
  }

  function togglePicked(row) {
    if (row) setPicked(row.dataset.id, !panel.picked.has(row.dataset.id));
  }

  // Keyboard cursor over the reply rows.
  function moveCursor(delta) {
    const list = rows();
    if (!list.length) return (panel.cursor = 0);
    panel.cursor = Math.max(0, Math.min(list.length - 1, (panel.cursor || 0) + delta));
    list.forEach((r, i) => r.classList.toggle('is-cur', i === panel.cursor));
    if (delta) list[panel.cursor].scrollIntoView({ block: 'nearest' });
  }

  // Panel shortcuts. k: { code, shift }. Returns true when the key did something here.
  // Swipe Mode passes keys in (its own listener sees them first); on its own the panel listens.
  function key(k) {
    if (!panel) return false;
    const list = rows();
    if (k.help) {
      panel.ui.help.hidden = !panel.ui.help.hidden;
      if (!panel.ui.help.hidden) panel.ui.help.scrollIntoView({ block: 'nearest' });
      return true;
    }
    const d = /^(?:Digit|Numpad)([1-9])$/.exec(k.code);
    if (d) {
      togglePicked(list[Number(d[1]) - 1]);
      return true;
    }
    switch (k.code) {
      case 'ArrowDown':
      case 'KeyJ':
        moveCursor(1);
        return true;
      case 'ArrowUp':
      case 'KeyK':
        moveCursor(-1);
        return true;
      case 'Space':
      case 'KeyX':
        togglePicked(list[panel.cursor || 0]);
        return true;
      case 'Enter':
      case 'NumpadEnter':
        save(true);
        return true;
      case 'KeyS':
        save(false);
        return true;
      case 'KeyR':
        removeAt(panel.cursor);
        return true;
      case 'KeyU':
        restoreLast();
        return true;
      case 'KeyI':
        panel.ui.images.checked = !panel.ui.images.checked;
        schedule();
        return true;
      case 'KeyM':
        loadMore();
        return true;
      case 'KeyF':
        chrome.runtime.sendMessage({ type: 'swipe-mode:choose-folder' });
        return true;
      case 'Escape':
      case 'KeyP':
        closePanel();
        return true;
      default:
        return false;
    }
  }

  async function buildShot(complete) {
    if (complete && panel.expandQueue) await panel.expandQueue;
    const { main, replies, picked, ui } = panel;
    const chosen = Array.from(replies.values())
      .filter((r) => picked.has(r.id))
      .sort((a, b) => a.pageY - b.pageY);
    try {
      await document.fonts.load('400 20px TwitterChirp');
      await document.fonts.load('700 20px TwitterChirp');
    } catch (_) {}
    return { main: await toDrawable(main), replies: await Promise.all(chosen.map(toDrawable)), images: ui.images.checked };
  }

  function schedule(delay) {
    if (!panel) return;
    clearTimeout(panel.timer);
    const p = panel;
    p.timer = setTimeout(async () => {
      const v = ++p.version;
      const shot = await buildShot();
      if (panel === p && v === p.version) render(shot, p.ui.preview);
    }, delay == null ? 120 : delay);
  }

  function say(text, kind) {
    if (!panel) return;
    panel.ui.msg.textContent = text;
    panel.ui.msg.className = 'msg' + (kind ? ' ' + kind : '');
  }

  async function refreshFolder() {
    if (!panel) return;
    let res = null;
    try {
      res = await chrome.runtime.sendMessage({ type: 'swipe-mode:folder-info' });
    } catch (_) {}
    if (!panel) return;
    const change = h('button', { class: 'link', type: 'button', onclick: () => chrome.runtime.sendMessage({ type: 'swipe-mode:choose-folder' }), text: (res && res.folder ? 'Change' : 'Choose now') + ' (F)' });
    panel.ui.where.replaceChildren(res && res.folder ? `Saves to “${res.folder}” · ` : 'You pick a folder once, on your first save. · ', change);
  }

  // back: close the panel once the file is written (Enter, the Save button). Inside Swipe Mode
  // that returns to the card, with the result shown there. S saves and keeps the panel open.
  async function save(back) {
    if (!panel) return;
    const p = panel;
    p.backAfterSave = !!back;
    p.ui.save.disabled = true;
    say('Rendering…');
    try {
      const canvas = render(await buildShot(true));
      const n = p.picked.size;
      const name = ['tweet', (p.main.handle || '').replace(/^@/, ''), p.main.id, n ? n + (n === 1 ? '-reply' : '-replies') : ''].filter(Boolean).join('-');
      const res = await chrome.runtime.sendMessage({ type: 'swipe-mode:save-shot', name, dataUrl: canvas.toDataURL('image/png') });
      if (panel !== p) return;
      if (res.status === 'saved') saved(res);
      else if (res.status === 'choose') say('Pick a folder in the window that just opened (Enter there). The screenshot saves as soon as you do.');
      else if (res.status === 'allow') say('Chrome needs you to allow the folder again after a restart: press Enter in the window that just opened.');
      else say('Could not save: ' + (res.error || 'unknown error'), 'err');
    } catch (err) {
      say('Could not save: ' + String((err && err.message) || err), 'err');
    } finally {
      p.ui.save.disabled = false;
    }
  }

  function saved(res) {
    const text = `Saved ${res.file} to “${res.folder}”.`;
    if (panel.backAfterSave && panel.opts.onSaved) {
      const done = panel.opts.onSaved;
      closePanel();
      return done(text);
    }
    say(text, 'ok');
    refreshFolder();
  }

  // --- camera buttons ------------------------------------------------------------------------
  function cameraIcon() {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '18.75');
    svg.setAttribute('height', '18.75');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', 'M4 8h3l1.5-2h7L17 8h3v11H4z M12 10.5a3.25 3.25 0 1 0 0 6.5 3.25 3.25 0 0 0 0-6.5z');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.6');
    path.setAttribute('stroke-linejoin', 'round');
    svg.append(path);
    return svg;
  }

  function addButton(article) {
    const bar = dom.q(article, SEL.actionBar);
    if (!bar || bar.hasAttribute(MARK) || !det.extract(article)) return;
    bar.setAttribute(MARK, '');
    const btn = h('button', {
      type: 'button',
      'data-sm': 'shot-button',
      'aria-label': 'Screenshot this post',
      title: 'Screenshot this post',
      style: 'all: unset; display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; color: rgb(83, 100, 113); cursor: pointer; flex: none;',
    }, cameraIcon());
    btn.addEventListener('mouseenter', () => (btn.style.color = 'rgb(29, 155, 240)'));
    btn.addEventListener('mouseleave', () => (btn.style.color = 'rgb(83, 100, 113)'));
    // X opens the post when a click on the post reaches it; keep ours to ourselves.
    for (const t of ['pointerdown', 'mousedown', 'pointerup', 'mouseup']) btn.addEventListener(t, (e) => e.stopPropagation());
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openPanel(article);
    });
    bar.append(btn);
  }

  function resumePending() {
    let id = null;
    try {
      id = sessionStorage.getItem(PENDING_KEY);
    } catch (_) {}
    if (!id || statusIdFromPath() !== id) return;
    const el = det.findPostElements(document).find((e) => idOf(det.extract(e) || null) === id);
    if (!el) return;
    try {
      sessionStorage.removeItem(PENDING_KEY);
    } catch (_) {}
    openPanel(el);
  }

  let queued = false;
  function tick() {
    queued = false;
    det.findPostElements(document).forEach(addButton);
    resumePending();
    refreshReplies();
  }

  try {
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      setTimeout(tick, 250);
    }).observe(document.documentElement, { childList: true, subtree: true });
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg && msg.type === 'swipe-mode:shot-saved' && panel) saved(msg);
      // This tab is the background tab the service worker opened to read a post's replies.
      if (msg && msg.type === 'swipe-mode:shot-read' && statusIdFromPath() === msg.id) {
        readForOtherTab(msg.id, msg.scrolls || 0, !!msg.mainOnly).then(sendResponse);
        return true;
      }
    });
  } catch (_) {
    // Extension context gone (reloaded): the page keeps working without screenshots.
  }
  tick();

  NS.shot = { openPanel, closePanel, key, snapshot, richText };
})(globalThis);
