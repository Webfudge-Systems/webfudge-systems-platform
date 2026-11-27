'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { CHANNELS, channelAvailability } = require('../../src/utils/intake/channels');

test('every channel exposes the same interface', () => {
  for (const key of Object.keys(CHANNELS)) {
    const c = CHANNELS[key];
    assert.equal(c.key, key);
    assert.equal(typeof c.label, 'string');
    assert.equal(typeof c.availability, 'function');
  }
});

test('WhatsApp is never available until Fudge Connect exists', () => {
  const a = channelAvailability('whatsapp', { INTAKE_EMAIL_DOMAIN: 'x.com', RESEND_INBOUND_WEBHOOK_SECRET: 'whsec_x' });
  assert.equal(a.available, false);
  assert.match(a.reason, /not available yet/i);
});

test('email needs an inbound domain and a webhook secret', () => {
  assert.equal(channelAvailability('email', {}).available, false);
  assert.equal(channelAvailability('email', { INTAKE_EMAIL_DOMAIN: 'in.x.com', RESEND_INBOUND_WEBHOOK_SECRET: 'whsec_a' }).available, true);
});

test('forms are always available; unknown channels are not', () => {
  assert.equal(channelAvailability('form', {}).available, true);
  assert.equal(channelAvailability('sms', {}).available, false);
});
