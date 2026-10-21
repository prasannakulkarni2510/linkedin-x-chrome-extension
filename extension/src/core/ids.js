// Post identity: normalizes LinkedIn URNs, X status links and permalinks into dedupe keys.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.SwipeMode = root.SwipeMode || {}).ids = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const URN_RE = /urn:li:(activity|ugcPost|share):(\d+)/;
  const SLUG_RE = /\/posts\/[^?#]*?activity-(\d+)/;
  const KEY_RE = /^(activity|ugcPost|share):(\d+)$/;
  // X: /<handle>/status/<id>, optionally followed by /photo/1, /analytics and so on.
  const X_STATUS_RE = /^\/([A-Za-z0-9_]{1,15})\/status\/(\d{1,25})(?:[/?#]|$)/;
  const X_KEY_RE = /^x:(\d{1,25})$/;
  const X_RESERVED = ['i', 'home', 'explore', 'search', 'settings', 'compose', 'messages', 'notifications'];

  function keyFromUrn(urn) {
    if (typeof urn !== 'string') return null;
    const m = URN_RE.exec(urn);
    return m ? m[1] + ':' + m[2] : null;
  }

  function keysFromHref(href) {
    if (typeof href !== 'string' || !href) return [];
    let decoded = href;
    try {
      decoded = decodeURIComponent(href);
    } catch (_) {
      // Malformed escapes: match against the raw string.
    }
    const key = keyFromUrn(decoded);
    if (key) return [key];
    const m = SLUG_RE.exec(decoded);
    return m ? ['activity:' + m[1]] : [];
  }

  function normalize(s) {
    return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  // Last-resort key for posts without a URN. Includes author and timestamp so identical
  // greeting posts from different people never collapse into one.
  function contentSignature(author, time, text) {
    const s = normalize(author) + '|' + normalize(time) + '|' + normalize(text).slice(0, 400);
    let h1 = 5381;
    let h2 = 52711;
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      h1 = (h1 * 33) ^ c;
      h2 = (h2 * 33) ^ c;
    }
    return 'sig:' + (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36);
  }

  // Parses an X status link (relative or absolute) into { key, id, handle, url }, or null.
  function xStatusFromHref(href) {
    if (typeof href !== 'string' || !href) return null;
    let u;
    try {
      u = new URL(href, 'https://x.com');
    } catch (_) {
      return null;
    }
    if (!/^(www\.|mobile\.)?(x|twitter)\.com$/.test(u.hostname)) return null;
    const m = X_STATUS_RE.exec(u.pathname);
    if (!m || X_RESERVED.includes(m[1].toLowerCase())) return null;
    return { key: 'x:' + m[2], id: m[2], handle: m[1], url: 'https://x.com/' + m[1] + '/status/' + m[2] };
  }

  function postUrlFromKey(key) {
    const x = X_KEY_RE.exec(key || '');
    if (x) return 'https://x.com/i/status/' + x[1];
    const m = KEY_RE.exec(key || '');
    return m ? 'https://www.linkedin.com/feed/update/urn:li:' + m[1] + ':' + m[2] + '/' : null;
  }

  return { keyFromUrn, keysFromHref, contentSignature, postUrlFromKey, xStatusFromHref };
});
