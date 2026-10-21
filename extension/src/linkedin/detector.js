// Finds posts on the page and turns each into a plain record the card can render.
(function (root) {
  'use strict';
  const NS = root.SwipeMode;
  const { SEL, TEXT } = NS.selectors;
  const { keyFromUrn, keysFromHref, contentSignature, postUrlFromKey } = NS.ids;
  const { reactionFromLabel } = NS.catalog;
  const dom = NS.dom;

  function findPostElements(scope) {
    const els = dom.qa(scope || document, SEL.post);
    // A reshared post can match the post selectors too; keep only outermost containers.
    return els.filter((el) => !els.some((other) => other !== el && other.contains(el)));
  }

  function hasPosts() {
    return !!dom.q(document, SEL.post);
  }

  // 2026 feed cards carry no URN; componentkey="update-card-[focus]<id>FeedType_…" is the stable id.
  function cardKey(el) {
    const ck = el.getAttribute('componentkey') || '';
    const m = /^update-card-(?:focus)?(.+?)(?:FeedType_.*)?$/.exec(ck);
    return m && m[1] ? 'card:' + m[1] : null;
  }

  function keysOf(el, exclude) {
    const keys = [];
    const push = (k) => k && !keys.includes(k) && keys.push(k);
    push(keyFromUrn(el.getAttribute('data-urn')));
    push(keyFromUrn(el.getAttribute('data-id')));
    push(cardKey(el));
    dom.qaOwn(el, SEL.permalink, exclude).forEach((a) => keysFromHref(a.getAttribute('href')).forEach(push));
    return keys;
  }

  function reactButton(el) {
    return dom.q(dom.q(el, SEL.actionBar) || el, SEL.reactButton);
  }

  function readReaction(btn) {
    if (!btn) return null;
    const state = TEXT.reactionState.exec(btn.getAttribute('aria-label') || '');
    if (state) return /no reaction/i.test(state[1]) ? null : reactionFromLabel(state[1]) || 'like';
    if (btn.getAttribute('aria-pressed') !== 'true') return null;
    return reactionFromLabel(dom.text(btn)) || reactionFromLabel(btn.getAttribute('aria-label')) || 'like';
  }

  function cleanText(s) {
    return s.replace(TEXT.seeMoreTail, '').trim();
  }

  function absUrl(href) {
    try {
      return href ? new URL(href, location.href).href : null;
    } catch (_) {
      return null;
    }
  }

  function moreButton(el, excl) {
    const known = dom.qOwn(el, SEL.seeMore, excl || []);
    if (known) return known;
    const textEl = dom.qOwn(el, SEL.text, excl || []);
    const scope = textEl && textEl.parentElement;
    return scope ? Array.from(scope.querySelectorAll('button')).find((b) => TEXT.moreButton.test(dom.text(b))) || null : null;
  }

  function extract(el) {
    const reshareEl = dom.q(el, SEL.reshare);
    const excl = reshareEl ? [reshareEl] : [];
    const actorEl = dom.qOwn(el, SEL.actor, excl) || el;

    // Hashed-class layouts: the actor link's text is "name \n headline", the post menu's label
    // names the author, and the timestamp is a short <p>.
    const metaLines = (() => {
      const a = dom.qaOwn(el, ['a[href*="/in/"]', 'a[href*="/company/"]'], excl).find((x) => dom.text(x));
      return a ? dom.text(a).split('\n').map((s) => s.trim()).filter(Boolean) : [];
    })();
    const menuMatch = TEXT.menuAuthor.exec((dom.qOwn(el, SEL.controlMenuTrigger, excl) || { getAttribute: () => '' }).getAttribute('aria-label') || '');
    const name = dom.firstLine(dom.q(actorEl, SEL.actorName)) || (menuMatch && menuMatch[1]) || metaLines[0] || '';
    const headline = dom.firstLine(dom.q(actorEl, SEL.actorHeadline)) || metaLines[1] || '';
    const time =
      dom.firstLine(dom.q(actorEl, SEL.actorTime)) ||
      dom.qaOwn(el, ['p', 'span'], excl).map((p) => dom.text(p)).find((t) => t.length < 30 && TEXT.timeStamp.test(t)) ||
      '';
    const linkEl = dom.q(actorEl, SEL.actorLink);
    const avatarEl = dom.q(actorEl, SEL.actorAvatar);
    const textEl = dom.qOwn(el, SEL.text, excl);
    const text = cleanText(dom.text(textEl));

    const images = [];
    let imgEls = dom.qaOwn(el, SEL.images, excl);
    if (!imgEls.length) {
      // No image classes: take content-sized images only (avatars and logos are small).
      imgEls = dom.qaOwn(el, ['img'], excl).filter((img) => img.getBoundingClientRect().width >= 200);
    }
    imgEls.forEach((img) => {
      const src = img.currentSrc || img.src;
      if (src && !images.includes(src) && images.length < 6) images.push(src);
    });

    const videoEl = dom.qOwn(el, SEL.video, excl);
    const posterEl = videoEl && (videoEl.tagName === 'VIDEO' ? videoEl : videoEl.querySelector('video'));
    const articleEl = dom.qOwn(el, SEL.article, excl);
    const pollEl = dom.qOwn(el, SEL.poll, excl);

    if (!name && !text && !images.length && !videoEl && !articleEl) return null; // ERR-001: unparseable

    const btn = reactButton(el);
    const commentBtn = dom.q(dom.q(el, SEL.actionBar) || el, SEL.commentButton);
    // Feed modules ("Recommended for you", follow suggestions) share the post shell but have no
    // social actions. Something you can't react to or comment on isn't a post to process.
    if (!btn && !commentBtn) return null;

    let keys = keysOf(el, excl);
    if (!keys.length) keys = [contentSignature(name, time, text)];

    return {
      el,
      keys,
      url: postUrlFromKey(keys[0]) || absUrl((dom.qOwn(el, SEL.permalink, excl) || {}).href),
      author: {
        name,
        headline,
        time,
        profileUrl: absUrl(linkEl && linkEl.getAttribute('href')),
        avatarUrl: avatarEl ? avatarEl.currentSrc || avatarEl.src : null,
      },
      header: dom.firstLine(dom.qOwn(el, SEL.header, excl)),
      text,
      truncated: !!moreButton(el, excl),
      images,
      video: videoEl ? { poster: (posterEl && posterEl.getAttribute('poster')) || null } : null,
      document: !!dom.qOwn(el, SEL.document, excl),
      poll: pollEl ? { text: dom.text(pollEl) } : null,
      article: articleEl
        ? {
            title: dom.firstLine(dom.q(articleEl, SEL.articleTitle)),
            subtitle: dom.firstLine(dom.q(articleEl, SEL.articleSubtitle)),
            url: absUrl((dom.q(articleEl, SEL.articleLink) || {}).href),
            image: ((articleEl.querySelector('img') || {}).src) || null,
          }
        : null,
      reshare: reshareEl
        ? { author: dom.firstLine(dom.q(reshareEl, SEL.actorName)), text: cleanText(dom.text(dom.q(reshareEl, SEL.text))) }
        : null,
      promoted: TEXT.promoted.test(time) || TEXT.promoted.test(headline),
      reacted: readReaction(btn),
      available: {
        react: !!btn,
        comment: !!commentBtn,
        repost: !!dom.q(dom.q(el, SEL.actionBar) || el, SEL.repostButton),
        save: !!dom.qOwn(el, SEL.controlMenuTrigger, excl),
        open: !!postUrlFromKey(keys[0]),
        profile: !!linkEl,
      },
    };
  }

  // New records for post elements not seen before, in document order.
  function scan(seenEls) {
    const out = [];
    for (const el of findPostElements(document)) {
      if (seenEls.has(el)) continue;
      seenEls.add(el);
      const rec = extract(el);
      if (rec) out.push(rec);
    }
    return out;
  }

  // Re-locates a record's element (LinkedIn may re-render or unmount posts).
  function resolve(rec) {
    if (rec.el && rec.el.isConnected) return rec.el;
    const el = findPostElements(document).find((e) => keysOf(e, []).some((k) => rec.keys.includes(k)));
    if (el) rec.el = el;
    return el || null;
  }

  // Async form of resolve, shared with sites that unmount off-screen posts (X).
  async function locate(rec) {
    return resolve(rec);
  }

  // Fresh data for a record (reaction state, expanded text) without changing its identity.
  function refresh(rec) {
    const el = resolve(rec);
    if (!el) return rec;
    const fresh = extract(el);
    if (fresh) Object.assign(rec, fresh, { keys: rec.keys, url: rec.url || fresh.url });
    return rec;
  }

  async function expandText(rec) {
    const el = resolve(rec);
    const btn = el && moreButton(el);
    if (!btn) return rec;
    const before = rec.text;
    dom.click(btn);
    await dom.waitFor(() => cleanText(dom.text(dom.q(el, SEL.text))) !== before, { timeout: 1200 });
    return refresh(rec);
  }

  function diagnostics() {
    const posts = findPostElements(document);
    const recs = posts.map(extract).filter(Boolean);
    return {
      url: location.href,
      postsFound: posts.length,
      parsed: recs.length,
      withId: recs.filter((r) => !r.keys[0].startsWith('sig:')).length,
      withAuthor: recs.filter((r) => r.author.name).length,
      withText: recs.filter((r) => r.text).length,
      reactButtons: recs.filter((r) => r.available.react).length,
      commentButtons: recs.filter((r) => r.available.comment).length,
      repostButtons: recs.filter((r) => r.available.repost).length,
      menuTriggers: recs.filter((r) => r.available.save).length,
      promoted: recs.filter((r) => r.promoted).length,
      sample: recs.slice(0, 3).map((r) => ({ key: r.keys[0], author: r.author.name, text: r.text.slice(0, 80) })),
    };
  }

  // Structure of one post for fixing selectors: tags, classes, data attributes and button labels.
  // No post text (only lengths); names in labels become NAME and profile links become /in/*.
  function layoutProbe() {
    const hits = SEL.post.map((s) => [s, document.querySelectorAll(s).length]);
    const commentBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      /comment/i.test(b.getAttribute('aria-label') || b.textContent || '')
    );
    const post =
      SEL.post.map((s) => document.querySelector(s)).find(Boolean) ||
      (commentBtn && commentBtn.closest('[data-view-name],[data-urn],[data-id],article,[role="listitem"]'));
    const anon = (v) => v.replace(/\/(in|company)\/[^/?#]+/g, '/$1/*').slice(0, 120);
    let n = 0;
    const node = (el, d) => {
      if (++n > 450) return '...';
      const a = {};
      for (const at of el.attributes) {
        if (/^(data-|role$|aria-|componentkey$|href$|dir$|type$)/.test(at.name)) {
          a[at.name] =
            at.name === 'aria-label' ? at.value.replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, 'NAME').slice(0, 80) : anon(at.value);
        }
      }
      const cls = typeof el.className === 'string' ? el.className.split(/\s+/).filter(Boolean).slice(0, 4).join('.') : '';
      const kids = Array.from(el.children);
      return {
        t: el.tagName.toLowerCase() + (cls ? '.' + cls : ''),
        a: Object.keys(a).length ? a : undefined,
        len: kids.length ? undefined : (el.textContent || '').trim().length || undefined,
        k: kids.length ? (d < 14 ? kids.slice(0, 15).map((c) => node(c, d + 1)) : kids.length + ' children') : undefined,
      };
    };
    return {
      path: location.pathname,
      hits,
      commentLabel: commentBtn ? commentBtn.getAttribute('aria-label') : null,
      post: post ? node(post, 0) : 'none',
    };
  }

  NS.detector = { findPostElements, hasPosts, extract, scan, resolve, locate, refresh, expandText, readReaction, reactButton, diagnostics, layoutProbe };
})(globalThis);
