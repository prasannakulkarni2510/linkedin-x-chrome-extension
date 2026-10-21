const test = require('node:test');
const assert = require('node:assert/strict');
const { createPacer } = require('../../extension/src/core/pacing.js');

test('allows the first action', () => {
  assert.deepEqual(createPacer().check(0), { ok: true });
});

test('blocks an action inside the minimum gap and reports the wait', () => {
  const p = createPacer({ minGapMs: 1500 });
  p.record(0);
  assert.deepEqual(p.check(1000), { ok: false, reason: 'gap', waitMs: 500 });
});

test('allows an action after the minimum gap', () => {
  const p = createPacer({ minGapMs: 1500 });
  p.record(0);
  assert.deepEqual(p.check(1500), { ok: true });
});

test('blocks when the window cap is reached', () => {
  const p = createPacer({ minGapMs: 0, windowMs: 60000, maxInWindow: 3 });
  p.record(0);
  p.record(1);
  p.record(2);
  assert.deepEqual(p.check(3), { ok: false, reason: 'cap', waitMs: 59997 });
});

test('old actions expire from the window', () => {
  const p = createPacer({ minGapMs: 0, windowMs: 60000, maxInWindow: 2 });
  p.record(0);
  p.record(10);
  assert.deepEqual(p.check(59999), { ok: false, reason: 'cap', waitMs: 1 });
  assert.deepEqual(p.check(60000), { ok: true });
});

test('disabled pacer always allows', () => {
  const p = createPacer({ enabled: false, minGapMs: 5000 });
  p.record(0);
  assert.deepEqual(p.check(1), { ok: true });
});
