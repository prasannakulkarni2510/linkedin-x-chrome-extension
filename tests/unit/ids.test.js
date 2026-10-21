const test = require('node:test');
const assert = require('node:assert/strict');
const { keyFromUrn, keysFromHref, contentSignature, postUrlFromKey } = require('../../extension/src/core/ids.js');

test('keyFromUrn normalizes activity urns', () => {
  assert.equal(keyFromUrn('urn:li:activity:7012345678901234567'), 'activity:7012345678901234567');
});

test('keyFromUrn normalizes ugcPost and share urns', () => {
  assert.equal(keyFromUrn('urn:li:ugcPost:123'), 'ugcPost:123');
  assert.equal(keyFromUrn('urn:li:share:456'), 'share:456');
});

test('keyFromUrn finds the post urn inside wrapped fsd urns', () => {
  assert.equal(keyFromUrn('urn:li:fsd_update:(urn:li:activity:789,MAIN_FEED,EMPTY,DEFAULT,false)'), 'activity:789');
});

test('keyFromUrn returns null for unrelated values', () => {
  assert.equal(keyFromUrn('urn:li:member:1'), null);
  assert.equal(keyFromUrn(''), null);
  assert.equal(keyFromUrn(undefined), null);
});

test('keysFromHref extracts urn from post permalink', () => {
  assert.deepEqual(keysFromHref('https://www.linkedin.com/feed/update/urn:li:activity:42/'), ['activity:42']);
  assert.deepEqual(keysFromHref('/feed/update/urn%3Ali%3AugcPost%3A99?x=1'), ['ugcPost:99']);
});

test('keysFromHref extracts activity id from /posts/ slug urls', () => {
  assert.deepEqual(keysFromHref('https://www.linkedin.com/posts/alex_title-activity-7100-abcd'), ['activity:7100']);
});

test('keysFromHref returns empty list for non-post links', () => {
  assert.deepEqual(keysFromHref('https://www.linkedin.com/in/alex/'), []);
  assert.deepEqual(keysFromHref(null), []);
});

test('contentSignature ignores whitespace differences', () => {
  const a = contentSignature('Alex Rivera', '2h', 'Hello   world\n\nagain');
  const b = contentSignature('Alex Rivera', '2h', 'Hello world again');
  assert.equal(a, b);
});

test('contentSignature differs when author differs', () => {
  assert.notEqual(
    contentSignature('Alex Rivera', '2h', 'Happy holidays!'),
    contentSignature('Sam Lee', '2h', 'Happy holidays!')
  );
});

test('contentSignature returns a sig-prefixed key', () => {
  assert.match(contentSignature('A', 'B', 'C'), /^sig:[0-9a-z]+$/);
});

test('postUrlFromKey builds a LinkedIn permalink', () => {
  assert.equal(postUrlFromKey('activity:42'), 'https://www.linkedin.com/feed/update/urn:li:activity:42/');
  assert.equal(postUrlFromKey('ugcPost:7'), 'https://www.linkedin.com/feed/update/urn:li:ugcPost:7/');
  assert.equal(postUrlFromKey('sig:abc'), null);
});

test('xStatusFromHref reads X status links, relative or absolute', () => {
  const { xStatusFromHref } = require('../../extension/src/core/ids.js');
  assert.deepEqual(xStatusFromHref('/priyabuilds/status/1800000000000000000'), {
    key: 'x:1800000000000000000',
    id: '1800000000000000000',
    handle: 'priyabuilds',
    url: 'https://x.com/priyabuilds/status/1800000000000000000',
  });
  assert.equal(xStatusFromHref('https://twitter.com/a_b/status/42/photo/1').key, 'x:42');
  assert.equal(xStatusFromHref('/a/status/42/analytics').key, 'x:42');
  assert.equal(xStatusFromHref('https://x.com/a/status/42?s=20').key, 'x:42');
});

test('xStatusFromHref rejects non-status links and other hosts', () => {
  const { xStatusFromHref } = require('../../extension/src/core/ids.js');
  assert.equal(xStatusFromHref('/priyabuilds'), null);
  assert.equal(xStatusFromHref('/i/status/42'), null);
  assert.equal(xStatusFromHref('https://evil.example/a/status/42'), null);
  assert.equal(xStatusFromHref('/a/status/notanumber'), null);
  assert.equal(xStatusFromHref(''), null);
  assert.equal(xStatusFromHref(null), null);
});

test('postUrlFromKey builds X links for x: keys and keeps LinkedIn links', () => {
  const { postUrlFromKey } = require('../../extension/src/core/ids.js');
  assert.equal(postUrlFromKey('x:42'), 'https://x.com/i/status/42');
  assert.equal(postUrlFromKey('activity:7'), 'https://www.linkedin.com/feed/update/urn:li:activity:7/');
  assert.equal(postUrlFromKey('sig:abc'), null);
});
