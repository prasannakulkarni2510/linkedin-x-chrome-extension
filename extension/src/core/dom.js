// Small DOM helpers shared by the detector and the action layer.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.SwipeMode = root.SwipeMode || {}).dom = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function safeAll(root, sel) {
    try {
      return Array.from(root.querySelectorAll(sel));
    } catch (_) {
      return [];
    }
  }

  // First element matching the first selector that matches anything.
  function q(root, sels) {
    if (!root) return null;
    for (const s of sels) {
      const el = safeAll(root, s)[0];
      if (el) return el;
    }
    return null;
  }

  // Every element matching any selector, deduped, in document order.
  function qa(root, sels) {
    if (!root) return [];
    const set = new Set();
    for (const s of sels) safeAll(root, s).forEach((el) => set.add(el));
    return Array.from(set).sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  }

  const outside = (el, exclude) => !exclude.some((x) => x && x.contains(el));

  // Like q/qa but ignoring anything inside `exclude` containers (e.g. a reshared post).
  function qOwn(root, sels, exclude) {
    if (!root) return null;
    for (const s of sels) {
      const el = safeAll(root, s).find((e) => outside(e, exclude || []));
      if (el) return el;
    }
    return null;
  }

  function qaOwn(root, sels, exclude) {
    return qa(root, sels).filter((e) => outside(e, exclude || []));
  }

  function visible(el) {
    if (!el || !el.isConnected || !el.getClientRects().length) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none';
  }

  function text(el) {
    return el ? (el.innerText || el.textContent || '').trim() : '';
  }

  function firstLine(el) {
    return text(el).split('\n')[0].trim();
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Polls fn until it returns something truthy; resolves to that value, or null on timeout.
  async function waitFor(fn, opts) {
    const timeout = (opts && opts.timeout) || 3000;
    const interval = (opts && opts.interval) || 50;
    const end = Date.now() + timeout;
    for (;;) {
      let v = null;
      try {
        v = fn();
      } catch (_) {
        v = null;
      }
      if (v) return v;
      if (Date.now() >= end) return null;
      await sleep(interval);
    }
  }

  function center(el) {
    const r = el.getBoundingClientRect();
    return { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
  }

  function fire(el, Ctor, type, extra) {
    el.dispatchEvent(new Ctor(type, Object.assign({ bubbles: true, cancelable: true, composed: true }, center(el), extra || {})));
  }

  function hover(el) {
    fire(el, PointerEvent, 'pointerover');
    fire(el, PointerEvent, 'pointerenter', { bubbles: false });
    fire(el, MouseEvent, 'mouseover');
    fire(el, MouseEvent, 'mouseenter', { bubbles: false });
    fire(el, MouseEvent, 'mousemove');
  }

  function unhover(el) {
    if (!el || !el.isConnected) return;
    fire(el, PointerEvent, 'pointerout');
    fire(el, PointerEvent, 'pointerleave', { bubbles: false });
    fire(el, MouseEvent, 'mouseout');
    fire(el, MouseEvent, 'mouseleave', { bubbles: false });
  }

  function click(el) {
    fire(el, PointerEvent, 'pointerdown', { button: 0 });
    fire(el, MouseEvent, 'mousedown', { button: 0 });
    fire(el, PointerEvent, 'pointerup', { button: 0 });
    fire(el, MouseEvent, 'mouseup', { button: 0 });
    el.click();
  }

  function pressEscape(target) {
    (target || document).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }));
  }

  return { q, qa, qOwn, qaOwn, visible, text, firstLine, sleep, waitFor, hover, unhover, click, pressEscape };
});
