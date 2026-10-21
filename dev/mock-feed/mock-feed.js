// Mock feed that mirrors LinkedIn's post markup and native interactions closely enough to
// exercise Swipe Mode offline. Scenarios via ?scenario=: default | broken | short.
(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  const scenario = params.get('scenario') || 'default';
  const INITIAL = 6;
  const PAGE = 5;
  const REACTIONS = [
    ['like', 'Like', '\u{1F44D}'],
    ['celebrate', 'Celebrate', '\u{1F44F}'],
    ['support', 'Support', '\u{1F91D}'],
    ['love', 'Love', '\u{2764}\u{FE0F}'],
    ['insightful', 'Insightful', '\u{1F4A1}'],
    ['funny', 'Funny', '\u{1F604}'],
  ];

  const POSTS = [
    {
      author: 'Priya Nair', headline: 'Engineering Manager at Fernbank Labs', time: '2h', hue: 12, reactions: 248, comments: 31,
      text: 'We cut our on-call pages by 62% this quarter without hiring anyone.\n\nWhat actually worked:\n1. Every alert needs an owner and a runbook, or it gets deleted.\n2. We moved "noisy but harmless" alerts to a daily digest instead of paging.\n3. Postmortems end with one change to the alerting rules, not a list of ten.\n4. New hires shadow on-call for two weeks before they carry the pager.\n\nThe surprising part: morale went up before the numbers did. People could see the noise shrinking week by week.\n\nWhat is the one alert your team would delete tomorrow if you could?',
    },
    {
      author: 'Marcus Webb', headline: 'Founder, Tidewater Studio', time: '5h', hue: 210, reactions: 1204, comments: 87, image: 'chart',
      text: 'Six months of tracking where our design hours actually go. Spoiler: meetings about the design took longer than the design.',
    },
    {
      author: 'Brightline Analytics', headline: '18,402 followers', promoted: true, hue: 280, reactions: 96, comments: 4, image: 'ad',
      text: 'Dashboards your finance team will actually open. Start a free trial today.',
    },
    {
      author: 'Elena Sorensen', headline: 'Head of Product at Kestrel Health', time: '1d', hue: 150, reactions: 512, comments: 44,
      article: { title: 'What we learned shipping 40 experiments in one quarter', sub: 'kestrel.blog · 7 min read' },
      text: 'We wrote up every experiment from Q3, including the 31 that did nothing. The flops taught us more than the wins.',
    },
    {
      author: 'Daniel Okafor', headline: 'CEO at Lumen Ledger', time: '1d', hue: 35, reactions: 3310, comments: 402, reacted: 'celebrate',
      text: 'We closed our seed round this morning. Fourteen months, 63 investor meetings, two near misses. Thank you to the early customers who believed before the deck did.',
    },
    {
      author: 'Hana Kobayashi', headline: 'Design Systems Lead at Orbit & Co', time: '2d', hue: 330, reactions: 640, comments: 52, video: true,
      text: 'A 3-minute walkthrough of how we version design tokens without breaking 40 product teams.',
    },
    {
      author: 'Tom Alvarez', headline: 'Staff Engineer at Northwind', time: '2d', hue: 190, reactions: 221, comments: 18,
      header: 'Priya Nair reposted this',
      reshare: { author: 'Grace Lin', text: 'Code review is a teaching tool first and a gate second. If your reviews only ever say "LGTM" or "no", you are leaving the best part on the table.' },
      text: 'The clearest framing of code review I have read this year.',
    },
    {
      author: 'Amara Chen', headline: 'Talent Partner at Quarry', time: '3d', hue: 95, reactions: 158, comments: 230,
      poll: { q: 'How many interview rounds is too many?', options: ['3 or fewer', '4 to 5', '6 or more'] },
      text: 'Settling a debate with our hiring managers. Be honest.',
    },
    {
      author: 'Rafael Duarte', headline: 'Data Scientist at Pinecrest', time: '3d', hue: 260, reactions: 89, comments: 12, image: 'photo',
      text: 'Our team offsite in Porto. Two days of planning, one day of pastel de nata research.',
    },
    {
      author: 'Sofia Rossi', headline: 'VP Marketing at Calder', time: '4d', hue: 5, reactions: 402, comments: 61,
      text: 'Unpopular opinion: most brand guidelines are too long to be followed. Ours is now one page. Adoption tripled.',
    },
    {
      author: 'Kwame Mensah', headline: 'Product Designer at Saltbox', time: '4d', hue: 175, reactions: 77, comments: 9, image: 'chart',
      text: 'Before and after of our onboarding flow. Seven screens down to three. Activation up 18%.',
    },
    {
      author: 'Lena Fischer', headline: 'Security Engineer at Vault Nine', time: '5d', hue: 220, reactions: 931, comments: 140,
      text: 'Reminder: rotate the API keys you pasted into that "temporary" script in 2021. Yes, that one.',
    },
    {
      author: 'Owen Price', headline: 'Recruiter at Harbor Talent', time: '5d', hue: 45, reactions: 54, comments: 21,
      text: 'We are hiring three backend engineers in Lisbon. Hybrid, visa support, no leetcode. Comment and I will reach out.',
    },
    {
      author: 'Mei Tanaka', headline: 'Researcher at Ardent Labs', time: '6d', hue: 300, reactions: 1820, comments: 205,
      article: { title: 'A field guide to evaluating small language models', sub: 'ardentlabs.ai · 12 min read' },
      text: 'Our evaluation guide is finally public. Feedback welcome, especially the parts you disagree with.',
    },
    {
      author: 'Jonas Berg', headline: 'Engineering Lead at Fjordline', time: '1w', hue: 200, reactions: 66, comments: 8,
      text: 'Ten years at the same company today. Still learning something every week.',
    },
    {
      author: 'Aisha Rahman', headline: 'Operations Director at Meridian', time: '1w', hue: 20, reactions: 300, comments: 33, image: 'photo',
      text: 'New warehouse floor plan went live. Pick times down 22% in the first week.',
    },
    {
      author: 'Diego Morales', headline: 'Sales Lead at Copperline', time: '1w', hue: 130, reactions: 45, comments: 6,
      text: 'The best discovery calls I have run had me talking less than 30% of the time.',
    },
    {
      author: 'Nora Lindqvist', headline: 'Product Manager at Willow', time: '2w', hue: 240, reactions: 512, comments: 74,
      text: 'We stopped writing PRDs longer than two pages. Specs got clearer, not vaguer.',
    },
    {
      author: 'Ibrahim Yusuf', headline: 'Founder at Kiln Robotics', time: '2w', hue: 60, reactions: 2201, comments: 188, video: true,
      text: 'First outdoor test of our sorting arm. It dropped exactly one apple.',
    },
    {
      author: 'Clara Novak', headline: 'Learning Designer at Brightpath', time: '3w', hue: 160, reactions: 120, comments: 15,
      text: 'Small habit that changed my workshops: end every session by asking what people will do differently on Monday.',
    },
  ];

  POSTS.forEach((p, i) => {
    p.id = i + 1;
    p.urn = String(7100000000000000000n + BigInt(i + 1));
    p.slug = p.author.toLowerCase().replace(/[^a-z]+/g, '-');
  });
  if (scenario === 'broken') POSTS[0].broken = true;
  if (scenario === 'short') POSTS.length = 8;

  const state = new Map(POSTS.map((p) => [p.id, { reaction: p.reacted || null, saved: false, voted: null }]));
  const feed = document.getElementById('feed');
  const loader = document.getElementById('feed-loader');
  const feedEnd = document.getElementById('feed-end');
  let rendered = 0;
  let loading = false;
  let reactionTimer = null;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  function svgUri(svg) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function avatar(name, hue) {
    const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('');
    return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="hsl(${hue},45%,62%)"/><text x="48" y="60" font-family="Segoe UI,Arial" font-size="36" font-weight="700" fill="#fff" text-anchor="middle">${initials}</text></svg>`);
  }

  function art(kind, hue) {
    const bg = `hsl(${hue},40%,92%)`;
    const fg = `hsl(${hue},55%,42%)`;
    if (kind === 'chart') {
      const bars = [120, 180, 90, 220, 160, 250].map((h, i) => `<rect x="${70 + i * 85}" y="${300 - h}" width="50" height="${h}" rx="6" fill="${fg}" opacity="${0.55 + i * 0.07}"/>`).join('');
      return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="340"><rect width="640" height="340" fill="${bg}"/>${bars}<line x1="50" y1="300" x2="600" y2="300" stroke="${fg}" stroke-width="2"/></svg>`);
    }
    if (kind === 'ad') {
      return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="300"><rect width="640" height="300" fill="${fg}"/><text x="40" y="140" font-family="Segoe UI,Arial" font-size="38" font-weight="800" fill="#fff">Dashboards that</text><text x="40" y="190" font-family="Segoe UI,Arial" font-size="38" font-weight="800" fill="#fff">get opened.</text></svg>`);
    }
    if (kind === 'poster') {
      return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="hsl(${hue},30%,20%)"/><circle cx="320" cy="180" r="44" fill="rgba(255,255,255,.85)"/><path d="M306 156 L346 180 L306 204 Z" fill="hsl(${hue},30%,20%)"/></svg>`);
    }
    return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="hsl(${hue},45%,78%)"/><circle cx="500" cy="90" r="46" fill="hsl(45,90%,70%)"/><path d="M0 300 L170 150 L300 270 L420 180 L640 320 L640 360 L0 360 Z" fill="${fg}"/></svg>`);
  }

  const truncate = (t) => (t.length > 220 ? t.slice(0, 200).replace(/\s+\S*$/, '') + '…' : t);

  // ?scenario=v2 renders LinkedIn's 2026 feed markup instead (mock-feed-v2.js).
  if (scenario === 'v2') {
    window.__mockShared = { POSTS, REACTIONS, esc, avatar, art, truncate };
    return;
  }

  function mediaHtml(p) {
    if (p.image) return `<div class="update-components-image"><img class="update-components-image__image" alt="Image from ${esc(p.author)}" src="${art(p.image, p.hue)}"></div>`;
    if (p.video) return `<div class="update-components-linkedin-video"><video preload="none" poster="${art('poster', p.hue)}"></video></div>`;
    if (p.article) {
      return `<div class="update-components-article"><a class="update-components-article__meta" href="https://example.com/${p.slug}"><img alt="" src="${art('photo', p.hue)}"><div class="update-components-article__title">${esc(p.article.title)}</div><div class="update-components-article__subtitle">${esc(p.article.sub)}</div></a></div>`;
    }
    if (p.poll) {
      return `<div class="update-components-poll"><div class="poll-question">${esc(p.poll.q)}</div>${p.poll.options.map((o, i) => `<button class="poll-option" data-option="${i}">${esc(o)}</button>`).join('')}</div>`;
    }
    if (p.reshare) {
      const hue = (p.hue + 120) % 360;
      return `<div class="update-components-mini-update-v2"><div class="update-components-actor"><a class="update-components-actor__image" href="/in/grace-lin/"><img class="update-components-actor__avatar-image" alt="${esc(p.reshare.author)}" src="${avatar(p.reshare.author, hue)}"></a><a class="update-components-actor__meta-link" href="/in/grace-lin/"><span class="update-components-actor__title"><span aria-hidden="true">${esc(p.reshare.author)}</span></span><span class="update-components-actor__description">Engineering Director</span></a></div><div class="update-components-text"><span dir="ltr">${esc(p.reshare.text)}</span></div></div>`;
    }
    return '';
  }

  function postHtml(p) {
    const long = p.text.length > 220;
    return `
