'use strict';

const { createHmac } = require('node:crypto');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { extractLeadgenEvents, verifyWebhookChallenge, verifyWebhookSignature } = require('../src');

const APP_SECRET = 'test-app-secret';
const sign = (body, secret = APP_SECRET) => 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');

describe('verifyWebhookChallenge', () => {
  it('echoes the challenge when mode and verify token match', () => {
    const result = verifyWebhookChallenge({ 'hub.mode': 'subscribe', 'hub.verify_token': 'my-token', 'hub.challenge': '12345' }, 'my-token');
    assert.deepEqual(result, { ok: true, challenge: '12345' });
  });

  it('rejects a wrong verify token', () => {
    const result = verifyWebhookChallenge({ 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': '12345' }, 'my-token');
    assert.equal(result.ok, false);
  });

  it('rejects a wrong mode', () => {
    const result = verifyWebhookChallenge({ 'hub.mode': 'unsubscribe', 'hub.verify_token': 'my-token', 'hub.challenge': '1' }, 'my-token');
    assert.equal(result.ok, false);
  });

  it('rejects when the expected token is empty (misconfiguration is not open access)', () => {
    const result = verifyWebhookChallenge({ 'hub.mode': 'subscribe', 'hub.verify_token': '', 'hub.challenge': '12345' }, '');
    assert.equal(result.ok, false);
  });
});

describe('verifyWebhookSignature', () => {
  const body = JSON.stringify({ object: 'page', entry: [] });

  it('accepts a valid HMAC SHA-256 signature (string or Buffer body)', () => {
    assert.equal(verifyWebhookSignature(body, sign(body), APP_SECRET), true);
    assert.equal(verifyWebhookSignature(Buffer.from(body), sign(body), APP_SECRET), true);
  });

  it('accepts an upper-case hex signature', () => {
    const upper = 'sha256=' + sign(body).slice('sha256='.length).toUpperCase();
    assert.equal(verifyWebhookSignature(body, upper, APP_SECRET), true);
  });

  it('rejects a signature made with the wrong secret', () => {
    assert.equal(verifyWebhookSignature(body, sign(body, 'other-secret'), APP_SECRET), false);
  });

  it('rejects a tampered body', () => {
    const signature = sign(body);
    assert.equal(verifyWebhookSignature(body.replace('page', 'evil'), signature, APP_SECRET), false);
  });

  it('rejects missing header, wrong prefix, short signature and empty secret', () => {
    assert.equal(verifyWebhookSignature(body, null, APP_SECRET), false);
    assert.equal(verifyWebhookSignature(body, 'sha1=abc', APP_SECRET), false);
    assert.equal(verifyWebhookSignature(body, 'sha256=abc', APP_SECRET), false);
    assert.equal(verifyWebhookSignature(body, sign(body), ''), false);
    assert.equal(verifyWebhookSignature(undefined, sign(body), APP_SECRET), false);
  });
});

describe('extractLeadgenEvents', () => {
  it('extracts leadgen ids from a standard payload', () => {
    const events = extractLeadgenEvents({
      object: 'page',
      entry: [
        {
          id: '111',
          changes: [
            { field: 'leadgen', value: { leadgen_id: 999888777, form_id: 222, page_id: 111, ad_id: 333, adgroup_id: 444, created_time: 1752300000 } },
            { field: 'feed', value: {} },
          ],
        },
      ],
    });
    assert.equal(events.length, 1);
    assert.deepEqual(events[0], {
      leadgenId: '999888777',
      formId: '222',
      pageId: '111',
      adId: '333',
      adgroupId: '444',
      createdTime: 1752300000,
    });
  });

  it('falls back to the entry id for the page', () => {
    const [event] = extractLeadgenEvents({ object: 'page', entry: [{ id: '555', changes: [{ field: 'leadgen', value: { leadgen_id: '1' } }] }] });
    assert.equal(event.pageId, '555');
  });

  it('returns empty for non-page objects and malformed payloads', () => {
    assert.deepEqual(extractLeadgenEvents({ object: 'user', entry: [] }), []);
    assert.deepEqual(extractLeadgenEvents(null), []);
    assert.deepEqual(extractLeadgenEvents({}), []);
    assert.deepEqual(extractLeadgenEvents({ object: 'page', entry: [{ changes: [{ field: 'leadgen' }] }] }), []);
  });
});
