// Finds posts on X and turns each into the same plain record the card renders for LinkedIn.
// X's timeline is virtualized: posts far above or below the viewport are removed from the DOM
// and rebuilt as new elements when you scroll back, so records carry their page position.
(function (root) {
  'use strict';
  const NS = root.SwipeMode;
  const { SEL, TEXT } = NS.selectors;
  const { contentSignature, xStatusFromHref } = NS.ids;
  const dom = NS.dom;

  function findPostElements(scope) {
    return dom.qa(scope || document, SEL.post);
  }

  function hasPosts() {
    return !!dom.q(document, SEL.post);
  }

  // A quoted post sits inside the article with its own author line. The post's own author line
  // must stay outside it, which rules out any wrapper that holds the whole post.
  function quoteOf(el) {
    const own = dom.q(el, SEL.userName);
    return dom.qa(el, SEL.quote).find((q) => !q.contains(own)) || null;
  }

  function statusOf(el, excl) {
    const time = dom.qOwn(el, SEL.time, excl);
    const a = (time && time.closest('a[href*="/status/"]')) || dom.qOwn(el, SEL.permalink, excl);
    return a ? xStatusFromHref(a.getAttribute('href')) : null;
  }

  function keysOf(el) {
    const q = quoteOf(el);
    const st = statusOf(el, q ? [q] : []);
    return st ? [st.key] : [];
  }

  const bar = (el) => dom.q(el, SEL.actionBar) || el;
  const has = (el, sel) => !!dom.q(bar(el), sel);

  function readReaction(el) {
    return el && has(el, SEL.unlike) ? 'like' : null;
  }

  function absUrl(href) {
    try {
      return href ? new URL(href, 'https://x.com').href : null;
    } catch (_) {
      return null;
    }
  }

  const lines = (el) => dom.text(el).split('\n').map((s) => s.trim()).filter(Boolean);
  const DOMAIN = /^(from )?[\w-]+(\.[\w-]+)+$/i;

  function extract(el) {
    const quoteEl = quoteOf(el);
    const excl = quoteEl ? [quoteEl] : [];
    const userLines = lines(dom.qOwn(el, SEL.userName, excl));
    const name = userLines[0] || '';
    const handle = userLines.find((l) => /^@\w{1,15}$/.test(l)) || '';
    const time = dom.text(dom.qOwn(el, SEL.time, excl));
    const textEl = dom.qOwn(el, SEL.text, excl);
    const text = dom.text(textEl);

    const images = [];
    dom.qaOwn(el, SEL.images, excl).forEach((img) => {
      const src = img.currentSrc || img.src;
      if (src && !images.includes(src) && images.length < 4) images.push(src);
    });
    const videoEl = dom.qOwn(el, SEL.video, excl);
    const posterEl = videoEl && (videoEl.tagName === 'VIDEO' ? videoEl : videoEl.querySelector('video'));
    const pollEl = dom.qOwn(el, SEL.poll, excl);
    const cardEl = dom.qOwn(el, SEL.card, excl);

    if (!name && !text && !images.length && !videoEl) return null; // ERR-001: unparseable

    const b = bar(el);
    const canLike = !!(dom.q(b, SEL.like) || dom.q(b, SEL.unlike));
    const canReply = !!dom.q(b, SEL.reply);
    // Who-to-follow modules and other timeline cells have no social bar: not posts.
    if (!canLike && !canReply) return null;

    const status = statusOf(el, excl);
    const keys = status ? [status.key] : [contentSignature(name + ' ' + handle, time, text)];
    const linkEl = dom.qOwn(el, SEL.userLink, excl);
    const avatarEl = dom.qOwn(el, SEL.avatar, excl);
    const promoted = dom
      .qaOwn(el, ['span'], excl.concat(textEl ? [textEl] : []))
      .some((s) => s.childElementCount === 0 && TEXT.promoted.test(dom.text(s)));

    let article = null;
    if (cardEl) {
      const cl = lines(cardEl);
      const domain = cl.find((l) => DOMAIN.test(l));
      article = {
        title: cl.find((l) => l !== domain) || domain || '',
        subtitle: domain ? domain.replace(/^from /i, '') : '',
        url: absUrl((cardEl.querySelector('a[href]') || { getAttribute: () => null }).getAttribute('href')),
        image: (cardEl.querySelector('img') || {}).src || null,
      };
    }

    return {
      el,
      keys,
      pageY: el.getBoundingClientRect().top + window.scrollY,
      url: status ? status.url : null,
      author: {
        name,
        headline: handle,
        time,
        profileUrl: absUrl(linkEl && linkEl.getAttribute('href')),
        avatarUrl: avatarEl ? avatarEl.currentSrc || avatarEl.src : null,
      },
      header: dom.firstLine(dom.qOwn(el, SEL.header, excl)),
      text,
      truncated: false, // X's "Show more" navigates to the post page; never click it
      continues: !!dom.qOwn(el, SEL.showMore, excl),
      images,
      video: videoEl ? { poster: (posterEl && posterEl.getAttribute('poster')) || null } : null,
      document: false,
      poll: pollEl ? { text: dom.text(pollEl) } : null,
      article,
      reshare: quoteEl ? { author: dom.firstLine(dom.q(quoteEl, SEL.userName)), text: dom.text(dom.q(quoteEl, SEL.text)) } : null,
      promoted,
      reacted: readReaction(el),
      reposted: has(el, SEL.unretweet),
      bookmarked: has(el, SEL.removeBookmark),
      available: {
        react: canLike,
        comment: canReply,
        repost: !!(dom.q(b, SEL.retweet) || dom.q(b, SEL.unretweet)),
        save: !!(dom.q(b, SEL.bookmark) || dom.q(b, SEL.removeBookmark)),
        open: !!status,
        profile: !!linkEl,
      },
    };
  }

  // New records for post elements not seen before, in document order. X rebuilds posts as new
  // elements; the session queue dedupes them by key.
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

  function resolve(rec) {
    if (rec.el && rec.el.isConnected) return rec.el;
    const el = findPostElements(document).find((e) => keysOf(e).some((k) => rec.keys.includes(k)));
    if (el) rec.el = el;
    return el || null;
  }

  // X unmounts posts far from the viewport. Scroll back to where the post was (and a little
  // around it, in case posts above it changed height) until X mounts it again.
  async function locate(rec) {
    if (resolve(rec)) return rec.el;
    if (rec.pageY == null) return null;
    const step = window.innerHeight * 0.8;
    for (const k of [0, -1, 1, -2, 2]) {
      window.scrollTo({ top: Math.max(0, rec.pageY - 120 + k * step), behavior: 'instant' });
      const el = await dom.waitFor(() => resolve(rec), { timeout: 900, interval: 60 });
      if (el) return el;
    }
    return null;
  }

  function refresh(rec) {
    const el = resolve(rec);
    if (!el) return rec;
    const fresh = extract(el);
    if (fresh) Object.assign(rec, fresh, { keys: rec.keys, url: rec.url || fresh.url });
    return rec;
  }

  async function expandText(rec) {
    return rec;
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
      likeButtons: recs.filter((r) => r.available.react).length,
      replyButtons: recs.filter((r) => r.available.comment).length,
      repostButtons: recs.filter((r) => r.available.repost).length,
      bookmarkButtons: recs.filter((r) => r.available.save).length,
      promoted: recs.filter((r) => r.promoted).length,
      sample: recs.slice(0, 3).map((r) => ({ key: r.keys[0], author: r.author.name, text: r.text.slice(0, 80) })),
    };
  }

  // Structure of one post for fixing selectors: tags, data-testids, roles and labels.
  // No post text (only lengths); handles become @user and profile links become /user.
  function layoutProbe() {
    const hits = SEL.post.map((s) => [s, document.querySelectorAll(s).length]);
    const post = SEL.post.map((s) => document.querySelector(s)).find(Boolean) || document.querySelector('[data-testid="cellInnerDiv"]');
    const anon = (v) => v.replace(/@\w{1,15}/g, '@user').replace(/^\/\w{1,15}(?=\/|$)/, '/user').slice(0, 120);
    let n = 0;
    const node = (el, d) => {
      if (++n > 450) return '...';
      const a = {};
      for (const at of el.attributes) {
        if (/^(data-testid$|role$|aria-|href$|dir$|type$|contenteditable$)/.test(at.name)) a[at.name] = anon(at.value);
      }
      const kids = Array.from(el.children);
      return {
        t: el.tagName.toLowerCase(),
        a: Object.keys(a).length ? a : undefined,
        len: kids.length ? undefined : (el.textContent || '').trim().length || undefined,
        k: kids.length ? (d < 16 ? kids.slice(0, 15).map((c) => node(c, d + 1)) : kids.length + ' children') : undefined,
      };
    };
    return { path: anon(location.pathname), hits, post: post ? node(post, 0) : 'none' };
  }

  NS.detector = { findPostElements, hasPosts, extract, scan, resolve, locate, refresh, expandText, readReaction, diagnostics, layoutProbe };
})(globalThis);