<div class="feed-shared-update-v2" data-urn="urn:li:activity:${p.urn}" data-mock-id="${p.id}" role="article">
  ${p.header ? `<div class="update-components-header"><span>${esc(p.header)}</span></div>` : ''}
  <div class="update-components-actor">
    <a class="update-components-actor__image" href="/in/${p.slug}/"><img class="update-components-actor__avatar-image" alt="${esc(p.author)}" src="${avatar(p.author, p.hue)}"></a>
    <a class="update-components-actor__meta-link" href="/in/${p.slug}/">
      <span class="update-components-actor__title"><span aria-hidden="true">${esc(p.author)}</span><span class="visually-hidden">View ${esc(p.author)}'s profile</span></span>
      <span class="update-components-actor__description">${esc(p.headline)}</span>
      <span class="update-components-actor__sub-description">${p.promoted ? 'Promoted' : esc(p.time) + ' · Edited'}</span>
    </a>
    <button class="feed-shared-control-menu__trigger" aria-label="Open control menu for post by ${esc(p.author)}">⋯</button>
  </div>
  <div class="feed-shared-update-v2__description">
    <div class="update-components-text"><span dir="ltr">${esc(long ? truncate(p.text) : p.text)}</span></div>
    ${long ? '<button class="feed-shared-inline-show-more-text__see-more-less-toggle" aria-label="see more, visually reveals content which is already detected by screen readers">…more</button>' : ''}
  </div>
  ${mediaHtml(p)}
  <div class="social-details-social-counts"><span>${p.reactions} reactions</span><span class="mock-comment-count">${p.comments} comments</span></div>
  <div class="feed-shared-social-action-bar">
    <button class="react-button__trigger" aria-pressed="false" aria-label="React Like"><span class="react-button__text">Like</span></button>
    <button class="comment-button" aria-label="Comment">Comment</button>
    <button class="social-reshare-button" aria-label="Repost">Repost</button>
    <button class="send-privately-button" aria-label="Send in a private message">Send</button>
  </div>
  <div class="comments-comment-box" hidden>
    <form class="comments-comment-box__form" onsubmit="return false">
      <div class="comments-comment-texteditor"><div class="ql-editor ql-blank" contenteditable="true" data-placeholder="Add a comment…"></div></div>
      <button type="button" class="comments-comment-box__submit-button" disabled>Comment</button>
    </form>
  </div>
  <div class="comments-comments-list"></div>
