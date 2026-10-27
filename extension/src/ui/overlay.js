// Swipe Mode UI: launcher, focused card, menus, dialogs. Lives in a shadow root so the site's
// CSS and ours never mix. Site wording comes from NS.site. Post content is always set with textContent, never parsed as HTML.
(function (root) {
  'use strict';
  const NS = root.SwipeMode;
  const { REACTIONS, ENGAGE_ACTIONS, reactionById } = NS.catalog;
  const { classifyDrag } = NS.gesture;
  const site = NS.site;
  const L = site.labels;

  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const safeUrl = (u) => (typeof u === 'string' && /^(https?:|data:image\/)/i.test(u) ? u : null);

  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat(Infinity)) {
      if (c == null || c === false) continue;
      el.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return el;
  }

  const kbd = (k) => h('span', { class: 'kbd', text: k });
  // replaceChildren turns null into the text "null"; drop empty slots first.
  const fill = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter((k) => k != null && k !== false));
  const initials = (name) => (name || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  function launcherIcon() {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', 'M9 7 4 12l5 5M15 7l5 5-5 5M4 12h16');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2.2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.append(path);
    return svg;
  }

  const HELP = {
    main: [
      ['← / N', 'Skip this post'],
      ['→', 'Engage menu (never acts by itself)'],
      ['R', site.singleReaction ? L.react : 'Reactions'],
      ['C', L.comment],
      ['S', L.save],
      ['O', 'Open on ' + site.name + ' in a background tab'],
      site.id === 'x' ? ['P', 'Screenshot with replies'] : null,
      ['U', 'Undo the last skip'],
      ['Space / ↓ / PgDn', 'Read further'],
      ['Shift+Space / ↑ / PgUp', 'Read back'],
      ['X', 'Exit and stay at this post'],
      ['Esc', 'Exit and return to where you started'],
      ['?', 'Show or hide this help'],
    ],
    grace: [
      ['Esc', 'Stay on this post'],
      ['← / N', 'Next post now'],
      ['R / C / S / →', 'Another action on this post'],
    ],
    engage: [
      [site.id === 'x' ? '1–9' : '1–8', 'Pick an action'],
      ['R', site.singleReaction ? L.react : 'Reactions'],
      ['C', L.comment],
      ['Esc / ←', 'Back'],
    ],
    reaction: [
      ['1–6', 'Like, Celebrate, Support, Love, Insightful, Funny'],
      ['0', 'Remove your reaction'],
      ['Esc / ←', 'Back'],
    ],
  };

  function createUI(handlers) {
    const cmd = (c) => () => handlers.onCommand(c);
    const host = document.createElement('div');
    host.id = 'swipe-mode-root';
    host.setAttribute('style', 'all: initial; position: fixed; top: 0; left: 0; width: 0; height: 0; z-index: 2147483647;');
    const shadow = host.attachShadow({ mode: 'open' });
    const wrap = h('div', { class: 'sm', 'data-site': site.id });
    shadow.append(h('style', { text: NS.styles.css }), wrap);

    const launcher = h(
      'button',
      { class: 'sm-launcher', 'data-sm': 'launcher', type: 'button', hidden: true, title: 'Start Swipe Mode (Alt+Shift+S)', 'aria-label': 'Start Swipe Mode', onclick: cmd({ type: 'launch' }) },
      launcherIcon(),
      'Swipe Mode'
    );
    wrap.append(launcher);

    const topBtn = (label, key, c, name) =>
      h('button', { class: 'sm-icon-btn', type: 'button', 'data-sm': name, 'aria-keyshortcuts': key, onclick: cmd(c) }, label, kbd(key));
    const panelBtn = (label, key, c, primary) =>
      h('button', { class: 'sm-btn' + (primary ? ' sm-btn--engage' : ''), type: 'button', onclick: cmd(c) }, label, kbd(key));

    const progress = h('div', { class: 'sm-progress', 'data-sm': 'progress' });
    const topbar = h(
      'div',
      { class: 'sm-topbar' },
      progress,
      h('div', { class: 'sm-top-actions' }, topBtn('Undo', 'U', { type: 'undo' }, 'undo'), topBtn('Help', '?', { type: 'help' }, 'help-btn'), topBtn('Exit', 'Esc', { type: 'exit' }, 'exit'))
    );

    const scroll = h('div', { class: 'sm-scroll', 'data-sm': 'scroll' });
    // Grab handles: dragging here swipes and never selects post text.
    function gripIcon() {
      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', '0 0 12 18');
      svg.setAttribute('aria-hidden', 'true');
      for (const [cx, cy] of [[3, 3], [9, 3], [3, 9], [9, 9], [3, 15], [9, 15]]) {
        const c = document.createElementNS(ns, 'circle');
        c.setAttribute('cx', cx);
        c.setAttribute('cy', cy);
        c.setAttribute('r', '1.6');
        c.setAttribute('fill', 'currentColor');
        svg.append(c);
      }
      return svg;
    }
    const grip = (cls, label) =>
      h('div', { class: 'sm-grip ' + cls, 'data-sm': 'grip', title: 'Drag left to skip, right to engage' }, gripIcon(), label ? h('span', { text: label }) : null, gripIcon());
    const gripTop = grip('sm-grip--top', 'Drag to swipe');
    const hintSkip = h('div', { class: 'sm-swipe-hint sm-swipe-hint--skip', text: 'SKIP' });
    const hintEngage = h('div', { class: 'sm-swipe-hint sm-swipe-hint--engage', text: 'ENGAGE' });
    // The site's social bar (each button still goes through the engage flow), then the swipe row.
    const ICONS = {
      heart: 'M16.7 3.5c-1.9 0-3.6 1-4.7 2.6C10.9 4.5 9.2 3.5 7.3 3.5 4.3 3.5 2 6 2 9.1c0 6.3 9.1 11.2 9.5 11.4l.5.3.5-.3c.4-.2 9.5-5.1 9.5-11.4 0-3.1-2.3-5.6-5.3-5.6zM12 18.7C10.2 17.6 4 13.4 4 9.1 4 7.1 5.5 5.5 7.3 5.5c1.6 0 3 1 3.7 2.6l1 2.1 1-2.1c.7-1.6 2.1-2.6 3.7-2.6 1.8 0 3.3 1.6 3.3 3.6 0 4.3-6.2 8.5-8 9.6z',
      like: 'M19.46 11l-3.91-3.91a7 7 0 01-1.69-2.74l-.49-1.47A2.76 2.76 0 0010.76 1 2.75 2.75 0 008 3.74v1.12a9.19 9.19 0 00.46 2.85L8.89 9H4.12A2.12 2.12 0 002 11.12a2.16 2.16 0 00.92 1.76A2.11 2.11 0 002 14.62a2.14 2.14 0 001.28 2 2 2 0 00-.28 1 2.12 2.12 0 002 2.12v.14A2.12 2.12 0 007.12 22h7.49a8.08 8.08 0 003.58-.84l.31-.16H21V11z',
      comment: 'M7 9h10v1H7zm0 4h7v-1H7zm16-2a6.78 6.78 0 01-2.84 5.61L12 22v-4H8A7 7 0 018 4h8a7 7 0 017 7zm-2 0a5 5 0 00-5-5H8a5 5 0 000 10h6v2.28L19 15a4.79 4.79 0 002-4z',
      repost: 'M13.96 5H6c-.55 0-1 .45-1 1v10H3V6c0-1.66 1.34-3 3-3h7.96L12 0h2.37L17 4l-2.63 4H12l1.96-3zm5.04 3v10c0 .55-.45 1-1 1h-7.96L12 16H9.63L7 20l2.63 4H12l-1.96-3H18c1.66 0 3-1.34 3-3V8h-2z',
      save: 'M18 1H6a2 2 0 00-2 2v20l8-5.6 8 5.6V3a2 2 0 00-2-2zm0 18.15l-6-4.2-6 4.2V3h12z',
    };
    function icon(name) {
      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('aria-hidden', 'true');
      const p = document.createElementNS(ns, 'path');
      p.setAttribute('d', ICONS[name]);
      p.setAttribute('fill', 'currentColor');
      svg.append(p);
      return svg;
    }
    const social = (name, label, key, c) =>
      h('button', { class: 'sm-social-btn', type: 'button', 'aria-keyshortcuts': key, onclick: cmd(c) }, icon(name), h('span', { text: label }), key ? h('span', { class: 'kbd sm-social-key', text: key }) : null);
    const footer = h(
      'div',
      { class: 'sm-footer' },
      h(
        'div',
        { class: 'sm-social' },
        social(site.likeIcon, L.react, 'R', { type: 'openReactions' }),
        social('comment', L.comment, 'C', { type: 'openComment' }),
        social('repost', L.repost, '', { type: 'engageSlot', slot: 3 }),
        social('save', L.save, 'S', { type: 'save' })
      ),
      h(
        'div',
        { class: 'sm-swipe-row' },
        h('button', { class: 'sm-btn sm-btn--skip', type: 'button', 'data-sm': 'skip', 'aria-keyshortcuts': 'ArrowLeft', onclick: cmd({ type: 'skip' }) }, kbd('←'), 'Skip'),
        grip('sm-grip--row', 'Drag here · or ← →'),
        h('button', { class: 'sm-btn sm-btn--engage', type: 'button', 'data-sm': 'engage', 'aria-keyshortcuts': 'ArrowRight', onclick: cmd({ type: 'openEngage' }) }, 'Engage', kbd('→'))
      )
    );
    const engageSheet = h('div', { class: 'sm-sheet', 'data-sm': 'engage-menu', role: 'menu', hidden: true });
    const reactionSheet = h('div', { class: 'sm-sheet', 'data-sm': 'reaction-menu', role: 'menu', hidden: true });

    const C = site.composer;
    const textarea = h('textarea', { 'data-sm': 'composer-input', maxlength: String(C.max), 'aria-label': C.aria, placeholder: C.placeholder });
    const count = h('span', { class: 'sm-count', text: '0 / ' + C.max });
    textarea.addEventListener('input', () => {
      count.textContent = textarea.value.length + ' / ' + C.max;
      handlers.onDraft(textarea.value);
    });
    const composer = h(
      'div',
      { class: 'sm-sheet sm-composer', 'data-sm': 'composer', hidden: true },
      h('div', { class: 'sm-sheet-title' }, C.title, h('small', { text: C.note })),
      textarea,
      h('div', { class: 'sm-composer-row' }, count, h('div', { class: 'sm-row-btns' }, panelBtn('Cancel', 'Esc', { type: 'closeComposer' }), panelBtn('Post', 'Ctrl+Enter', { type: 'submitComment' }, true)))
    );
    const busyLabel = h('span');
    const busy = h('div', { class: 'sm-busy', 'data-sm': 'busy', hidden: true }, h('span', { class: 'sm-spinner' }), busyLabel);

    const card = h('article', { class: 'sm-card', 'data-sm': 'card', tabindex: '-1', 'aria-roledescription': 'post' }, gripTop, scroll, footer, hintSkip, hintEngage, engageSheet, reactionSheet, composer, busy);

    const endTitle = h('h2', { text: 'No more posts found' });
    const nothingMore = site.name + ' has nothing more to load right now.';
    const endText = h('p', { text: nothingMore });
    const reportBtn = h(
      'button',
      { class: 'sm-btn', type: 'button', 'data-sm': 'copy-report', hidden: true, onclick: cmd({ type: 'copyReport' }) },
      'Copy layout report'
    );
    const endPanel = h(
      'div',
      { class: 'sm-panel', 'data-sm': 'end', hidden: true },
      endTitle,
      endText,
      h('div', { class: 'sm-row-btns' }, panelBtn('Scan again', 'Enter', { type: 'rescan' }, true), reportBtn, panelBtn('Exit Swipe Mode', 'Esc', { type: 'exit' }))
    );

    // ERR-001 at page scale: containers matched but no post could be read means the site's layout
    // changed, which is not the same as an empty feed.
    function showEnd(unreadable) {
      endTitle.textContent = unreadable ? "Swipe Mode couldn't read the posts on this page" : 'No more posts found';
      endText.textContent = unreadable
        ? site.name + ' probably changed its layout. Copy the layout report (it has no post text) and send it to whoever maintains Swipe Mode.'
        : nothingMore;
      reportBtn.hidden = !unreadable;
    }
    const loadingPanel = h('div', { class: 'sm-panel', 'data-sm': 'loading', hidden: true }, h('h2', { text: 'Looking for more posts…' }), h('p', { text: 'Loading the next posts from the page.' }));
    const blockedReason = h('p');
    const blockedPanel = h(
      'div',
      { class: 'sm-panel', 'data-sm': 'blocked', role: 'alert', hidden: true },
      h('h2', { text: 'Swipe Mode stopped' }),
      blockedReason,
      h('div', { class: 'sm-row-btns' }, panelBtn('Exit Swipe Mode', 'Esc', { type: 'exit' }, true))
    );

    const failTitle = h('h2');
    const failDetail = h('p');
    const retryBtn = panelBtn('Retry', 'Enter', { type: 'retry' }, true);
    const failure = h(
      'div',
      { class: 'sm-dialog sm-dialog--failure', 'data-sm': 'failure', role: 'alertdialog', hidden: true },
      failTitle,
      failDetail,
      h('div', { class: 'sm-row-btns' }, retryBtn, panelBtn('Open post', 'O', { type: 'openPost' }), panelBtn('Continue', 'Esc', { type: 'dismiss' }))
    );
    const help = h('div', { class: 'sm-help', 'data-sm': 'help', role: 'dialog', 'aria-label': 'Keyboard shortcuts', hidden: true });
    const modalLayer = h('div', { class: 'sm-modal-layer', hidden: true }, failure, help);

    // Two blank cards peeking out under the active one: the queue you are swiping through.
    const stack2 = h('div', { class: 'sm-stack sm-stack-2', 'aria-hidden': 'true' });
    const stack1 = h('div', { class: 'sm-stack sm-stack-1', 'aria-hidden': 'true' });
    const stage = h('div', { class: 'sm-stage' }, stack2, stack1, card, endPanel, loadingPanel, blockedPanel, modalLayer);
    const toastText = h('span');
    const toastBar = h('div', { class: 'sm-toast-bar' });
    const toast = h('div', { class: 'sm-toast', 'data-sm': 'toast', role: 'status', hidden: true }, toastText, toastBar);
    const nativePill = h('div', { class: 'sm-native-pill', 'data-sm': 'native', hidden: true });
    const live = h('div', { class: 'sm-live', 'aria-live': 'polite' });
    const overlay = h(
      'div',
      { class: 'sm-overlay', 'data-sm': 'overlay', 'data-mode': 'main', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Swipe Mode' },
      h('div', { class: 'sm-backdrop' }),
      topbar,
      stage,
      toast,
      nativePill,
      live
    );
    overlay.addEventListener('wheel', (e) => handlers.onWheel(e, scroll.contains(e.composedPath()[0])), { passive: false });

    let prevFocus = null;
    let toastTimer = null;

    function ensureMounted() {
      if (!host.isConnected) document.documentElement.append(host);
    }

    // --- post rendering ---------------------------------------------------------------
    function badge(text, done) {
      return h('span', { class: 'sm-badge' + (done ? ' sm-badge--done' : ''), text });
    }

    function placeholder(label, poster) {
      return h('button', { class: 'sm-placeholder', type: 'button', onclick: cmd({ type: 'openPost' }) }, safeUrl(poster) ? h('img', { src: poster, alt: '' }) : null, h('span', { text: label }));
    }

    function buildPost(rec, status) {
      const parts = [];
      if (rec.header) parts.push(h('div', { class: 'sm-context', text: rec.header }));
      const badges = [];
      if (rec.promoted) badges.push(badge('Promoted'));
      if (rec.reshare) badges.push(badge(L.reshare));
      if (rec.video) badges.push(badge('Video'));
      if (rec.document) badges.push(badge('Document'));
      if (rec.poll) badges.push(badge('Poll'));
      if (rec.reacted) badges.push(badge(site.reactedBadge((reactionById(rec.reacted) || {}).label || rec.reacted), true));
      if (status === 'engaged') badges.push(badge('Done', true));
      const avatar = safeUrl(rec.author.avatarUrl) ? h('img', { class: 'sm-avatar', src: rec.author.avatarUrl, alt: '' }) : h('div', { class: 'sm-avatar', text: initials(rec.author.name) });
      parts.push(
        h(
          'header',
          { class: 'sm-author' },
          avatar,
          h(
            'div',
            { class: 'sm-author-meta' },
            h('div', { class: 'sm-name', 'data-sm': 'author', text: rec.author.name || 'Unknown author' }),
            rec.author.headline ? h('div', { class: 'sm-headline', text: rec.author.headline }) : null,
            rec.author.time ? h('div', { class: 'sm-time', text: rec.author.time }) : null,
            badges.length ? h('div', { class: 'sm-badges' }, badges) : null
          )
        )
      );
      if (rec.text) parts.push(h('div', { class: 'sm-text', 'data-sm': 'text', text: rec.text }));
      // X's "Show more" opens the post page, so the rest of a long post is read there.
      if (rec.continues) parts.push(h('button', { class: 'sm-more', type: 'button', onclick: cmd({ type: 'openPost' }) }, 'Show more on ' + site.name + ' ', kbd('O')));

      const media = [];
      const images = rec.images.map(safeUrl).filter(Boolean);
      if (images.length) media.push(h('div', { class: 'sm-media' + (images.length > 1 ? ' sm-media--grid' : '') }, images.slice(0, 4).map((src) => h('img', { src, alt: '', loading: 'lazy' }))));
      if (rec.video) media.push(placeholder('▶ Video · press O to watch on ' + site.name, rec.video.poster));
      if (rec.document) media.push(placeholder('Document · press O to read it on ' + site.name));
      if (rec.poll) media.push(h('div', { class: 'sm-poll' }, rec.poll.text, h('div', { class: 'sm-time', text: 'Vote on ' + site.name + ': press O' })));
      if (rec.article) {
        const a = rec.article;
        media.push(
          h(
            'a',
            { class: 'sm-article', href: safeUrl(a.url), target: '_blank', rel: 'noopener noreferrer' },
            safeUrl(a.image) ? h('img', { src: a.image, alt: '' }) : null,
            h('div', { class: 'sm-article-title', text: a.title || a.url || 'Link' }),
            a.subtitle ? h('div', { class: 'sm-article-sub', text: a.subtitle }) : null
          )
        );
      }
      if (rec.reshare) media.push(h('div', { class: 'sm-reshare' }, h('div', { class: 'sm-reshare-author', text: rec.reshare.author }), h('div', { class: 'sm-text', text: rec.reshare.text })));
      if (media.length) parts.push(h('div', { class: 'sm-media' }, media));
      return parts;
    }

    // A clone of the old card flies away while the real card already shows the next post, so
    // state never waits on an animation. Skip leaves left with a SKIP stamp, a finished action
    // leaves right with DONE, undo tucks the current card back into the stack.
    const STAMPS = { left: 'SKIP', right: '✓ DONE' };
    const STACK_ENTER = 'translateY(14px) scale(0.96)';

    function ghostOut(dir, fast) {
      if (card.hidden || !scroll.childElementCount) return;
      const reduce = reducedMotion();
      const ghost = card.cloneNode(true);
      ghost.removeAttribute('data-sm');
      ghost.querySelectorAll('[data-sm]').forEach((e) => e.removeAttribute('data-sm'));
      ghost.querySelectorAll('.sm-sheet, .sm-busy, .sm-swipe-hint').forEach((e) => e.remove());
      if (STAMPS[dir]) ghost.append(h('div', { class: 'sm-stamp sm-stamp--' + dir, text: STAMPS[dir] }));
      const sr = stage.getBoundingClientRect();
      const cr = card.getBoundingClientRect();
      const from = card.style.transform || 'none';
      ghost.classList.add('sm-ghost');
      Object.assign(ghost.style, { left: cr.left - sr.left + 'px', top: cr.top - sr.top + 'px', width: cr.width + 'px', height: cr.height + 'px', transform: from });
      ghost.setAttribute('aria-hidden', 'true');
      stage.append(ghost);
      let frames;
      if (dir === 'back') frames = [{ transform: from, opacity: 1 }, { transform: STACK_ENTER, opacity: 0 }];
      else if (reduce) frames = [{ transform: from, opacity: 1 }, { transform: `translateX(${dir === 'left' ? -40 : 40}px)`, opacity: 0 }];
      else {
        const sign = dir === 'left' ? -1 : 1;
        frames = [
          { transform: from, opacity: 1 },
          { transform: `translateX(${sign * 18}px) rotate(${sign * 3}deg)`, opacity: 1, offset: 0.25 },
          { transform: `translateX(${sign * 135}%) rotate(${sign * 16}deg)`, opacity: 0.15 },
        ];
      }
      ghost
        .animate(frames, { duration: reduce ? 150 : fast ? 300 : 360, easing: 'cubic-bezier(.45,0,.8,.4)', fill: 'forwards' })
        .finished.then(() => ghost.remove(), () => ghost.remove());
    }

    // Three beats so two posts never blur together: the old card leaves, a short empty beat shows
    // only the stack, then the new card rises and its header flashes. Visual only: the new post is
    // already in the DOM, so keys pressed during the beat act on it immediately.
    let entering = [];

    function animateIn(dir, gapMs) {
      entering.forEach((a) => a.cancel());
      const reduce = reducedMotion();
      const gap = gapMs != null ? gapMs : 450;
      const delay = dir === 'back' ? 0 : reduce ? Math.min(gap, 160) : gap;
      const from = reduce ? 'none' : dir === 'back' ? 'translateX(-125%) rotate(-12deg)' : STACK_ENTER;
      entering = [
        card.animate([{ transform: from, opacity: 0 }, { transform: 'none', opacity: 1 }], {
          duration: reduce ? 160 : dir === 'back' ? 360 : 340,
          delay,
          easing: 'cubic-bezier(.2,.9,.25,1.05)',
          fill: 'backwards',
        }),
      ];
      const header = scroll.querySelector('.sm-author');
      if (header) {
        entering.push(
          header.animate(
            [{ backgroundColor: getComputedStyle(wrap).getPropertyValue('--flash').trim() || 'rgba(10,102,194,.16)' }, { backgroundColor: 'transparent' }],
            { duration: 900, delay: delay + (reduce ? 120 : 220), easing: 'ease-out', fill: 'backwards' }
          )
        );
      }
      entering.push(
        progress.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)', offset: 0.4 }, { transform: 'scale(1)' }], {
          duration: 420,
          delay,
          easing: 'ease-out',
        })
      );
    }

    // Right means "consider engaging": the card leans right, flashes ENGAGE, and settles back.
    function nudge() {
      const reduce = reducedMotion();
      card.animate(
        [{ transform: 'none' }, { transform: reduce ? 'translateX(12px)' : 'translateX(56px) rotate(4deg)', offset: 0.35 }, { transform: 'none' }],
        { duration: reduce ? 200 : 380, easing: 'cubic-bezier(.3,.7,.3,1)' }
      );
      hintEngage.animate([{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }], { duration: 520, easing: 'ease-out' });
    }

    function sizeStack() {
      const w = card.offsetWidth;
      const ht = card.offsetHeight;
      [stack1, stack2].forEach((s) => Object.assign(s.style, { width: w + 'px', height: ht + 'px' }));
    }

    function renderPost(rec, ctx) {
      const c = ctx || {};
      const motion = !!c.dir;
      if (motion) ghostOut(c.dir, c.fast);
      const top = scroll.scrollTop;
      fill(scroll, buildPost(rec, c.status));
      scroll.scrollTop = c.keepScroll ? top : 0;
      card.style.transform = '';
      hintSkip.style.opacity = hintEngage.style.opacity = '0';
      setProgress(c.position, c.remaining);
      sizeStack();
      stack2.hidden = c.remaining < 2;
      stack1.hidden = c.remaining < 1;
      if (motion) animateIn(c.dir, c.gapMs);
    }

    function setProgress(position, remaining) {
      progress.textContent = 'Post ' + position + ' · ' + remaining + ' queued';
    }

    // --- sheets and dialogs -------------------------------------------------------------
    function showEngage(rec, available) {
      const items = ENGAGE_ACTIONS.filter((a) => available(rec, a.id)).map((a) => {
        let label = a.label;
        if (a.id === 'react' && rec.reacted) label += site.singleReaction ? ' (already liked)' : ' (yours: ' + (reactionById(rec.reacted) || {}).label + ')';
        return h('button', { class: 'sm-item', type: 'button', role: 'menuitem', 'data-slot': String(a.slot), onclick: cmd({ type: 'engageSlot', slot: a.slot }) }, kbd(String(a.slot)), label);
      });
      fill(engageSheet, h('div', { class: 'sm-sheet-title' }, 'Engage', h('small', { text: 'Pick a number · Esc to go back' })), h('div', { class: 'sm-items' }, items));
    }

    function showReactions(rec) {
      const buttons = REACTIONS.map((r) =>
        h(
          'button',
          { class: 'sm-item sm-reaction' + (rec.reacted === r.id ? ' is-current' : ''), type: 'button', role: 'menuitem', 'aria-label': r.label, onclick: cmd({ type: 'react', slot: r.slot }) },
          h('span', { class: 'sm-emoji', 'aria-hidden': 'true', text: r.icon }),
          r.label,
          kbd(String(r.slot))
        )
      );
      fill(
        reactionSheet,
        h('div', { class: 'sm-sheet-title' }, 'React', h('small', { text: 'Sent through ' + site.name + "'s reaction picker" })),
        h('div', { class: 'sm-reactions' }, buttons),
        rec.reacted ? h('button', { class: 'sm-item sm-remove', type: 'button', onclick: cmd({ type: 'removeReaction' }) }, kbd('0'), 'Remove your reaction') : null
      );
    }

    // Call after the composer is visible: focus must move before the next keystroke arrives.
    function showComposer(draft) {
      textarea.value = draft || '';
      count.textContent = textarea.value.length + ' / ' + C.max;
      textarea.focus();
    }

    function showFailure(f) {
      failTitle.textContent = f.title;
      failDetail.textContent = f.detail;
      retryBtn.hidden = !f.retry;
    }

    function showHelp(forMode) {
      const rows = HELP[forMode] || HELP.main;
      fill(
        help,
        h('h2', { text: 'Keyboard shortcuts' }),
        h('dl', null, rows.filter(Boolean).map(([k, d]) => [h('dt', null, kbd(k)), h('dd', { text: d })])),
        h('div', { class: 'sm-help-foot', text: 'Trackpad: swipe left to skip, right to engage. Mouse: drag the card, or long-press it for the engage menu. Press ? or Esc to close.' })
      );
    }

    function showToast(msg, opts) {
      const o = opts || {};
      clearTimeout(toastTimer);
      toast.className = 'sm-toast' + (o.kind ? ' sm-toast--' + o.kind : '');
      toastText.textContent = o.hint ? msg + ' · ' + o.hint : msg;
      toastBar.classList.remove('is-running');
      toastBar.hidden = !o.graceMs;
      if (o.graceMs) {
        void toastBar.offsetWidth;
        toastBar.style.animationDuration = o.graceMs + 'ms';
        toastBar.classList.add('is-running');
      }
      toast.hidden = false;
      toastTimer = setTimeout(hideToast, o.graceMs ? o.graceMs + 200 : o.durationMs || 2600);
    }

    function hideToast() {
      clearTimeout(toastTimer);
      toast.hidden = true;
    }

    function setMode(mode) {
      overlay.dataset.mode = mode;
      engageSheet.hidden = mode !== 'engage';
      reactionSheet.hidden = mode !== 'reaction';
      composer.hidden = mode !== 'comment';
      busy.hidden = mode !== 'busy';
      failure.hidden = mode !== 'failure';
      help.hidden = mode !== 'help';
      modalLayer.hidden = failure.hidden && help.hidden;
      endPanel.hidden = mode !== 'end';
      loadingPanel.hidden = mode !== 'loading';
      blockedPanel.hidden = mode !== 'blocked';
      card.hidden = mode === 'end' || mode === 'loading' || mode === 'blocked';
      stage.classList.toggle('sm-stage--no-card', card.hidden);
      nativePill.hidden = mode !== 'native';
    }

    function scrollCard(unit, dir) {
      const behavior = reducedMotion() ? 'auto' : 'smooth';
      if (unit === 'edge') scroll.scrollTo({ top: dir > 0 ? scroll.scrollHeight : 0, behavior });
      else scroll.scrollBy({ top: dir * (unit === 'line' ? 64 : scroll.clientHeight * 0.85), behavior });
    }

    function announce(text) {
      live.textContent = '';
      setTimeout(() => (live.textContent = text), 30);
    }

    function focusCard() {
      card.focus({ preventScroll: true });
    }

    function open() {
      ensureMounted();
      prevFocus = document.activeElement;
      launcher.hidden = true;
      setMode('main');
      wrap.append(overlay);
      focusCard();
    }

    function close() {
      hideToast();
      overlay.remove();
      stage.querySelectorAll('.sm-ghost').forEach((g) => g.remove());
      if (prevFocus && prevFocus.isConnected && prevFocus.focus) prevFocus.focus({ preventScroll: true });
      prevFocus = null;
    }

    // --- mouse / touch drag on the card, long-press for the engage menu (UI-007) -------
    let drag = null;
    card.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || !handlers.canDrag()) return;
      const target = e.composedPath()[0];
      if (target.closest && target.closest('button, a, textarea, input, video, .sm-sheet')) return;
      const onGrip = !!(target.closest && target.closest('.sm-grip'));
      if (onGrip) e.preventDefault(); // no text selection starts from a handle
      else if (e.pointerType === 'mouse' && target.closest && target.closest('.sm-text')) return; // keep text selectable
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0, t: e.timeStamp, lastX: e.clientX, lastT: e.timeStamp, v: 0, moved: false, grip: onGrip };
      drag.longPress = setTimeout(() => {
        if (drag && !drag.moved) {
          drag = null;
          handlers.onCommand({ type: 'openEngage' });
        }
      }, 550);
    });
    card.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag.dx = e.clientX - drag.x;
      drag.dy = e.clientY - drag.y;
      const dt = Math.max(1, e.timeStamp - drag.lastT);
      drag.v = (e.clientX - drag.lastX) / dt;
      drag.lastX = e.clientX;
      drag.lastT = e.timeStamp;
      if (!drag.moved && Math.hypot(drag.dx, drag.dy) > 6) {
        drag.moved = true;
        clearTimeout(drag.longPress);
        // A handle always swipes; elsewhere a mostly vertical drag scrolls the card instead.
        if (drag.grip || Math.abs(drag.dx) > Math.abs(drag.dy)) {
          card.setPointerCapture(e.pointerId);
          card.classList.add('is-dragging');
          clearSelection();
        } else drag = null;
        return;
      }
      if (drag.moved) {
        card.style.transform = `translateX(${drag.dx}px) rotate(${drag.dx / 40}deg)`;
        const p = Math.min(1, Math.abs(drag.dx) / 140);
        hintSkip.style.opacity = drag.dx < 0 ? String(p) : '0';
        hintEngage.style.opacity = drag.dx > 0 ? String(p) : '0';
      }
    });
    function clearSelection() {
      for (const sel of [shadow.getSelection && shadow.getSelection(), document.getSelection()]) {
        if (sel && sel.rangeCount) sel.removeAllRanges();
      }
    }
    const endDrag = (e, cancelled) => {
      if (!drag || e.pointerId !== drag.id) return;
      clearTimeout(drag.longPress);
      card.classList.remove('is-dragging');
      const d = drag;
      drag = null;
      if (!d.moved) return;
      const dir = cancelled ? null : classifyDrag({ dx: d.dx, dy: d.dy, width: card.clientWidth, velocity: d.v });
      if (dir === 'left') {
        handlers.onSwipe(dir); // the ghost carries the dragged card off from where it is
        return;
      }
      if (dir === 'right') {
        // Engage keeps the post: spring the card back to center, then open the menu.
        card.animate([{ transform: card.style.transform }, { transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.9,.25,1.1)' });
        card.style.transform = '';
        hintSkip.style.opacity = hintEngage.style.opacity = '0';
        handlers.onSwipe(dir, { dragged: true });
        return;
      }
      card.animate([{ transform: card.style.transform }, { transform: 'none' }], { duration: 180, easing: 'ease-out' });
      card.style.transform = '';
      hintSkip.style.opacity = hintEngage.style.opacity = '0';
    };
    card.addEventListener('pointerup', (e) => endDrag(e, false));
    card.addEventListener('pointercancel', (e) => endDrag(e, true));

    ensureMounted();

    return {
      setLauncherVisible: (v) => {
        ensureMounted();
        launcher.hidden = !v;
      },
      ensureMounted,
      open,
      close,
      setMode,
      renderPost,
      setProgress,
      showEngage,
      showReactions,
      showComposer,
      composerValue: () => textarea.value,
      showBusy: (label) => (busyLabel.textContent = label),
      showFailure,
      showHelp,
      showToast,
      hideToast,
      showEnd,
      nudge,
      showBlocked: (reason) => (blockedReason.textContent = reason + ' Nothing was retried.'),
      showNative: (text) => (nativePill.textContent = text),
      scrollCard,
      announce,
      focusCard,
    };
  }

  NS.ui = { createUI };
})(globalThis);
