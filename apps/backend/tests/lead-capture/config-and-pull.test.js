'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fx = require('./fixtures');
const { parseToken, buildToken, safeEqual, originAllowed, sourceKeyFromSlug, newSecret } = require('../../src/utils/lead-capture/config');
const { hit, checkCaptureRate, resetRateLimits } = require('../../src/utils/lead-capture/rate-limit');
const { formatIst, pullWindow, fetchLeads } = require('../../src/utils/lead-capture/indiamart-pull');
const { phoneVariants } = require('../../src/utils/lead-ingest');

test('token round trip and rejection of malformed tokens', () => {
  const secret = newSecret();
  assert.deepEqual(parseToken(buildToken(42, secret)), { orgId: 42, secret });
  assert.equal(parseToken('42'), null);
  assert.equal(parseToken('abc.def'), null);
  assert.equal(parseToken('42.short'), null);
  assert.equal(parseToken(`42.${secret}/../x`), null);
});

test('safeEqual', () => {
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('', ''), false);
  assert.equal(safeEqual('abc', 'abcd'), false);
});

test('source slugs', () => {
  assert.equal(sourceKeyFromSlug('99acres'), 'ninety_nine_acres');
  assert.equal(sourceKeyFromSlug('google-ads'), 'google_ads');
  assert.equal(sourceKeyFromSlug('web_form'), 'web_form');
  assert.equal(sourceKeyFromSlug('facebook'), null);
});

test('allowed domains: empty list allows all; subdomains allowed; referer fallback', () => {
  assert.equal(originAllowed([], undefined, undefined), true);
  assert.equal(originAllowed(['example.in'], 'https://www.example.in', undefined), true);
  assert.equal(originAllowed(['example.in'], 'https://shop.example.in', undefined), true);
  assert.equal(originAllowed(['example.in'], undefined, 'https://example.in/contact'), true);
  assert.equal(originAllowed(['example.in'], 'https://evil-example.in', undefined), false);
  assert.equal(originAllowed(['example.in'], undefined, undefined), false);
});

test('rate limiter: fixed window per key', () => {
  resetRateLimits();
  const t = 1_000_000;
  for (let i = 0; i < 3; i++) assert.equal(hit('k', 3, 60000, t).allowed, true);
  assert.equal(hit('k', 3, 60000, t).allowed, false);
  assert.equal(hit('k', 3, 60000, t + 60001).allowed, true);
  resetRateLimits();
  for (let i = 0; i < 10; i++) assert.equal(checkCaptureRate({ orgId: 1, sourceKey: 'web_form', ip: '1.2.3.4', perIp: true }, t).allowed, true);
  const blocked = checkCaptureRate({ orgId: 1, sourceKey: 'web_form', ip: '1.2.3.4', perIp: true }, t);
  assert.equal(blocked.allowed, false);
  assert.match(blocked.reason, /IP/);
  assert.equal(checkCaptureRate({ orgId: 1, sourceKey: 'web_form', ip: '5.6.7.8', perIp: true }, t).allowed, true);
  resetRateLimits();
});

test('indiamart time format is IST DD-Mon-YYYYHH:MM:SS', () => {
  assert.equal(formatIst(new Date('2026-11-18T18:45:09Z')), '19-Nov-202600:15:09');
});

test('indiamart pull window: first run 24h, overlap 5 min, capped at 7 days', () => {
  const now = new Date('2026-11-19T00:00:00Z');
  assert.equal(pullWindow(null, now).start.toISOString(), '2026-11-18T00:00:00.000Z');
  assert.equal(pullWindow('2026-11-18T23:50:00Z', now).start.toISOString(), '2026-11-18T23:45:00.000Z');
  const w = pullWindow('2026-10-01T00:00:00Z', now);
  assert.ok(now - w.start < 7 * 24 * 3600 * 1000);
});

test('indiamart fetchLeads parses records, treats 204 as empty', async () => {
  let calledUrl;
  const ok = await fetchLeads('KEY123', new Date('2026-11-18T00:00:00Z'), new Date('2026-11-18T01:00:00Z'), {
    fetchImpl: async (url) => {
      calledUrl = url;
      return { status: 200, json: async () => fx.indiamartPull };
    },
  });
  assert.equal(ok.records.length, 2);
  assert.match(calledUrl, /glusr_crm_key=KEY123/);
  assert.match(calledUrl, /start_time=18-Nov-202605%3A30%3A00/);
  const empty = await fetchLeads('KEY123', new Date(), new Date(), {
    fetchImpl: async () => ({ status: 200, json: async () => ({ CODE: 204, STATUS: 'FAILURE', MESSAGE: 'There are no leads', RESPONSE: [] }) }),
  });
  assert.equal(empty.code, 204);
  assert.equal(empty.records.length, 0);
});

test('phone variants cover common stored spellings', () => {
  const v = phoneVariants('+919876543210');
  for (const s of ['+919876543210', '919876543210', '9876543210', '09876543210', '+91 9876543210', '+91-9876543210', '98765 43210']) assert.ok(v.includes(s), s);
});
