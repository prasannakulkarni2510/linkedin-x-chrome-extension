const test = require('node:test');
const assert = require('node:assert/strict');
const {
  REACTIONS,
  reactionBySlot,
  reactionFromLabel,
  ENGAGE_ACTIONS,
  engageBySlot,
} = require('../../extension/src/core/catalog.js');

test('six reactions sit in fixed slots', () => {
  assert.deepEqual(
    REACTIONS.map((r) => [r.slot, r.id]),
    [[1, 'like'], [2, 'celebrate'], [3, 'support'], [4, 'love'], [5, 'insightful'], [6, 'funny']]
  );
});

test('reactionBySlot returns null outside 1-6', () => {
  assert.equal(reactionBySlot(2).id, 'celebrate');
  assert.equal(reactionBySlot(0), null);
  assert.equal(reactionBySlot(7), null);
});

test('reactionFromLabel parses button labels', () => {
  assert.equal(reactionFromLabel('React Celebrate'), 'celebrate');
  assert.equal(reactionFromLabel('Like'), 'like');
  assert.equal(reactionFromLabel('  insightful '), 'insightful');
  assert.equal(reactionFromLabel('Reaction button state: love'), 'love');
  assert.equal(reactionFromLabel('Support'), 'support');
  assert.equal(reactionFromLabel('Funny'), 'funny');
});

test('reactionFromLabel ignores unrelated labels', () => {
  assert.equal(reactionFromLabel('Comment'), null);
  assert.equal(reactionFromLabel('Unlike'), null);
  assert.equal(reactionFromLabel(''), null);
  assert.equal(reactionFromLabel(null), null);
});

test('reactionFromLabel maps LinkedIn API reaction names', () => {
  assert.equal(reactionFromLabel('PRAISE'), 'celebrate');
  assert.equal(reactionFromLabel('EMPATHY'), 'love');
  assert.equal(reactionFromLabel('INTEREST'), 'insightful');
  assert.equal(reactionFromLabel('APPRECIATION'), 'support');
  assert.equal(reactionFromLabel('ENTERTAINMENT'), 'funny');
});

test('engage actions keep fixed slot numbers', () => {
  assert.deepEqual(
    ENGAGE_ACTIONS.map((a) => [a.slot, a.id]),
    [
      [1, 'react'],
      [2, 'comment'],
      [3, 'repost'],
      [4, 'repostThoughts'],
      [5, 'save'],
      [6, 'open'],
      [7, 'copyLink'],
      [8, 'viewProfile'],
    ]
  );
  assert.equal(engageBySlot(5).id, 'save');
  assert.equal(engageBySlot(9), null);
});

test('engage actions flag which ones change things on LinkedIn', () => {
  const mutating = ENGAGE_ACTIONS.filter((a) => a.mutating).map((a) => a.id);
  assert.deepEqual(mutating, ['react', 'comment', 'repost', 'repostThoughts', 'save']);
});

test('X catalog: one reaction (Like) and X labels in the same fixed slots', () => {
  const x = require('../../extension/src/core/catalog.js').forSite('x');
  assert.equal(x.siteId, 'x');
  assert.deepEqual(x.REACTIONS.map((r) => r.id), ['like']);
  assert.deepEqual(
    x.ENGAGE_ACTIONS.map((a) => [a.slot, a.id, a.label]),
    [
      [1, 'react', 'Like'],
      [2, 'comment', 'Reply'],
      [3, 'repost', 'Repost'],
      [4, 'repostThoughts', 'Quote'],
      [5, 'save', 'Bookmark'],
      [6, 'open', 'Open on X'],
      [7, 'copyLink', 'Copy link'],
      [8, 'viewProfile', "View author's profile"],
      [9, 'screenshot', 'Screenshot'],
    ]
  );
  assert.equal(x.reactionBySlot(2), null);
  assert.equal(x.reactionFromLabel('Unlike'), null);
});

test('unknown site falls back to the LinkedIn catalog', () => {
  const { forSite } = require('../../extension/src/core/catalog.js');
  assert.equal(forSite('nope').siteId, 'linkedin');
  assert.equal(forSite(undefined).REACTIONS.length, 6);
});
