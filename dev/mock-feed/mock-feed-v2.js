// LinkedIn's 2026 feed markup, copied from a real layout report: posts are role="listitem" with an
// "update-card-…" componentkey, class names are hashed, there are no post URNs, and controls are
// found by aria-label. The reaction picker opens on click ("Open reactions menu"), not hover.
(function () {
  'use strict';
  const shared = window.__mockShared;
  if (!shared) return;
  const { POSTS, REACTIONS, esc, avatar, art, truncate } = shared;
  const INITIAL = 6;
  const PAGE = 5;
  const feed = document.getElementById('feed');
  const loader = document.getElementById('feed-loader');
  const feedEnd = document.getElementById('feed-end');
  const state = new Map(POSTS.map((p) => [p.id, { reaction: p.reacted || null, saved: false, comments: [] }]));
  let rendered = 0;
  let loading = false;

  // ?hiddenpicker=1: the reaction picker is already in every post, hidden, and click only reveals it.
  const HIDDEN_PICKER = !!new URLSearchParams(location.search).get('hiddenpicker');
  const cardKey = (p) => 'HMA' + p.urn.slice(-6) + 'q0TcPkdGxjRZ98d5Q';
  const label = (id) => (REACTIONS.find((r) => r[0] === id) || [])[1];

  function mediaHtml(p) {
    if (p.image) return `<a class="kfehwi kfekrj" href="https://www.linkedin.com/"><figure class="kfelnl"><img class="kfelng" data-loaded="true" alt="" width="520" height="292" style="width:100%;display:block" src="${art(p.image, p.hue)}"></figure></a>`;
    if (p.article) return `<a class="kfehwi kfekrj" href="https://example.com/${p.slug}"><figure class="kfelnl"><img class="kfelng" alt="" style="width:100%;display:block" src="${art('photo', p.hue)}"></figure><p class="kfek4p">${esc(p.article.title)}</p></a>`;
    return '';
  }

  function postHtml(p) {
    const key = cardKey(p);
    const long = p.text.length > 220;
    return `
<div role="listitem" class="kfellx kfeuz kfezr" componentkey="update-card-focus${key}FeedType_MAIN_FEED_RELEVANCE" data-mock-id="${p.id}" style="background:#fff;border:1px solid #dde2df;border-radius:10px;margin-bottom:10px;padding:12px 16px">
  <div class="kfeax1 kfelly" data-display-contents="true">
    <div class="kfellx kfeax9" componentkey="${key}">
      <h2 class="kfek4p"><span class="kfea19" style="position:absolute;width:1px;height:1px;overflow:hidden">Feed post</span></h2>
      ${p.header ? `<p class="kfekhd" style="font-size:12px;color:#5d6865">${esc(p.header)}</p>` : ''}
      <div class="kfekyn kfeax9" style="display:flex;gap:10px;align-items:flex-start">
        <a class="kfekt5" href="https://www.linkedin.com/in/${p.slug}/" aria-haspopup="dialog"><figure class="kfelnl" style="margin:0"><img class="kfelng" data-loaded="true" alt="" width="48" height="48" style="border-radius:50%" src="${avatar(p.author, p.hue)}"></figure></a>
        <div style="flex:1">
          <a class="kfehfe kfehvq" href="https://www.linkedin.com/in/${p.slug}/" style="color:inherit;text-decoration:none">
            <div class="kfeig2" aria-label="${esc(p.author)} "><div style="font-weight:650">${esc(p.author)}</div><div style="font-size:12px;color:#66716e">${esc(p.headline)}</div></div>
          </a>
          <p class="kfek4p kfekzz" style="font-size:12px;color:#66716e;margin:0"><span>${p.promoted ? 'Promoted' : esc(p.time)}</span></p>
        </div>
        <button type="button" class="kfeldr" data-mock-act="control" aria-label="Open control menu for post by ${esc(p.author)}" aria-expanded="false">⋯</button>
        <button type="button" class="kfeldr" aria-label="Hide post by ${esc(p.author)}">✕</button>
      </div>
      <p class="kfek4p kfekz3" style="white-space:pre-wrap"><span data-testid="expandable-text-box">${esc(long ? truncate(p.text) : p.text)}</span>${long ? '<button type="button" class="kfemore" data-mock-act="more">… more</button>' : ''}</p>
      ${mediaHtml(p)}
      <div class="kfekyn kfeky4" style="display:flex;justify-content:space-around;position:relative">
        <button type="button" class="kfeldr" data-mock-act="react" aria-label="Reaction button state: no reaction"><span>Like</span></button>
        <button type="button" class="kfeldr" data-mock-act="reactmenu" aria-label="Open reactions menu" aria-expanded="false">▾</button>
        <button type="button" class="kfeldr" data-mock-act="comment" aria-label="Comment"><span>Comment</span></button>
        <button type="button" class="kfeldr" data-mock-act="repost" aria-label="Repost" aria-expanded="false"><span>Repost</span></button>
        <a class="kfeldr" href="https://www.linkedin.com/" aria-label="Send">Send</a>
        ${HIDDEN_PICKER ? `<div role="toolbar" data-mock-menu="${p.id}" data-mock-prerendered hidden style="position:absolute;bottom:44px;left:0;background:#fff;box-shadow:0 6px 24px rgba(0,0,0,.18);border-radius:24px;padding:6px">${REACTIONS.map(([id, l, icon]) => `<button type="button" data-mock-reaction="${id}" aria-label="${l}">${icon}</button>`).join('')}</div>` : ''}
      </div>
      <div class="kfek44" componentkey="replaceableCommentTools${key}" data-mock-box hidden style="display:flex;gap:8px;padding:8px 0">
        <div class="kfeed" contenteditable="true" role="textbox" aria-label="Text editor for creating comment" data-mock-editor style="flex:1;border:1px solid #c9d0cd;border-radius:18px;padding:8px 12px;min-height:38px"></div>
        <button type="button" class="kfesub" data-mock-act="submit" disabled>Comment</button>
      </div>
      <div class="kfecl" data-mock-comments>${p.id === 1 ? `
        <div class="kfecm" data-mock-existing-comment><span style="font-weight:600">Sam Lee</span> <span>Love the digest idea.</span>
          <button type="button" data-mock-act="commentlike" aria-label="React Like to Sam Lee’s comment">Like</button></div>` : ''}</div>
    </div>
  </div>
</div>`;
  }

  const postOf = (el) => el.closest('[data-mock-id]');
  const dataOf = (postEl) => POSTS[Number(postEl.dataset.mockId) - 1];

  function syncReaction(postEl) {
    const s = state.get(Number(postEl.dataset.mockId));
    const btn = postEl.querySelector('[data-mock-act="react"]');
    btn.setAttribute('aria-label', 'Reaction button state: ' + (s.reaction ? label(s.reaction) : 'no reaction'));
    btn.querySelector('span').textContent = s.reaction ? label(s.reaction) : 'Like';
  }

  // LinkedIn wraps its "Recommended for you" follow box in the same update-card shell as posts.
  const recommendedHtml = `
<div role="listitem" class="kfellx kfeuz" componentkey="update-card-focusRECOMMENDEDxyzFeedType_MAIN_FEED_RELEVANCE" data-mock-module="recommended" style="background:#fff;border:1px solid #dde2df;border-radius:10px;margin-bottom:10px;padding:12px 16px">
  <h2 class="kfek4p">Recommended for you</h2>
  ${[['Mira Kapoor', 'Clinical Psychologist'], ['Leo Grant', 'Hiring | Customer Service']].map(([n, h]) => `
  <div class="kfekyn" style="display:flex;gap:10px;align-items:center;padding:8px 0">
    <a href="https://www.linkedin.com/in/${n.toLowerCase().replace(' ', '-')}/"><figure style="margin:0"><img alt="" width="48" height="48" style="border-radius:50%" src="${avatar(n, 40)}"></figure></a>
    <a href="https://www.linkedin.com/in/${n.toLowerCase().replace(' ', '-')}/" style="flex:1;color:inherit;text-decoration:none"><div aria-label="${n} "><div>${n}</div><div style="font-size:12px">${h}</div></div></a>
    <button type="button" aria-label="Follow ${n}">+ Follow</button>
  </div>`).join('')}
  <button type="button">Show more</button>
</div>`;

  function render(count) {
    const slice = POSTS.slice(rendered, rendered + count);
    feed.insertAdjacentHTML('beforeend', slice.map((p) => postHtml(p) + (p.id === 2 ? recommendedHtml : '')).join(''));
    slice.forEach((p) => syncReaction(feed.querySelector(`[data-mock-id="${p.id}"]`)));
    rendered += slice.length;
    feedEnd.hidden = rendered < POSTS.length;
  }

  // Hashed-class feed: one persistent live region whose text changes, not a new toast element.
  const live = document.createElement('div');
  live.className = 'kfetst';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.style.cssText = 'position:fixed;left:24px;bottom:24px;z-index:60;background:#1d2522;color:#fff;border-radius:8px;padding:0 16px;min-height:1px';
  document.body.appendChild(live);
  function toast(msg) {
    live.textContent = msg;
    live.style.padding = '12px 16px';
    setTimeout(() => {
      if (live.textContent === msg) {
        live.textContent = '';
        live.style.padding = '0 16px';
      }
    }, 5000);
  }

  const closeMenus = () =>
    document.querySelectorAll('[data-mock-menu]').forEach((m) => (m.hasAttribute('data-mock-prerendered') ? (m.hidden = true) : m.remove()));

  function menu(anchor, role, items) {
    closeMenus();
    const r = anchor.getBoundingClientRect();
    const m = document.createElement('div');
    m.dataset.mockMenu = postOf(anchor).dataset.mockId;
    m.setAttribute('role', role);
    m.style.cssText = `position:absolute;z-index:20;left:${r.left + scrollX}px;top:${r.bottom + scrollY + 4}px;background:#fff;border-radius:8px;box-shadow:0 8px 28px rgba(0,0,0,.2);padding:6px`;
    m.innerHTML = items;
    document.body.appendChild(m);
  }

  document.addEventListener('click', (e) => {
    const optionBtn = e.target.closest('[data-mock-reaction]');
    if (optionBtn) {
      const postEl = feed.querySelector(`[data-mock-id="${optionBtn.closest('[data-mock-menu]').dataset.mockMenu}"]`);
      state.get(Number(postEl.dataset.mockId)).reaction = optionBtn.dataset.mockReaction;
      setTimeout(() => syncReaction(postEl), 250);
      closeMenus();
      return;
    }
    const item = e.target.closest('[data-mock-item]');
    if (item) {
      const postEl = feed.querySelector(`[data-mock-id="${item.closest('[data-mock-menu]').dataset.mockMenu}"]`);
      const s = state.get(Number(postEl.dataset.mockId));
      closeMenus();
      if (item.dataset.mockItem === 'save') {
        s.saved = !s.saved;
        setTimeout(() => toast(s.saved ? 'Saved. See your saved items' : 'Removed from saved items'), 300);
      }
      if (item.dataset.mockItem === 'repost') setTimeout(() => toast('Repost successful.'), 400);
      return;
    }
    const act = e.target.closest('[data-mock-act]');
    if (!act) {
      if (!e.target.closest('[data-mock-menu]')) closeMenus();
      return;
    }
    const postEl = postOf(act);
    const s = state.get(Number(postEl.dataset.mockId));
    switch (act.dataset.mockAct) {
      case 'react':
        s.reaction = s.reaction ? null : 'like';
        setTimeout(() => syncReaction(postEl), 250);
        break;
      case 'reactmenu':
        if (HIDDEN_PICKER) {
          closeMenus();
          postEl.querySelector('[data-mock-prerendered]').hidden = false;
          break;
        }
        menu(act, 'toolbar', REACTIONS.map(([id, l, icon]) => `<button type="button" data-mock-reaction="${id}" aria-label="${l}" style="font-size:20px">${icon}</button>`).join(''));
        break;
      case 'comment': {
        const box = postEl.querySelector('[data-mock-box]');
        box.hidden = false;
        box.querySelector('[data-mock-editor]').focus();
        break;
      }
      case 'submit': {
        if (act.disabled) return;
        const editor = postEl.querySelector('[data-mock-editor]');
        const text = editor.innerText.trim();
        act.disabled = true;
        // ?dropcomments=1: LinkedIn clears the box but never posts (a silent failure).
        if (new URLSearchParams(location.search).get('dropcomments')) {
          setTimeout(() => (editor.textContent = ''), 500);
          break;
        }
        setTimeout(() => {
          s.comments.push(text);
          const c = document.createElement('div');
          c.className = 'kfecm';
          c.innerHTML = '<span style="font-weight:600">Jordan Avery</span> <span></span>';
          c.lastChild.textContent = text;
          postEl.querySelector('[data-mock-comments]').prepend(c);
          editor.textContent = '';
        }, 500);
        break;
      }
      case 'control':
        menu(act, 'menu', `<div role="menuitem" data-mock-item="save" style="padding:8px">${s.saved ? 'Unsave' : 'Save'}<br><small>Save for later</small></div><div role="menuitem" data-mock-item="copy" style="padding:8px">Copy link to post</div>`);
        break;
      case 'repost':
        menu(act, 'menu', '<div role="menuitem" data-mock-item="thoughts" style="padding:8px">Repost with your thoughts</div><div role="menuitem" data-mock-item="repost" style="padding:8px">Repost<br><small>Instantly bring this post to others’ feeds</small></div>');
        break;
      case 'commentlike':
        s.commentLiked = true;
        break;
      case 'more':
        postEl.querySelector('[data-testid="expandable-text-box"]').textContent = dataOf(postEl).text;
        act.remove();
        break;
    }
  });

  document.addEventListener('input', (e) => {
    const editor = e.target.closest && e.target.closest('[data-mock-editor]');
    if (editor) postOf(editor).querySelector('[data-mock-act="submit"]').disabled = editor.innerText.trim() === '';
  });

  window.addEventListener('scroll', () => {
    if (loading || rendered >= POSTS.length) return;
    if (innerHeight + scrollY < document.documentElement.scrollHeight - 800) return;
    loading = true;
    loader.hidden = false;
    setTimeout(() => {
      render(PAGE);
      loader.hidden = true;
      loading = false;
    }, 700);
  }, { passive: true });

  window.__mockFeed = {
    state: (id) => ({ ...state.get(id), comments: [...state.get(id).comments] }),
    idOfAuthor: (name) => (POSTS.find((p) => p.author === name) || {}).id,
  };

  render(INITIAL);
})();
