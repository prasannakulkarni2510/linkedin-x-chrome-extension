// Paste into the DevTools console on https://www.linkedin.com/feed/ .
// Copies the layout of one post (tags, classes, data attributes, button labels) to the clipboard.
// No post text is copied, only text lengths; names in labels become NAME, profile links become /in/*.
(() => {
  const S = [
    'div.feed-shared-update-v2[data-urn]',
    'div[data-urn^="urn:li:activity:"]',
    'div[data-urn^="urn:li:ugcPost:"]',
    'div[data-urn^="urn:li:share:"]',
    'div[data-id^="urn:li:activity:"]',
    'div[data-view-name="feed-full-update"]',
  ];
  const hits = S.map((s) => [s, document.querySelectorAll(s).length]);
  const commentBtn = [...document.querySelectorAll('button')].find((b) =>
    /comment/i.test(b.getAttribute('aria-label') || b.textContent || '')
  );
  const post =
    S.map((s) => document.querySelector(s)).find(Boolean) ||
    (commentBtn && commentBtn.closest('[data-view-name],[data-urn],[data-id],article,[role="listitem"]'));
  const anon = (v) => v.replace(/\/(in|company)\/[^/?#]+/g, '/$1/*').slice(0, 120);
  let n = 0;
  const node = (el, d) => {
    if (++n > 450) return '...';
    const a = {};
    for (const at of el.attributes) {
      if (/^(data-|role$|aria-|componentkey$|href$|dir$|type$)/.test(at.name)) {
        a[at.name] =
          at.name === 'aria-label'
            ? at.value.replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, 'NAME').slice(0, 80)
            : anon(at.value);
      }
    }
    const cls = typeof el.className === 'string' ? el.className.split(/\s+/).filter(Boolean).slice(0, 4).join('.') : '';
    const kids = [...el.children];
    return {
      t: el.tagName.toLowerCase() + (cls ? '.' + cls : ''),
      a: Object.keys(a).length ? a : undefined,
      len: kids.length ? undefined : (el.textContent || '').trim().length || undefined,
      k: kids.length ? (d < 14 ? kids.slice(0, 15).map((c) => node(c, d + 1)) : kids.length + ' children') : undefined,
    };
  };
  copy(
    JSON.stringify({
      path: location.pathname,
      hits,
      commentLabel: commentBtn && commentBtn.getAttribute('aria-label'),
      post: post ? node(post, 0) : 'none',
    })
  );
  return 'Copied. Paste it back to Claude.';
})();
