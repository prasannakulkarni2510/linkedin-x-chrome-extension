const test = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULT_SETTINGS, normalizeSettings } = require('../../extension/src/core/settings.js');

test('fills defaults for missing values', () => {
  assert.deepEqual(normalizeSettings({}), DEFAULT_SETTINGS);
  assert.deepEqual(normalizeSettings(undefined), DEFAULT_SETTINGS);
});

test('keeps valid overrides', () => {
  const s = normalizeSettings({ graceMs: 0, excludePromoted: false });
  assert.equal(s.graceMs, 0);
  assert.equal(s.excludePromoted, false);
});

test('clamps grace window to 0-5000 ms', () => {
  assert.equal(normalizeSettings({ graceMs: 99999 }).graceMs, 5000);
  assert.equal(normalizeSettings({ graceMs: -5 }).graceMs, 0);
});

test('pause between posts defaults to 450 ms and stays within 0-1500 ms', () => {
  assert.equal(DEFAULT_SETTINGS.postGapMs, 450);
  assert.equal(normalizeSettings({ postGapMs: 9000 }).postGapMs, 1500);
  assert.equal(normalizeSettings({ postGapMs: -1 }).postGapMs, 0);
  assert.equal(normalizeSettings({ postGapMs: 800 }).postGapMs, 800);
});

test('rejects values of the wrong type', () => {
  const s = normalizeSettings({ excludePromoted: 'no', graceMs: 'fast', unknownKey: 1 });
  assert.equal(s.excludePromoted, DEFAULT_SETTINGS.excludePromoted);
  assert.equal(s.graceMs, DEFAULT_SETTINGS.graceMs);
  assert.equal('unknownKey' in s, false);
});
