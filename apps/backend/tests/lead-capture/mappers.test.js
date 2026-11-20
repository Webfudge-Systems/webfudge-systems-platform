'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fx = require('./fixtures');
const { mapWebForm, mapGoogleAds, mapIndiaMart, indiamartRecords, mapIndiaMartRecord, mapJustDial, mapPropertyPortal } = require('../../src/utils/lead-capture/mappers');

test('web form: maps fields, UTM, page + referrer, extra fields', () => {
  const r = mapWebForm(fx.webForm);
  assert.equal(r.spam, undefined);
  assert.equal(r.lead.fullName, 'Asha Verma');
  assert.equal(r.lead.firstName, 'Asha');
  assert.equal(r.lead.lastName, 'Verma');
  assert.equal(r.lead.email, 'Asha.Verma@Example.in');
  assert.equal(r.lead.phone, '098765 43210');
  assert.equal(r.lead.companyName, 'Verma Textiles Pvt Ltd');
  assert.equal(r.lead.message, 'Need a quote for 500 units.\nDelivery to Surat.');
  assert.deepEqual(r.sourceDetails.utm, { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'diwali-sale' });
  assert.equal(r.sourceDetails.pageUrl, 'https://verma.example.in/contact?utm_source=google');
  assert.equal(r.sourceDetails.referrer, 'https://www.google.com/');
  assert.equal(r.sourceDetails.formName, 'Contact us');
  assert.deepEqual(r.sourceDetails.extraFields, { budget: '2 lakh' });
});

test('web form: accepts first/last name and other common field names', () => {
  const r = mapWebForm({ 'first-name': 'Ravi', last_name: 'Kumar', 'your-email': 'ravi@example.com', 'Mobile Number': '9876543210', Pincode: '560001' });
  assert.equal(r.lead.fullName, 'Ravi Kumar');
  assert.equal(r.lead.email, 'ravi@example.com');
  assert.equal(r.lead.phone, '9876543210');
  assert.equal(r.lead.zipCode, '560001');
});

test('web form: honeypot and too-fast submissions are spam', () => {
  assert.match(mapWebForm({ ...fx.webForm, _wf_hp: 'http://spam.example' }).spam, /honeypot/);
  const now = 1_000_000_000_000;
  assert.match(mapWebForm({ ...fx.webForm, _wf_ts: String(now - 500) }, { now }).spam, /2 seconds/);
  assert.equal(mapWebForm({ ...fx.webForm, _wf_ts: String(now - 15000) }, { now }).spam, undefined);
});

test('google ads: maps user_column_data by column_id, keeps custom answers', () => {
  const r = mapGoogleAds(fx.googleAds);
  assert.equal(r.lead.fullName, 'Rohan Mehta');
  assert.equal(r.lead.firstName, 'Rohan');
  assert.equal(r.lead.phone, '+919812345678');
  assert.equal(r.lead.email, 'rohan.mehta@example.com');
  assert.equal(r.lead.zipCode, '411001');
  assert.equal(r.lead.city, 'Pune');
  assert.equal(r.lead.message, 'What is your budget?: ₹5-10 lakh');
  assert.equal(r.externalId, fx.googleAds.lead_id);
  assert.equal(r.googleKey, 'REPLACED_IN_TEST');
  assert.equal(r.isTest, false);
  assert.equal(r.sourceDetails.formId, '40000000000');
  assert.equal(r.sourceDetails.campaignId, '12345678901');
  assert.equal(r.sourceDetails.gclid, 'TeSter-gclid');
});

test('google ads: test leads and FIRST/LAST name columns', () => {
  const r = mapGoogleAds({
    is_test: true,
    google_key: 'k',
    user_column_data: [
      { column_id: 'FIRST_NAME', string_value: 'Ana' },
      { column_id: 'LAST_NAME', string_value: 'Das' },
      { column_id: 'WORK_EMAIL', string_value: 'ana@corp.example' },
    ],
  });
  assert.equal(r.isTest, true);
  assert.equal(r.lead.fullName, 'Ana Das');
  assert.equal(r.lead.email, 'ana@corp.example');
});

