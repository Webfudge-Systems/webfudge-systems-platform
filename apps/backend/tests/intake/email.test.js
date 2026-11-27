'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { verifySvixSignature, extractIntakeSecret, htmlToText, isAutoReply, parseFrom, buildEmailTaskDraft } = require('../../src/utils/intake/email');

const secretBytes = Buffer.from('intake-test-secret-key-0123456789');
const SECRET = `whsec_${secretBytes.toString('base64')}`;
function sign(id, ts, body) {
  return 'v1,' + crypto.createHmac('sha256', secretBytes).update(`${id}.${ts}.${body}`).digest('base64');
}

test('verifySvixSignature accepts a valid signature', () => {
  const now = 1_700_000_000;
  const body = '{"type":"email.received"}';
  const headers = { 'svix-id': 'msg_1', 'svix-timestamp': String(now), 'svix-signature': `v1,bogus ${sign('msg_1', now, body)}` };
  assert.equal(verifySvixSignature(body, headers, SECRET, now * 1000), true);
});

test('verifySvixSignature rejects tampered body, stale timestamp and missing secret', () => {
  const now = 1_700_000_000;
  const body = '{"a":1}';
  const headers = { 'svix-id': 'msg_1', 'svix-timestamp': String(now), 'svix-signature': sign('msg_1', now, body) };
  assert.equal(verifySvixSignature('{"a":2}', headers, SECRET, now * 1000), false);
  assert.equal(verifySvixSignature(body, headers, SECRET, (now + 600) * 1000), false);
  assert.equal(verifySvixSignature(body, headers, '', now * 1000), false);
  assert.equal(verifySvixSignature(body, {}, SECRET, now * 1000), false);
});

test('extractIntakeSecret finds the task-<secret> recipient on our domain only', () => {
  const s = 'a1b2c3d4e5f6a1b2c3d4e5f6';
  assert.equal(extractIntakeSecret(['Someone <x@other.com>', `Tasks <task-${s}@in.example.com>`], 'in.example.com'), s);
  assert.equal(extractIntakeSecret([`task-${s}@evil.com`], 'in.example.com'), null);
  assert.equal(extractIntakeSecret(['task-short@in.example.com'], 'in.example.com'), null);
});

test('htmlToText strips scripts, styles and tags', () => {
  const t = htmlToText('<style>p{}</style><p>Hello&nbsp;<b>there</b><script>alert(1)</script><br>Line&amp;2</p>');
  assert.equal(t, 'Hello there\nLine&2');
});

test('isAutoReply detects auto-submitted and bulk mail', () => {
  assert.equal(isAutoReply({ 'auto-submitted': 'auto-replied' }), true);
  assert.equal(isAutoReply({ 'Auto-Submitted': 'no' }), false);
  assert.equal(isAutoReply({ precedence: 'bulk' }), true);
  assert.equal(isAutoReply({}), false);
});

test('parseFrom splits a display name and address', () => {
  assert.deepEqual(parseFrom('Ada Lovelace <ada@example.com>'), { name: 'Ada Lovelace', email: 'ada@example.com' });
  assert.deepEqual(parseFrom('ada@example.com'), { name: '', email: 'ada@example.com' });
});

test('buildEmailTaskDraft uses the subject and the plain text body, truncated', () => {
  const draft = buildEmailTaskDraft({
    from: 'Ada <ada@example.com>',
    subject: '  Fwd: New banner  ',
    text: 'x'.repeat(30000),
    attachments: [{ filename: 'a.png' }],
  });
  assert.equal(draft.name, 'Fwd: New banner');
  assert.match(draft.description, /^From: Ada <ada@example.com>/);
  assert.ok(draft.description.length < 21000);
  assert.deepEqual(draft.tags, ['intake', 'intake:email']);
  const noSubject = buildEmailTaskDraft({ from: 'a@b.co', subject: '', html: '<p>Hi</p>' });
  assert.equal(noSubject.name, 'Email from a@b.co');
  assert.match(noSubject.description, /Hi/);
});
