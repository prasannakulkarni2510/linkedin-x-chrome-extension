// Mock X timeline that mirrors X's post markup (data-testid attributes) and native behavior
// closely enough to exercise Swipe Mode offline: like/repost/bookmark toggles, the repost menu,
// reply and quote windows (which move the URL to /compose/post), toasts, X's single-letter
// shortcuts, and timeline virtualization (posts far off-screen are removed from the DOM).
// Scenarios via ?scenario=: default | broken (Like does nothing) | short | tight (aggressive
// virtualization).
(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  const scenario = params.get('scenario') || 'default';
  const HOME = location.pathname + location.search;
  const INITIAL = 6;
  const PAGE = 5;
  const MARGIN = scenario === 'tight' ? 150 : 1600;

  const POSTS = [
    {
      name: 'Priya Nair', handle: 'priyabuilds', time: '2h', hue: 12, showMore: true,
      text: 'We cut our on-call pages by 62% this quarter without hiring anyone.\n\nEvery alert needs an owner and a runbook, or it gets deleted. Noisy-but-harmless alerts moved to a daily digest.',
      rest: '\n\nThe last step was the hardest: deleting alerts nobody could explain. Nothing broke.',
    },
    { name: 'Marcus Webb', handle: 'marcuswebb', time: '5h', hue: 210, image: true, text: 'Six months of tracking where our design hours go. Meetings about the design took longer than the design.' },
    { name: 'Brightline Analytics', handle: 'brightline', promoted: true, hue: 280, text: 'Dashboards your finance team will actually open. Start a free trial today.' },
    {
      name: 'Elena Sorensen', handle: 'elenasorensen', time: '9h', hue: 150,
      card: { domain: 'kestrel.blog', title: 'What we learned shipping 40 experiments in one quarter' },
      text: 'We wrote up every experiment from Q3, including the 31 that did nothing.',
    },
    { name: 'Daniel Okafor', handle: 'dokafor', time: '12h', hue: 35, liked: true, text: 'We closed our seed round this morning. Fourteen months, 63 investor meetings, two near misses.' },
    { name: 'Hana Kobayashi', handle: 'hanak', time: '1d', hue: 330, video: true, text: 'A 3-minute walkthrough of how we version design tokens without breaking 40 product teams.' },
    {
      name: 'Tom Alvarez', handle: 'tomalvarez', time: '1d', hue: 190, social: 'Priya Nair reposted',
      quote: { name: 'Grace Lin', handle: 'gracelin', text: 'Code review is a teaching tool first and a gate second.' },
      text: 'The clearest framing of code review I have read this year.',
    },
    { name: 'Amara Chen', handle: 'amarachen', time: '2d', hue: 95, poll: ['3 or fewer', '4 to 5', '6 or more'], text: 'How many interview rounds is too many? Be honest.' },
    { name: 'Rafael Duarte', handle: 'rduarte', time: '2d', hue: 260, image: true, text: 'Team offsite in Porto. Two days of planning, one day of pastel de nata research.' },
    { name: 'Sofia Rossi', handle: 'sofiarossi', time: '3d', hue: 5, text: 'Unpopular opinion: most brand guidelines are too long to be followed. Ours is now one page.' },
    { name: 'Kwame Mensah', handle: 'kwamem', time: '3d', hue: 175, text: 'Onboarding: seven screens down to three. Activation up 18%.' },
    { name: 'Lena Fischer', handle: 'lenafischer', time: '4d', hue: 220, text: 'Reminder: rotate the API keys you pasted into that "temporary" script in 2021.' },
    { name: 'Owen Price', handle: 'owenprice', time: '4d', hue: 45, text: 'Hiring three backend engineers in Lisbon. Hybrid, visa support, no leetcode.' },
    { name: 'Mei Tanaka', handle: 'meitanaka', time: '5d', hue: 300, text: 'Our small-model evaluation guide is public. Feedback welcome.' },
    { name: 'Jonas Berg', handle: 'jonasberg', time: '5d', hue: 120, text: 'Wrote our incident report in plain language for once. Customers actually read it.' },
    { name: 'Nadia Haddad', handle: 'nadiah', time: '6d', hue: 15, text: 'Shipping on Fridays is fine if rolling back is boring.' },
  ].map((p, i) => Object.assign({ id: String(1800000000000000000n + BigInt(i * 7919)) }, p));

  const TOTAL = scenario === 'short' ? 8 : POSTS.length;
  const state = new Map(POSTS.map((p) => [p.id, { liked: !!p.liked, reposted: false, bookmarked: false, replies: [], quotes: [] }]));
  let shortcutsFired = 0;

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    kids.flat().forEach((c) => c != null && c !== false && el.append(c.nodeType ? c : document.createTextNode(String(c))));
    return el;
  }

  const svg = (body, w, ht) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${ht}">${body}</svg>`);
  const avatar = (p) => svg(`<rect width="40" height="40" fill="hsl(${p.hue},55%,55%)"/><text x="20" y="26" font-size="16" text-anchor="middle" fill="#fff" font-family="sans-serif">${p.name[0]}</text>`, 40, 40);
  const photo = (p) => svg(`<rect width="560" height="300" fill="hsl(${p.hue},40%,85%)"/><rect x="40" y="180" width="80" height="80" fill="hsl(${p.hue},50%,50%)"/><rect x="160" y="120" width="80" height="140" fill="hsl(${p.hue},50%,45%)"/><rect x="280" y="60" width="80" height="200" fill="hsl(${p.hue},50%,40%)"/>`, 560, 300);

  // --- toasts ----------------------------------------------------------------------------
  function toast(msg) {
    const t = h('div', { role: 'alert', 'data-testid': 'toast' }, msg);
    document.getElementById('toasts').append(t);
    setTimeout(() => t.remove(), 3000);
  }

  // --- post markup -----------------------------------------------------------------------
  function actionBar(p) {
    const s = state.get(p.id);
    const btn = (testid, label, fn) => h('button', { type: 'button', 'data-testid': testid, 'aria-label': label, onclick: fn }, label.split('.')[0]);
    return h(
      'div',
      { role: 'group', 'aria-label': '12 replies, 40 reposts, 300 likes' },
      btn('reply', '12 Replies. Reply', () => openComposer('reply', p)),
      s.reposted ? btn('unretweet', '41 reposts. Reposted', (e) => openRepostMenu(e, p)) : btn('retweet', '40 reposts. Repost', (e) => openRepostMenu(e, p)),
      s.liked ? btn('unlike', '301 Likes. Liked', () => setFlag(p, 'liked', false)) : btn('like', '300 Likes. Like', () => scenario !== 'broken' && setFlag(p, 'liked', true)),
      s.bookmarked
        ? btn('removeBookmark', 'Bookmarked', () => setFlag(p, 'bookmarked', false))
        : btn('bookmark', 'Bookmark', () => {
            setFlag(p, 'bookmarked', true);
            toast('Added to your Bookmarks');
          })
    );
  }

  function userName(p, withTime) {
    return h(
      'div',
      { 'data-testid': 'User-Name' },
      h('div', { class: 'name' }, h('a', { href: '/' + p.handle, role: 'link' }, h('span', null, p.name)), p.verified ? h('span', { 'data-testid': 'icon-verified', class: 'badge', 'aria-label': 'Verified account' }) : null),
      h('div', { class: 'muted' }, h('a', { href: '/' + p.handle, role: 'link', tabindex: '-1' }, h('span', null, '@' + p.handle))),
      withTime && p.time ? h('div', { class: 'muted' }, h('span', null, '·')) : null,
      withTime && p.time ? h('div', { class: 'muted' }, h('a', { href: '/' + p.handle + '/status/' + p.id, role: 'link' }, h('time', { datetime: '2026-10-21T08:00:00.000Z' }, p.time))) : null
    );
  }

  function article(p) {
    const body = [];
    body.push(h('div', { class: 'head' }, userName(p, true), p.promoted ? h('div', { class: 'ad' }, h('span', null, 'Ad')) : null, h('button', { 'data-testid': 'caret', 'aria-label': 'More', type: 'button' }, '…')));
    body.push(h('div', { 'data-testid': 'tweetText', lang: 'en', dir: 'auto' }, h('span', null, p.focal && p.rest ? p.text + p.rest : p.text), p.emoji ? h('img', { alt: '😂', src: svg('<circle cx="9" cy="9" r="9" fill="gold"/>', 18, 18), class: 'emoji' }) : null));
    if (p.showMore && !p.focal) body.push(h('button', { type: 'button', 'data-testid': 'tweet-text-show-more-link', class: 'show-more', onclick: () => (location.href = '/' + p.handle + '/status/' + p.id) }, 'Show more'));
    if (p.image) body.push(h('div', { 'data-testid': 'tweetPhoto' }, h('img', { alt: 'Image', src: photo(p) })));
    if (p.video) body.push(h('div', { 'data-testid': 'videoComponent', class: 'video' }, h('video', { poster: photo(p), muted: true }), '▶'));
    if (p.poll) body.push(h('div', { 'data-testid': 'cardPoll', class: 'poll' }, p.poll.map((o) => h('div', null, o))));
    if (p.card) {
      body.push(
        h('div', { 'data-testid': 'card.wrapper', class: 'card' }, h('a', { href: 'https://t.co/demo' + p.id.slice(-4), rel: 'noopener', target: '_blank' }, h('img', { alt: '', src: photo(p) }), h('div', { class: 'muted' }, p.card.domain), h('div', null, p.card.title)))
      );
    }
    if (p.quote) {
      const q = p.quote;
      body.push(h('div', { role: 'link', tabindex: '0', class: 'quote' }, userName({ name: q.name, handle: q.handle }, false), h('div', { 'data-testid': 'tweetText' }, q.text)));
    }
    body.push(actionBar(p));
    return h(
      'article',
      { 'data-testid': 'tweet', role: 'article', tabindex: '0', 'aria-labelledby': 'id-' + p.id },
      p.social ? h('div', { 'data-testid': 'socialContext' }, p.social) : null,
      h('div', { class: 'row' }, h('div', { 'data-testid': 'Tweet-User-Avatar' }, h('a', { href: '/' + p.handle }, h('img', { alt: '', src: avatar(p) }))), h('div', { class: 'body' }, body))
    );
  }

  // --- timeline with virtualization ------------------------------------------------------
  const cells = [];
  const timeline = document.getElementById('timeline');

  function mount(c) {
    c.el.style.height = '';
    c.el.replaceChildren(article(c.post)); // a new element every time, like X
    c.mounted = true;
  }

  function addCells(n) {
    const start = cells.length;
    for (let i = start; i < Math.min(TOTAL, start + n); i++) {
      const c = { post: POSTS[i], el: h('div', { 'data-testid': 'cellInnerDiv' }), mounted: false };
      cells.push(c);
      timeline.append(c.el);
      mount(c);
    }
  }

  function virtualize() {
    for (const c of cells) {
      const r = c.el.getBoundingClientRect();
      const far = r.bottom < -MARGIN || r.top > innerHeight + MARGIN;
      if (far && c.mounted) {
        c.el.style.height = c.el.offsetHeight + 'px';
        c.el.replaceChildren();
        c.mounted = false;
      } else if (!far && !c.mounted) {
        mount(c);
      }
    }
  }

  function rerender(p) {
    const c = cells.find((x) => x.post === p);
    if (c && c.mounted) {
      const bar = c.el.querySelector('[role="group"]');
      bar.replaceWith(actionBar(p));
    }
  }

  function setFlag(p, key, v) {
    setTimeout(() => {
      state.get(p.id)[key] = v;
      rerender(p);
    }, 120);
  }

  let loading = false;
  let postPage = false; // the post page loads replies, not more timeline
  function maybeLoad() {
    if (loading || cells.length >= TOTAL || postPage) return;
    if (scrollY + innerHeight < document.documentElement.scrollHeight - 600) return;
    loading = true;
    document.getElementById('loader').hidden = false;
    setTimeout(() => {
      addCells(PAGE);
      loading = false;
      document.getElementById('loader').hidden = true;
      virtualize();
    }, 300);
  }

  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      virtualize();
      maybeLoad();
    });
  });

  // --- repost menu -----------------------------------------------------------------------
  const layers = document.getElementById('layers');

  function closeLayers() {
    layers.replaceChildren();
  }

  function openRepostMenu(e, p) {
    closeLayers();
    const s = state.get(p.id);
    const r = e.currentTarget.getBoundingClientRect();
    const menu = h(
      'div',
      { role: 'menu', style: `left:${r.left + scrollX}px;top:${r.bottom + scrollY}px` },
      s.reposted
        ? h('div', { role: 'menuitem', tabindex: '0', 'data-testid': 'unretweetConfirm', onclick: () => (closeLayers(), setFlag(p, 'reposted', false)) }, h('span', null, 'Undo repost'))
        : h('div', { role: 'menuitem', tabindex: '0', 'data-testid': 'retweetConfirm', onclick: () => (closeLayers(), setFlag(p, 'reposted', true)) }, h('span', null, 'Repost')),
      h('a', { role: 'menuitem', href: '/compose/post', onclick: (ev) => (ev.preventDefault(), closeLayers(), openComposer('quote', p)) }, h('span', null, 'Quote'))
    );
    layers.append(menu);
  }

  document.addEventListener('mousedown', (e) => {
    if (layers.firstChild && !layers.contains(e.target) && layers.querySelector('[role="menu"]')) closeLayers();
  });

  // --- reply / quote composer ------------------------------------------------------------
  function openComposer(kind, p) {
    closeLayers();
    history.pushState({}, '', '/compose/post');
    const editor = h('div', { 'data-testid': 'tweetTextarea_0', contenteditable: 'true', role: 'textbox', 'aria-multiline': 'true', 'data-placeholder': kind === 'reply' ? 'Post your reply' : 'Add a comment' });
    const submit = h('button', { type: 'button', 'data-testid': 'tweetButton', 'aria-disabled': 'true' }, kind === 'reply' ? 'Reply' : 'Post');
    const sync = () => submit.setAttribute('aria-disabled', editor.innerText.trim() ? 'false' : 'true');
    editor.addEventListener('input', sync);
    const close = () => {
      mask.remove();
      history.replaceState({}, '', HOME);
    };
    const closeBtn = h('button', {
      type: 'button',
      'data-testid': 'app-bar-close',
      'aria-label': 'Close',
      onclick: () => {
        if (!editor.innerText.trim()) return close();
        const sheet = h(
          'div',
          { role: 'alertdialog', 'data-testid': 'confirmationSheetDialog' },
          h('div', null, h('b', null, 'Discard post?'), h('p', null, "This can't be undone."), h('button', { type: 'button', 'data-testid': 'confirmationSheetConfirm', onclick: () => (sheet.remove(), close()) }, 'Discard'), h('button', { type: 'button', 'data-testid': 'confirmationSheetCancel', onclick: () => sheet.remove() }, 'Cancel'))
        );
        document.body.append(sheet);
      },
    }, '✕');
    submit.addEventListener('click', () => {
      if (submit.getAttribute('aria-disabled') === 'true') return;
      const text = editor.innerText.trim();
      setTimeout(() => {
        state.get(p.id)[kind === 'reply' ? 'replies' : 'quotes'].push(text);
        close();
        toast('Your post was sent.');
      }, 250);
    });
    const dialog = h(
      'div',
      { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'modal-header' },
      h('div', { class: 'bar' }, closeBtn, h('span', { id: 'modal-header' }, kind === 'reply' ? 'Reply' : 'Quote')),
      kind === 'reply' ? h('div', { class: 'muted' }, 'Replying to @' + p.handle) : null,
      editor,
      kind === 'quote' ? h('div', { class: 'quote' }, h('b', null, p.name), h('div', null, p.text)) : null,
      h('div', { class: 'bar' }, h('span'), submit)
    );
    const mask = h('div', { class: 'mask' }, dialog);
    document.body.append(mask);
    editor.focus();
  }

  // X also listens on window in the capture phase, registered long before a document_idle content
  // script could. o expands the photo: it takes the key for itself.
  window.addEventListener(
    'keydown',
    (e) => {
      const t = e.target;
      if (e.key !== 'o' || e.ctrlKey || e.metaKey || e.altKey || (t && (t.isContentEditable || /^(INPUT|TEXTAREA)$/.test(t.tagName)))) return;
      shortcutsFired++;
      e.stopImmediatePropagation();
    },
    true
  );

  // --- X's own single-letter shortcuts (act on the first post) ---------------------------
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (e.ctrlKey || e.metaKey || e.altKey || (t && (t.isContentEditable || /^(INPUT|TEXTAREA)$/.test(t.tagName)))) return;
    const first = cells.find((c) => c.mounted);
    if (!first) return;
    if (e.key === 'l') {
      shortcutsFired++;
      setFlag(first.post, 'liked', !state.get(first.post.id).liked);
    } else if (e.key === 'b') {
      shortcutsFired++;
      setFlag(first.post, 'bookmarked', true);
    } else if (e.key === 'j' || e.key === 'k' || e.key === 'r' || e.key === 't') {
      shortcutsFired++;
    }
  });

  // ?view=status (or any /status/ path): a post page. The URL moves to /x/<handle>/status/<id> like X, with the post
  // first and replies below it.
  const REPLIES = [
    { name: 'Ivy Holt', handle: 'ivyholt', time: '1h', hue: 340, text: 'The meetings-about-design bar is painfully accurate ', emoji: true },
    { name: 'Sam Patel', handle: 'sampatel', time: '1h', hue: 60, verified: true, text: 'We tracked the same thing. Ours was worse.' },
    { name: 'Noor Aziz', handle: 'nooraziz', time: '45m', hue: 100, image: true, text: 'Here is ours from last quarter.' },
    {
      name: 'Leo Grant', handle: 'leogrant', time: '30m', hue: 250, showMore: true,
      text: 'Can you share the template? We tried something similar last year and gave up after a month',
      rest: ' because nobody agreed on what counted as design time. Curious how you defined it.',
    },
  ].map((p, i) => Object.assign({ id: String(1900000000000000000n + BigInt(i * 104729)) }, p));
  // Further replies X loads only when you scroll near the end of the post page.
  const LATER = [
    { name: 'Mia Torres', handle: 'miatorres', time: '20m', hue: 20, text: 'Saving this for our retro.' },
    { name: 'Ken Ito', handle: 'kenito', time: '10m', hue: 200, text: 'The chart says it all.' },
  ].map((p, i) => Object.assign({ id: String(1950000000000000000n + BigInt(i * 7907)) }, p));
  REPLIES.concat(LATER).forEach((r) => state.set(r.id, { liked: false, reposted: false, bookmarked: false, replies: [], quotes: [] }));

  if (params.get('view') === 'status' || /\/status\//.test(location.pathname)) {
    // The post in the URL, or ?post=<index>, or Marcus. On its own page a long post shows in full.
    const all = POSTS.concat(REPLIES, LATER);
    const pick =
      all.find((x) => location.pathname.includes(x.id) || params.get('id') === x.id) ||
      (params.has('post') && POSTS[Number(params.get('post'))]) ||
      POSTS[1];
    const focal = Object.assign({}, pick, { focal: true });
    history.replaceState({}, '', '/x/' + focal.handle + '/status/' + focal.id);
    postPage = true;
    const addPost = (p) => {
      const c = { post: p, el: h('div', { 'data-testid': 'cellInnerDiv' }), mounted: false };
      cells.push(c);
      if (discover) timeline.insertBefore(c.el, discover); // later replies load above the section
      else timeline.append(c.el);
      mount(c);
    };
    let discover = null;
    [focal].concat(REPLIES).forEach(addPost);
    // Below the replies X lists posts it recommends, under a heading. They are not replies.
    discover = h('div', { 'data-testid': 'cellInnerDiv' }, h('div', { class: 'section' }, h('h2', { role: 'heading', 'aria-level': '2' }, h('span', null, 'Discover more'))));
    timeline.append(discover);
    [POSTS[9], POSTS[10]].forEach((p) => {
      const c = { post: p, el: h('div', { 'data-testid': 'cellInnerDiv' }), mounted: false };
      cells.push(c);
      timeline.append(c.el);
      mount(c);
    });
    let more = LATER.slice();
    addEventListener('scroll', () => {
      if (!more.length || scrollY + innerHeight < document.documentElement.scrollHeight - 200) return;
      more.forEach(addPost);
      more = [];
    });
  } else {
    addCells(INITIAL);
    virtualize();
  }

  window.__mockFeed = {
    state: (id) => JSON.parse(JSON.stringify(state.get(id))),
    idOfAuthor: (name) => (POSTS.find((p) => p.name === name) || {}).id,
    shortcutsFired: () => shortcutsFired,
    mounted: (name) => cells.some((c) => c.mounted && c.post.name === name),
  };
})();