test('indiamart push: maps sender fields, subject + message, query details', () => {
  const r = mapIndiaMart(fx.indiamartPush);
  assert.equal(r.externalId, '2650000001');
  assert.equal(r.lead.fullName, 'Suresh Patel');
  assert.equal(r.lead.phone, '+91-9898012345');
  assert.equal(r.lead.email, 'suresh.patel@example.co.in');
  assert.equal(r.lead.companyName, 'Patel Agro Industries');
  assert.equal(r.lead.city, 'Vadodara');
  assert.equal(r.lead.zipCode, '390010');
  assert.equal(r.lead.industry, 'Water Pumps');
  assert.equal(r.lead.message, 'Requirement for Industrial Water Pump\nI want to buy Industrial Water Pump.\nQuantity: 4 Piece\nUsage: Agriculture');
  assert.equal(r.sourceDetails.queryType, 'W (Direct enquiry)');
  assert.equal(r.sourceDetails.product, 'Industrial Water Pump');
});

test('indiamart: RESPONSE as JSON string, flat record, and pull arrays', () => {
  assert.equal(mapIndiaMart({ RESPONSE: JSON.stringify(fx.indiamartPush.RESPONSE) }).externalId, '2650000001');
  assert.equal(mapIndiaMart(fx.indiamartPush.RESPONSE).lead.fullName, 'Suresh Patel');
  const recs = indiamartRecords(fx.indiamartPull);
  assert.equal(recs.length, 2);
  const call = mapIndiaMartRecord(recs[1]);
  assert.equal(call.sourceDetails.queryType, 'P (Call (PNS))');
  assert.equal(call.sourceDetails.callDuration, '42');
  assert.equal(call.lead.email, '');
  assert.deepEqual(mapIndiaMart({}).lead, {});
});

test('justdial push: maps leadid, mobile, category, area', () => {
  const r = mapJustDial(fx.justdialPush);
  assert.equal(r.externalId, 'JD-778899');
  assert.equal(r.lead.fullName, 'Vikram Singh');
  assert.equal(r.lead.phone, '9811122233');
  assert.equal(r.lead.email, 'vikram.singh@example.com');
  assert.equal(r.lead.city, 'Delhi');
  assert.equal(r.lead.zipCode, '110024');
  assert.equal(r.lead.industry, 'Interior Designers');
  assert.equal(r.lead.message, 'Enquiry for Interior Designers (Lajpat Nagar)');
  assert.equal(r.sourceDetails.altPhone, '01141234567');
  assert.equal(r.sourceDetails.branchArea, 'South Delhi');
});

test('99acres / magicbricks push: generic mapping with project + locality', () => {
  const a = mapPropertyPortal(fx.ninetyNineAcresPush, '99acres');
  assert.equal(a.externalId, '99A-445566');
  assert.equal(a.lead.fullName, 'Kavya Nair');
  assert.equal(a.lead.phone, '+91 98450 11223');
  assert.equal(a.lead.message, 'Please share the brochure and price list.');
  assert.equal(a.sourceDetails.project, 'Green Meadows Phase 2');
  assert.equal(a.sourceDetails.budget, '85L - 1Cr');
  assert.equal(a.sourceDetails.portal, '99acres');

  const m = mapPropertyPortal(fx.magicbricksPush, 'MagicBricks');
  assert.equal(m.lead.fullName, 'Arjun Rao');
  assert.equal(m.lead.email, 'arjun.rao@example.com');
  assert.equal(m.lead.phone, '9700011122');
  assert.equal(m.lead.message, 'Enquiry for Lake View Residency, Gachibowli');
  assert.equal(m.lead.address, 'Gachibowli');
});
