// User settings: defaults plus validation of whatever comes back from chrome.storage.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.SwipeMode = root.SwipeMode || {}).settings = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SPEC = {
    graceMs: { type: 'number', def: 1500, min: 0, max: 5000 },
    postGapMs: { type: 'number', def: 450, min: 0, max: 1500 },
    excludePromoted: { type: 'boolean', def: true },
    showLauncher: { type: 'boolean', def: true },
    pacingEnabled: { type: 'boolean', def: true },
    minGapMs: { type: 'number', def: 1500, min: 0, max: 10000 },
    maxPerTenMinutes: { type: 'number', def: 30, min: 1, max: 200 },
    lowWater: { type: 'number', def: 3, min: 1, max: 10 },
    refillTarget: { type: 'number', def: 8, min: 2, max: 20 },
  };

  const DEFAULT_SETTINGS = Object.freeze(
    Object.fromEntries(Object.entries(SPEC).map(([k, s]) => [k, s.def]))
  );

  function normalizeSettings(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const out = {};
    for (const [k, s] of Object.entries(SPEC)) {
      const v = src[k];
      if (s.type === 'number') {
        out[k] = typeof v === 'number' && Number.isFinite(v) ? Math.min(s.max, Math.max(s.min, v)) : s.def;
      } else {
        out[k] = typeof v === 'boolean' ? v : s.def;
      }
    }
    return out;
  }

  return { DEFAULT_SETTINGS, normalizeSettings, SPEC };
});
