// Swipe recognition. Wheel: trackpad two-finger swipes, one physical swipe = one decision.
// Drag: mouse/touch drags of the card. 'left' = skip, 'right' = engage.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.SwipeMode = root.SwipeMode || {}).gesture = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function createWheelGesture(opts) {
    const o = opts || {};
    const threshold = o.threshold != null ? o.threshold : 120;
    const lockAfter = o.lockAfter != null ? o.lockAfter : 12;
    const idleResetMs = o.idleResetMs != null ? o.idleResetMs : 180;
    const cooldownMs = o.cooldownMs != null ? o.cooldownMs : 450;

    let ax = 0;
    let ay = 0;
    let axis = null;
    let lastT = -Infinity;
    let suppressed = false;
    let cooldownUntil = -Infinity;

    // Fingers moving left scroll content right, so positive deltaX means a left swipe.
    function feed(e) {
      const t = e.t;
      if (t - lastT > idleResetMs) {
        ax = 0;
        ay = 0;
        axis = null;
        if (t >= cooldownUntil) suppressed = false;
      }
      lastT = t;
      if (suppressed) return null;
      ax += e.dx || 0;
      ay += e.dy || 0;
      if (!axis && Math.abs(ax) + Math.abs(ay) >= lockAfter) axis = Math.abs(ax) > Math.abs(ay) ? 'x' : 'y';
      if (axis === 'x' && Math.abs(ax) >= threshold) {
        const dir = ax > 0 ? 'left' : 'right';
        // Swallow the momentum tail until the trackpad goes quiet.
        suppressed = true;
        cooldownUntil = t + cooldownMs;
        ax = 0;
        ay = 0;
        return dir;
      }
      return null;
    }

    function isHorizontal() {
      return axis === 'x';
    }

    return { feed, isHorizontal };
  }

  function classifyDrag(d) {
    const adx = Math.abs(d.dx);
    if (adx < Math.abs(d.dy) * 1.2) return null;
    const far = adx >= d.width * 0.25;
    const flick = Math.abs(d.velocity || 0) >= 0.6 && adx >= 40;
    if (!far && !flick) return null;
    return d.dx < 0 ? 'left' : 'right';
  }

  return { createWheelGesture, classifyDrag };
});
