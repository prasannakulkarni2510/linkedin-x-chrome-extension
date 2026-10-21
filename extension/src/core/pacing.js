// Pacing guard for actions that change things on LinkedIn: a minimum gap between actions
// plus a cap per rolling window, so keyboard speed never looks like a bot.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.SwipeMode = root.SwipeMode || {}).pacing = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function createPacer(opts) {
    const o = opts || {};
    const enabled = o.enabled !== false;
    const minGapMs = o.minGapMs != null ? o.minGapMs : 1500;
    const windowMs = o.windowMs != null ? o.windowMs : 600000;
    const maxInWindow = o.maxInWindow != null ? o.maxInWindow : 30;
    let times = [];

    function check(t) {
      if (!enabled) return { ok: true };
      times = times.filter((x) => t - x < windowMs);
      const last = times[times.length - 1];
      if (last !== undefined && t - last < minGapMs) return { ok: false, reason: 'gap', waitMs: minGapMs - (t - last) };
      if (times.length >= maxInWindow) return { ok: false, reason: 'cap', waitMs: windowMs - (t - times[0]) };
      return { ok: true };
    }

    function record(t) {
      times.push(t);
    }

    return { check, record };
  }

  return { createPacer };
});
