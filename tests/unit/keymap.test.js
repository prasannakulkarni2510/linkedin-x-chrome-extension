const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveKey } = require('../../extension/src/core/keymap.js');

const ev = (code, o = {}) => ({
  code,
  key: '',
  repeat: false,
  isComposing: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...o,
});

test('main: ArrowLeft and N skip', () => {
  assert.deepEqual(resolveKey('main', ev('ArrowLeft')), { type: 'skip' });
  assert.deepEqual(resolveKey('main', ev('KeyN')), { type: 'skip' });
});

test('main: ArrowRight opens the engage menu and never engages', () => {
  assert.deepEqual(resolveKey('main', ev('ArrowRight')), { type: 'openEngage' });
});

test('main: letter shortcuts map to their actions', () => {
  assert.deepEqual(resolveKey('main', ev('KeyR')), { type: 'openReactions' });
  assert.deepEqual(resolveKey('main', ev('KeyC')), { type: 'openComment' });
  assert.deepEqual(resolveKey('main', ev('KeyS')), { type: 'save' });
  assert.deepEqual(resolveKey('main', ev('KeyO')), { type: 'openPost' });
  assert.deepEqual(resolveKey('main', ev('KeyU')), { type: 'undo' });
  assert.deepEqual(resolveKey('main', ev('KeyX')), { type: 'exitHere' });
});

test('main: Escape exits', () => {
  assert.deepEqual(resolveKey('main', ev('Escape')), { type: 'exit' });
});

test('main: question mark and H toggle help', () => {
  assert.deepEqual(resolveKey('main', ev('Slash', { shiftKey: true, key: '?' })), { type: 'help' });
  assert.deepEqual(resolveKey('main', ev('KeyH')), { type: 'help' });
});

test('main: Space, arrows and paging keys scroll the card', () => {
  assert.deepEqual(resolveKey('main', ev('Space')), { type: 'scroll', unit: 'page', dir: 1 });
  assert.deepEqual(resolveKey('main', ev('Space', { shiftKey: true })), { type: 'scroll', unit: 'page', dir: -1 });
  assert.deepEqual(resolveKey('main', ev('PageDown')), { type: 'scroll', unit: 'page', dir: 1 });
  assert.deepEqual(resolveKey('main', ev('PageUp')), { type: 'scroll', unit: 'page', dir: -1 });
  assert.deepEqual(resolveKey('main', ev('ArrowDown')), { type: 'scroll', unit: 'line', dir: 1 });
  assert.deepEqual(resolveKey('main', ev('ArrowUp')), { type: 'scroll', unit: 'line', dir: -1 });
  assert.deepEqual(resolveKey('main', ev('Home')), { type: 'scroll', unit: 'edge', dir: -1 });
  assert.deepEqual(resolveKey('main', ev('End')), { type: 'scroll', unit: 'edge', dir: 1 });
});

test('main: ctrl, meta and alt combos pass through to the browser', () => {
  assert.equal(resolveKey('main', ev('KeyR', { ctrlKey: true })), null);
  assert.equal(resolveKey('main', ev('KeyS', { metaKey: true })), null);
  assert.equal(resolveKey('main', ev('ArrowLeft', { altKey: true })), null);
});

test('main: unmapped keys such as Tab pass through', () => {
  assert.equal(resolveKey('main', ev('Tab')), null);
});

test('held action keys are swallowed instead of repeating', () => {
  assert.deepEqual(resolveKey('main', ev('ArrowLeft', { repeat: true })), { type: 'noop' });
  assert.deepEqual(resolveKey('reaction', ev('Digit1', { repeat: true })), { type: 'noop' });
});

test('held scroll keys keep scrolling', () => {
  assert.deepEqual(resolveKey('main', ev('ArrowDown', { repeat: true })), { type: 'scroll', unit: 'line', dir: 1 });
});

test('IME composition always passes through', () => {
  assert.equal(resolveKey('main', ev('KeyR', { isComposing: true })), null);
});

test('engage: digits pick fixed slots from the top row or numpad', () => {
  assert.deepEqual(resolveKey('engage', ev('Digit3')), { type: 'engageSlot', slot: 3 });
  assert.deepEqual(resolveKey('engage', ev('Numpad5')), { type: 'engageSlot', slot: 5 });
  assert.deepEqual(resolveKey('engage', ev('Digit9')), { type: 'noop' });
});

