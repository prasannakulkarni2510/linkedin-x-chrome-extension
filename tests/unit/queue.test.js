const test = require('node:test');
const assert = require('node:assert/strict');
const { createSession } = require('../../extension/src/core/queue.js');

const rec = (id, extraKeys = []) => ({ id, keys: ['activity:' + id, ...extraKeys] });

test('current is null for an empty session', () => {
  assert.equal(createSession().current(), null);
});

test('add queues posts in discovery order', () => {
  const s = createSession();
  assert.equal(s.add([rec(1), rec(2), rec(3)]), 3);
  assert.equal(s.current().id, 1);
});

test('add ignores posts sharing any key with a seen post', () => {
  const s = createSession();
  s.add([rec(1, ['ugcPost:9'])]);
  assert.equal(s.add([rec(2, ['ugcPost:9']), rec(1)]), 0);
  assert.equal(s.remaining(), 0);
});

test('add ignores records without keys', () => {
  const s = createSession();
  assert.equal(s.add([{ id: 'x', keys: [] }, { id: 'y' }]), 0);
  assert.equal(s.current(), null);
});

test('skip advances to the next post and marks the skipped one', () => {
  const s = createSession();
  s.add([rec(1), rec(2)]);
  assert.equal(s.skip().id, 2);
  assert.equal(s.statusOf(rec(1)), 'skipped');
});

test('skipped post is never re-added during the session', () => {
  const s = createSession();
  s.add([rec(1), rec(2)]);
  s.skip();
  assert.equal(s.add([rec(1)]), 0);
});

test('remaining counts queued posts after the current one', () => {
  const s = createSession();
  s.add([rec(1), rec(2), rec(3)]);
  assert.equal(s.remaining(), 2);
  s.skip();
  assert.equal(s.remaining(), 1);
});

test('isLow is true when remaining is at or below the threshold', () => {
  const s = createSession();
  s.add([rec(1), rec(2), rec(3), rec(4)]);
  assert.equal(s.isLow(3), true);
  assert.equal(s.isLow(2), false);
});

test('undo restores the last skipped post as current', () => {
  const s = createSession();
  s.add([rec(1), rec(2), rec(3)]);
  s.skip();
  assert.equal(s.undo().id, 1);
  assert.equal(s.current().id, 1);
  assert.equal(s.statusOf(rec(1)), 'queued');
});

test('undo keeps the previously current post next in line', () => {
  const s = createSession();
  s.add([rec(1), rec(2), rec(3)]);
  s.skip();
  s.undo();
  assert.equal(s.skip().id, 2);
  assert.equal(s.skip().id, 3);
});

test('undo returns null when nothing was skipped', () => {
  const s = createSession();
  s.add([rec(1)]);
  assert.equal(s.undo(), null);
  assert.equal(s.current().id, 1);
});

test('undo stack keeps only the last 20 skips', () => {
  const s = createSession();
  s.add(Array.from({ length: 30 }, (_, i) => rec(i + 1)));
  for (let i = 0; i < 25; i++) s.skip();
  let undone = 0;
  while (s.undo()) undone++;
  assert.equal(undone, 20);
  assert.equal(s.current().id, 6);
});

test('complete marks the post engaged and undo does not restore it', () => {
  const s = createSession();
  s.add([rec(1), rec(2)]);
  assert.equal(s.complete().id, 2);
  assert.equal(s.statusOf(rec(1)), 'engaged');
  assert.equal(s.undo(), null);
});

test('skip on an engaged post keeps the engaged status', () => {
  const s = createSession();
  s.add([rec(1), rec(2)]);
  s.markCurrent('engaged');
  s.skip();
  assert.equal(s.statusOf(rec(1)), 'engaged');
  assert.equal(s.undo(), null);
});

test('adding posts after exhaustion makes the new post current', () => {
  const s = createSession();
  s.add([rec(1)]);
  assert.equal(s.skip(), null);
  s.add([rec(2)]);
  assert.equal(s.current().id, 2);
});

test('stats counts posts by status', () => {
  const s = createSession();
  s.add([rec(1), rec(2), rec(3), rec(4)]);
  s.skip();
  s.complete();
  s.markCurrent('failed');
  s.skip();
  assert.deepEqual(s.stats(), { seen: 4, queued: 1, skipped: 1, engaged: 1, failed: 1 });
});

test('position reports the 1-based index of the current post', () => {
  const s = createSession();
  s.add([rec(1), rec(2)]);
  assert.equal(s.position(), 1);
  s.skip();
  assert.equal(s.position(), 2);
});
