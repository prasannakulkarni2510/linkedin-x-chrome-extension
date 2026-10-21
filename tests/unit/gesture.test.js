const test = require('node:test');
const assert = require('node:assert/strict');
const { createWheelGesture, classifyDrag } = require('../../extension/src/core/gesture.js');

// Feeds a stream of wheel events spaced `step` ms apart and returns every non-null decision.
function feedStream(g, { dx = 0, dy = 0, from = 0, count = 10, step = 16 }) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const r = g.feed({ dx, dy, t: from + i * step });
    if (r) out.push(r);
  }
  return out;
}

test('vertical wheel scrolling never triggers a decision', () => {
  const g = createWheelGesture();
  assert.deepEqual(feedStream(g, { dy: 30, count: 40 }), []);
});

test('positive deltaX past the threshold triggers left (skip)', () => {
  const g = createWheelGesture({ threshold: 120 });
  assert.equal(g.feed({ dx: 40, dy: 0, t: 0 }), null);
  assert.equal(g.feed({ dx: 40, dy: 0, t: 16 }), null);
  assert.equal(g.feed({ dx: 40, dy: 0, t: 32 }), 'left');
});

test('negative deltaX past the threshold triggers right (engage)', () => {
  const g = createWheelGesture({ threshold: 120 });
  assert.deepEqual(feedStream(g, { dx: -40, count: 3 }), ['right']);
});

test('momentum tail after a decision does not trigger again', () => {
  const g = createWheelGesture({ threshold: 120 });
  assert.deepEqual(feedStream(g, { dx: 40, count: 80 }), ['left']);
});

test('a new gesture after an idle gap can trigger again', () => {
  const g = createWheelGesture({ threshold: 120, idleResetMs: 180 });
  feedStream(g, { dx: 40, count: 20 });
  assert.deepEqual(feedStream(g, { dx: 40, from: 20 * 16 + 400, count: 3 }), ['left']);
});

test('small horizontal movement resets after an idle gap', () => {
  const g = createWheelGesture({ threshold: 120, idleResetMs: 180 });
  feedStream(g, { dx: 40, count: 2 });
  assert.deepEqual(feedStream(g, { dx: 40, from: 600, count: 2 }), []);
});

test('mostly vertical gesture with slight sideways drift stays vertical', () => {
  const g = createWheelGesture({ threshold: 120 });
  assert.deepEqual(feedStream(g, { dx: 12, dy: 40, count: 30 }), []);
});

test('isHorizontal reports a locked horizontal gesture', () => {
  const g = createWheelGesture();
  g.feed({ dx: 20, dy: 0, t: 0 });
  assert.equal(g.isHorizontal(), true);
  const v = createWheelGesture();
  v.feed({ dx: 0, dy: 20, t: 0 });
  assert.equal(v.isHorizontal(), false);
});

test('classifyDrag commits left when dragged past a quarter of the width', () => {
  assert.equal(classifyDrag({ dx: -160, dy: 10, width: 600, velocity: 0.1 }), 'left');
});

test('classifyDrag commits right on a fast short flick', () => {
  assert.equal(classifyDrag({ dx: 60, dy: 5, width: 600, velocity: 0.9 }), 'right');
});

test('classifyDrag ignores mostly vertical drags', () => {
  assert.equal(classifyDrag({ dx: -200, dy: 300, width: 600, velocity: 1 }), null);
});

test('classifyDrag ignores short slow drags', () => {
  assert.equal(classifyDrag({ dx: 80, dy: 0, width: 600, velocity: 0.2 }), null);
});
