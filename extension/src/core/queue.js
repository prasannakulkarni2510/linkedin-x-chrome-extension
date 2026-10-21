// Session queue: discovery-order posts, session-wide dedupe, skip/undo, per-post status.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.SwipeMode = root.SwipeMode || {}).queue = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function createSession(opts) {
    const undoLimit = (opts && opts.undoLimit) || 20;
    const seen = new Set();
    const status = new Map();
    const order = [];
    const undoStack = [];
    let processed = 0;

    const primary = (r) => r.keys[0];

    function add(records) {
      let added = 0;
      for (const r of records || []) {
        if (!r || !Array.isArray(r.keys) || r.keys.length === 0) continue;
        if (r.keys.some((k) => seen.has(k))) continue;
        r.keys.forEach((k) => seen.add(k));
        status.set(primary(r), 'queued');
        order.push(r);
        added++;
      }
      return added;
    }

    function current() {
      return order[0] || null;
    }

    function advance(st) {
      const r = order.shift();
      if (!r) return null;
      status.set(primary(r), st);
      processed++;
      return current();
    }

    // A post the user already engaged with (or that failed) keeps that status when left behind,
    // and only plain skips can be undone.
    function skip() {
      const r = current();
      if (!r) return null;
      const st = status.get(primary(r));
      if (st === 'engaged' || st === 'failed') return advance(st);
      undoStack.push(r);
      if (undoStack.length > undoLimit) undoStack.shift();
      return advance('skipped');
    }

    function complete() {
      return advance('engaged');
    }

    function markCurrent(st) {
      const r = current();
      if (r) status.set(primary(r), st);
    }

    function undo() {
      const r = undoStack.pop();
      if (!r) return null;
      status.set(primary(r), 'queued');
      order.unshift(r);
      processed--;
      return r;
    }

    function remaining() {
      return Math.max(0, order.length - 1);
    }

    function isLow(threshold) {
      return remaining() <= threshold;
    }

    function position() {
      return processed + 1;
    }

    function statusOf(r) {
      return (r && r.keys && status.get(primary(r))) || null;
    }

    function has(key) {
      return seen.has(key);
    }

    function stats() {
      const out = { seen: status.size, queued: 0, skipped: 0, engaged: 0, failed: 0 };
      for (const st of status.values()) if (st in out) out[st]++;
      return out;
    }

    return { add, current, skip, complete, markCurrent, undo, remaining, isLow, position, statusOf, has, stats };
  }

  return { createSession };
});