</div>`;
  }

  const postOf = (el) => el.closest('.feed-shared-update-v2');
  const dataOf = (postEl) => POSTS[Number(postEl.dataset.mockId) - 1];

  function syncReaction(postEl) {
    const s = state.get(Number(postEl.dataset.mockId));
    const btn = postEl.querySelector('.react-button__trigger');
    const r = REACTIONS.find((x) => x[0] === s.reaction);
    btn.setAttribute('aria-pressed', r ? 'true' : 'false');
    btn.setAttribute('aria-label', r ? 'Reaction button state: ' + r[1] : 'React Like');
    btn.classList.toggle('react-button--active', !!r);
    btn.querySelector('.react-button__text').textContent = r ? r[1] : 'Like';
  }

  function render(count) {
    const slice = POSTS.slice(rendered, rendered + count);
    feed.insertAdjacentHTML('beforeend', slice.map(postHtml).join(''));
    slice.forEach((p) => syncReaction(feed.querySelector(`[data-mock-id="${p.id}"]`)));
    rendered += slice.length;
    feedEnd.hidden = rendered < POSTS.length;
  }

  function toast(msg) {
    const li = document.createElement('li');
    li.className = 'artdeco-toast-item';
    li.setAttribute('role', 'alert');
    li.textContent = msg;
    document.getElementById('toasts').appendChild(li);
    setTimeout(() => li.remove(), 5000);
  }

  function closeMenus() {
    document.querySelectorAll('.artdeco-dropdown__content').forEach((m) => m.remove());
  }

  function closeReactions() {
    document.querySelectorAll('.reactions-menu').forEach((m) => m.remove());
  }

  function openReactions(btn) {
    const postEl = postOf(btn);
    if (dataOf(postEl).broken || postEl.querySelector('.reactions-menu')) return;
    const menu = document.createElement('div');
    menu.className = 'reactions-menu reactions-menu--active';
    menu.setAttribute('role', 'toolbar');
    menu.setAttribute('aria-label', 'Reactions');
    menu.innerHTML = REACTIONS.map(([id, label, icon]) => `<button class="reactions-menu__reaction-index" data-reaction="${id}" aria-label="${label}">${icon}</button>`).join('');
    btn.parentElement.appendChild(menu);
  }

  function dropdown(anchor, items) {
    closeMenus();
    const r = anchor.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'artdeco-dropdown__content';
    menu.style.left = r.left + window.scrollX + 'px';
    menu.style.top = r.bottom + window.scrollY + 4 + 'px';
    menu.innerHTML = '<ul>' + items.map(([act, label, sub]) => `<li><div class="artdeco-dropdown__item" role="button" tabindex="0" data-act="${act}">${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ''}</div></li>`).join('') + '</ul>';
    menu.dataset.post = postOf(anchor).dataset.mockId;
    document.body.appendChild(menu);
  }

  function openShareModal(p) {
    const overlay = document.createElement('div');
    overlay.className = 'artdeco-modal-overlay';
    overlay.innerHTML = `<div class="artdeco-modal share-box" role="dialog" aria-label="Create a post"><header><span>Repost with your thoughts</span><button class="artdeco-modal__dismiss" aria-label="Dismiss">✕</button></header><div class="ql-editor" contenteditable="true"></div><div class="share-box__reshared">Reposting ${esc(p.author)}'s post</div><button class="share-actions__primary-action">Post</button><div style="clear:both"></div></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.ql-editor').focus();
    overlay.querySelector('.artdeco-modal__dismiss').onclick = () => overlay.remove();
    overlay.querySelector('.share-actions__primary-action').onclick = () => {
      overlay.remove();
      setTimeout(() => toast('Post successful. View post'), 300);
    };
  }

  document.addEventListener('mouseover', (e) => {
    const btn = e.target.closest && e.target.closest('.react-button__trigger');
    if (btn) {
      clearTimeout(reactionTimer);
      reactionTimer = setTimeout(() => openReactions(btn), 300);
    } else if (e.target.closest && e.target.closest('.reactions-menu')) {
      clearTimeout(reactionTimer);
    }
  });

  document.addEventListener('mouseout', (e) => {
    if (e.target.closest && (e.target.closest('.react-button__trigger') || e.target.closest('.reactions-menu'))) {
      clearTimeout(reactionTimer);
      reactionTimer = setTimeout(closeReactions, 500);
    }
  });

  document.addEventListener('click', (e) => {
    const t = e.target;
    const reactionBtn = t.closest('.reactions-menu__reaction-index');
    if (reactionBtn) {
      const postEl = postOf(reactionBtn);
      state.get(Number(postEl.dataset.mockId)).reaction = reactionBtn.dataset.reaction;
      setTimeout(() => syncReaction(postEl), 250);
      closeReactions();
      return;
    }
    const react = t.closest('.react-button__trigger');
    if (react) {
      const postEl = postOf(react);
      if (dataOf(postEl).broken) return;
      const s = state.get(Number(postEl.dataset.mockId));
      s.reaction = s.reaction ? null : 'like';
      setTimeout(() => syncReaction(postEl), 250);
      return;
    }
    const commentBtn = t.closest('.comment-button');
    if (commentBtn) {
      const box = postOf(commentBtn).querySelector('.comments-comment-box');
      box.hidden = false;
      box.querySelector('.ql-editor').focus();
      return;
    }
    const submit = t.closest('.comments-comment-box__submit-button');
    if (submit) {
      if (submit.disabled) return;
      const postEl = postOf(submit);
      const editor = postEl.querySelector('.comments-comment-box .ql-editor');
      const text = editor.innerText.trim();
      submit.disabled = true;
      setTimeout(() => {
        const item = document.createElement('article');
        item.className = 'comments-comment-entity';
        item.innerHTML = '<b>Jordan Avery</b><span class="comments-comment-item__main-content"></span>';
        item.querySelector('span').textContent = text;
        postEl.querySelector('.comments-comments-list').prepend(item);
        editor.textContent = '';
        editor.classList.add('ql-blank');
        const p = dataOf(postEl);
        p.comments += 1;
        postEl.querySelector('.mock-comment-count').textContent = p.comments + ' comments';
      }, 500);
      return;
    }
    const repost = t.closest('.social-reshare-button');
    if (repost) {
      dropdown(repost, [['thoughts', 'Repost with your thoughts', 'Create a new post with this post attached'], ['repost', 'Repost', 'Instantly bring this post to others’ feeds']]);
      return;
    }
    const control = t.closest('.feed-shared-control-menu__trigger');
    if (control) {
      const s = state.get(Number(postOf(control).dataset.mockId));
      dropdown(control, [
        ['save', s.saved ? 'Unsave' : 'Save', s.saved ? 'Remove from saved items' : 'Save for later'],
        ['copy', 'Copy link to post'],
        ['hide', 'Not interested', 'Show fewer posts like this'],
      ]);
      return;
    }
    const item = t.closest('.artdeco-dropdown__item');
    if (item) {
      const menu = item.closest('.artdeco-dropdown__content');
      const postEl = feed.querySelector(`[data-mock-id="${menu.dataset.post}"]`);
      const p = dataOf(postEl);
      const s = state.get(p.id);
      closeMenus();
      if (item.dataset.act === 'repost') setTimeout(() => toast('Repost successful.'), 400);
      if (item.dataset.act === 'thoughts') openShareModal(p);
      if (item.dataset.act === 'save') {
        s.saved = !s.saved;
        postEl.dataset.mockSaved = String(s.saved);
        setTimeout(() => toast(s.saved ? 'Saved. See your saved items' : 'Removed from saved items'), 300);
      }
      if (item.dataset.act === 'copy') toast('Link copied to clipboard.');
      return;
    }
    const seeMore = t.closest('.feed-shared-inline-show-more-text__see-more-less-toggle');
    if (seeMore) {
      const postEl = postOf(seeMore);
      postEl.querySelector('.update-components-text span').textContent = dataOf(postEl).text;
      seeMore.remove();
      return;
    }
    const option = t.closest('.poll-option');
    if (option) {
      option.parentElement.querySelectorAll('.poll-option').forEach((o) => o.classList.toggle('is-voted', o === option));
      return;
    }
    if (!t.closest('.artdeco-dropdown__content')) closeMenus();
  });

  document.addEventListener('input', (e) => {
    const editor = e.target.closest && e.target.closest('.comments-comment-box .ql-editor');
    if (!editor) return;
    const empty = editor.innerText.trim() === '';
    editor.classList.toggle('ql-blank', empty);
    postOf(editor).querySelector('.comments-comment-box__submit-button').disabled = empty;
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenus();
  });

  window.addEventListener('scroll', () => {
    if (loading || rendered >= POSTS.length) return;
    if (window.innerHeight + window.scrollY < document.documentElement.scrollHeight - 800) return;
    loading = true;
    loader.hidden = false;
    setTimeout(() => {
      render(PAGE);
      loader.hidden = true;
      loading = false;
    }, 700);
  }, { passive: true });

  // Test hook: inspect native post state without reaching into closures.
  window.__mockFeed = {
    state: (id) => ({ ...state.get(id), comments: [...feed.querySelectorAll(`[data-mock-id="${id}"] .comments-comment-entity span`)].map((s) => s.textContent) }),
    idOfAuthor: (name) => (POSTS.find((p) => p.author === name) || {}).id,
  };

  render(INITIAL);

  // Simulates a LinkedIn redesign: post containers still match, but every inner class is renamed.
  if (scenario === 'unreadable') {
    feed.querySelectorAll('.feed-shared-update-v2 [class]').forEach((el) => {
      el.className = el.className.split(/\s+/).map((c) => 'x' + c.length + c.slice(-2)).join(' ');
    });
    feed.querySelectorAll('video, img').forEach((v) => v.remove());
    feed.querySelectorAll('[aria-label]').forEach((e) => e.removeAttribute('aria-label'));
    feed.querySelectorAll('a[href]').forEach((a) => a.setAttribute('href', '#'));
    rendered = POSTS.length;
  }
})();
