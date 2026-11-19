'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getOAuthUrl, exchangeCodeForToken, signState, verifyState } = require('../src');

describe('OAuth state', () => {
  it('round-trips a signed state', () => {
    const state = signState({ orgId: 7, userId: 3 }, 'secret');
    const payload = verifyState(state, 'secret');
    assert.equal(payload.orgId, 7);
    assert.equal(payload.userId, 3);
  });

  it('rejects a tampered, wrongly-signed or expired state', () => {
    const state = signState({ orgId: 7 }, 'secret');
    const [body, sig] = state.split('.');
    const forged = Buffer.from(JSON.stringify({ orgId: 8, exp: 9999999999 })).toString('base64url');
    assert.equal(verifyState(`${forged}.${sig}`, 'secret'), null);
    assert.equal(verifyState(`${body}.${sig}`, 'other'), null);
    assert.equal(verifyState(signState({ orgId: 7 }, 'secret', -10), 'secret'), null);
    assert.equal(verifyState('garbage', 'secret'), null);
    assert.equal(verifyState(state, ''), null);
  });
});

describe('getOAuthUrl', () => {
  it('builds the Facebook Login URL with lead-ads scopes', () => {
    const url = new URL(getOAuthUrl('st', 'https://api.example.com/cb', { appId: '42' }));
    assert.equal(url.hostname, 'www.facebook.com');
    assert.equal(url.searchParams.get('client_id'), '42');
    assert.equal(url.searchParams.get('state'), 'st');
    assert.match(url.searchParams.get('scope'), /leads_retrieval/);
    assert.match(url.searchParams.get('scope'), /pages_manage_metadata/);
  });

  it('requires appId and state', () => {
    assert.throws(() => getOAuthUrl('st', 'x', {}));
    assert.throws(() => getOAuthUrl('', 'x', { appId: '1' }));
  });
});

describe('exchangeCodeForToken', () => {
  it('exchanges the code then upgrades to a long-lived token', async () => {
    const calls = [];
    const fetchImpl = async (url) => {
      calls.push(new URL(url));
      const body = calls.length === 1 ? { access_token: 'short' } : { access_token: 'long', expires_in: 5184000 };
      return new Response(JSON.stringify(body), { status: 200 });
    };
    const result = await exchangeCodeForToken('code1', { appId: '1', appSecret: 's', redirectUri: 'https://x/cb', fetchImpl });
    assert.deepEqual(result, { accessToken: 'long', tokenType: 'bearer', expiresIn: 5184000 });
    assert.equal(calls[0].searchParams.get('code'), 'code1');
    assert.equal(calls[1].searchParams.get('grant_type'), 'fb_exchange_token');
    assert.equal(calls[1].searchParams.get('fb_exchange_token'), 'short');
  });

  it('surfaces Meta errors', async () => {
    const fetchImpl = async () => new Response(JSON.stringify({ error: { message: 'Invalid code', code: 100 } }), { status: 400 });
    await assert.rejects(exchangeCodeForToken('bad', { appId: '1', appSecret: 's', redirectUri: 'x', fetchImpl }), /Invalid code/);
  });
});