test('engage: Escape and ArrowLeft go back', () => {
  assert.deepEqual(resolveKey('engage', ev('Escape')), { type: 'back' });
  assert.deepEqual(resolveKey('engage', ev('ArrowLeft')), { type: 'back' });
});

test('reaction: digits 1-6 pick reaction slots', () => {
  assert.deepEqual(resolveKey('reaction', ev('Digit2')), { type: 'react', slot: 2 });
  assert.deepEqual(resolveKey('reaction', ev('Digit7')), { type: 'noop' });
});

test('reaction: 0 removes the current reaction', () => {
  assert.deepEqual(resolveKey('reaction', ev('Digit0')), { type: 'removeReaction' });
});

test('reaction: Escape goes back', () => {
  assert.deepEqual(resolveKey('reaction', ev('Escape')), { type: 'back' });
});

test('comment: typing passes through to the text field', () => {
  assert.equal(resolveKey('comment', ev('KeyC')), null);
  assert.equal(resolveKey('comment', ev('KeyR')), null);
  assert.equal(resolveKey('comment', ev('Space')), null);
  assert.equal(resolveKey('comment', ev('ArrowLeft')), null);
});

test('comment: ctrl or cmd plus Enter submits', () => {
  assert.deepEqual(resolveKey('comment', ev('Enter', { ctrlKey: true })), { type: 'submitComment' });
  assert.deepEqual(resolveKey('comment', ev('Enter', { metaKey: true })), { type: 'submitComment' });
  assert.equal(resolveKey('comment', ev('Enter')), null);
});

test('comment: Escape closes the composer', () => {
  assert.deepEqual(resolveKey('comment', ev('Escape')), { type: 'closeComposer' });
});

test('native: every key passes through to LinkedIn', () => {
  assert.equal(resolveKey('native', ev('Escape')), null);
  assert.equal(resolveKey('native', ev('KeyR')), null);
});

test('failure: Enter retries, Escape continues, O opens the post', () => {
  assert.deepEqual(resolveKey('failure', ev('Enter')), { type: 'retry' });
  assert.deepEqual(resolveKey('failure', ev('Escape')), { type: 'dismiss' });
  assert.deepEqual(resolveKey('failure', ev('KeyO')), { type: 'openPost' });
  assert.deepEqual(resolveKey('failure', ev('KeyR')), { type: 'noop' });
});

test('end: Enter scans again, Escape exits', () => {
  assert.deepEqual(resolveKey('end', ev('Enter')), { type: 'rescan' });
  assert.deepEqual(resolveKey('end', ev('Escape')), { type: 'exit' });
});

test('help: Escape, ? or H close it and other keys are swallowed', () => {
  assert.deepEqual(resolveKey('help', ev('Escape')), { type: 'closeHelp' });
  assert.deepEqual(resolveKey('help', ev('Slash', { shiftKey: true, key: '?' })), { type: 'closeHelp' });
  assert.deepEqual(resolveKey('help', ev('KeyH')), { type: 'closeHelp' });
  assert.deepEqual(resolveKey('help', ev('ArrowLeft')), { type: 'noop' });
});

test('busy: keys are swallowed while an action runs', () => {
  assert.deepEqual(resolveKey('busy', ev('ArrowLeft')), { type: 'noop' });
  assert.deepEqual(resolveKey('busy', ev('Escape')), { type: 'noop' });
});

test('grace: Escape stays on the post, other keys behave like main', () => {
  assert.deepEqual(resolveKey('grace', ev('Escape')), { type: 'stay' });
  assert.deepEqual(resolveKey('grace', ev('ArrowLeft')), { type: 'skip' });
  assert.deepEqual(resolveKey('grace', ev('KeyC')), { type: 'openComment' });
});

test('blocked: Escape exits, other keys are swallowed', () => {
  assert.deepEqual(resolveKey('blocked', ev('Escape')), { type: 'exit' });
  assert.deepEqual(resolveKey('blocked', ev('ArrowLeft')), { type: 'noop' });
});
