'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fx = require('./fixtures');
const { parseLeadEmail, parseSubject, htmlToText } = require('../../src/utils/lead-capture/email-parsers');

test('justdial email: label lines, ignores the portal sender address', () => {
  const r = parseLeadEmail('justdial', fx.justdialEmail);
  assert.equal(r.lead.fullName, 'Ms Neha Kapoor');
  assert.equal(r.lead.phone, '+91-9876501234');
  assert.equal(r.lead.email, 'neha.kapoor@example.com');
  assert.equal(r.lead.city, 'Mumbai');
  assert.equal(r.lead.industry, 'Interior Designers');
  assert.equal(r.lead.address, 'Andheri West');
  assert.equal(r.lead.message, 'Enquiry for Interior Designers');
  assert.equal(r.externalId, 'JD-112233');
  assert.equal(r.sourceDetails.viaEmail, true);
  assert.equal(r.sourceDetails.emailSubject, fx.justdialEmail.subject);
});

test('99acres email: HTML table cells, message line', () => {
  const r = parseLeadEmail('ninety_nine_acres', fx.ninetyNineAcresEmail);
  assert.equal(r.lead.fullName, 'Pranav Joshi');
  assert.equal(r.lead.email, 'pranav.joshi@example.com');
  assert.equal(r.lead.phone, '+91 9822012345');
  assert.equal(r.sourceDetails.project, 'Sunrise Heights - 2 BHK');
  assert.equal(r.sourceDetails.locality, 'Baner, Pune');
  assert.equal(r.lead.address, 'Baner, Pune');
  assert.equal(r.externalId, 'Q99-5566');
  assert.equal(r.lead.message, 'Enquiry for Sunrise Heights - 2 BHK\nIs the price negotiable?');
});

test('magicbricks email: "Label - value" lines', () => {
  const r = parseLeadEmail('magicbricks', fx.magicbricksEmail);
  assert.equal(r.lead.fullName, 'Ritu Sharma');
  assert.equal(r.lead.phone, '9811012345');
  assert.equal(r.lead.email, 'ritu.sharma@example.com');
  assert.equal(r.sourceDetails.budget, '1.2 Cr');
  assert.equal(r.sourceDetails.locality, 'Sector 62, Noida');
  assert.equal(r.lead.message, 'Enquiry for Palm Grove Villas');
});

test('falls back to regexes when there are no labels', () => {
  const r = parseLeadEmail('justdial', {
    subject: 'Enquiry for Packers and Movers from Imran Khan',
    text: 'Imran Khan wants a call back on 98200 12345. You can also write to imran.k@example.net.\nSent by noreply@justdial.com',
  });
  assert.equal(r.lead.fullName, 'Imran Khan');
  assert.equal(r.lead.phone, '98200 12345');
  assert.equal(r.lead.email, 'imran.k@example.net');
  assert.equal(r.lead.message, 'Enquiry for Packers and Movers');
});

test('no contact details → empty email and phone (endpoint then rejects it)', () => {
  const r = parseLeadEmail('magicbricks', { subject: 'Your weekly listing report', text: 'Views: 120\nSee more at https://www.magicbricks.com' });
  assert.equal(r.lead.email, '');
  assert.equal(r.lead.phone, '');
});

test('subject patterns and HTML flattening', () => {
  assert.deepEqual(parseSubject('New lead for 3 BHK in Wakad from Sana Shaikh'), { topic: '3 BHK in Wakad', name: 'Sana Shaikh' });
  assert.deepEqual(parseSubject('Anil Gupta is interested in Orchid Towers'), { name: 'Anil Gupta', topic: 'Orchid Towers' });
  assert.equal(htmlToText('<p>A&amp;B</p><br>C').replace(/\s+/g, ' ').trim(), 'A&B C');
});
