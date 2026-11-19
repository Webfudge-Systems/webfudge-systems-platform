'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { mapFieldData, suggestMapping, sanitizeMapping } = require('../src');

describe('mapFieldData', () => {
  it('maps Meta standard questions using the built-in aliases', () => {
    const result = mapFieldData([
      { name: 'full_name', values: ['Asha Rao Kulkarni'] },
      { name: 'email', values: ['asha@example.com'] },
      { name: 'phone_number', values: ['+919876543210'] },
      { name: 'company_name', values: ['Rao Steels'] },
      { name: 'job_title', values: ['Director'] },
      { name: 'city', values: ['Pune'] },
      { name: 'zip_code', values: ['411001'] },
    ]);
    assert.deepEqual(result.contact, {
      fullName: 'Asha Rao Kulkarni',
      firstName: 'Asha',
      lastName: 'Rao Kulkarni',
      email: 'asha@example.com',
      phone: '+919876543210',
      jobTitle: 'Director',
    });
    assert.deepEqual(result.lead, {
      email: 'asha@example.com',
      phone: '+919876543210',
      companyName: 'Rao Steels',
      city: 'Pune',
      zipCode: '411001',
    });
    assert.deepEqual(result.unmappedAnswers, {});
  });

  it('honours a per-form mapping over the defaults, including custom fields and ignore', () => {
    const result = mapFieldData(
      [
        { name: 'aapka_business', values: ['Kumar Traders'] },
        { name: 'monthly_budget?', values: ['50k-1L'] },
        { name: 'city', values: ['Nagpur'] },
        { name: 'consent', values: ['yes'] },
      ],
      { aapka_business: 'companyName', 'monthly_budget?': 'custom:budget', city: 'notes', consent: 'ignore' }
    );
    assert.equal(result.lead.companyName, 'Kumar Traders');
    assert.deepEqual(result.customFields, { budget: '50k-1L' });
    assert.equal(result.lead.notes, 'Nagpur');
    assert.equal(result.lead.city, undefined);
    assert.deepEqual(result.unmappedAnswers, {});
  });

  it('ignores invalid targets in a stored mapping and falls back to aliases', () => {
    const result = mapFieldData([{ name: 'email', values: ['x@y.in'] }], { email: 'password' });
    assert.equal(result.lead.email, 'x@y.in');
  });

  it('keeps unknown answers in unmappedAnswers and UTM params separately', () => {
    const result = mapFieldData([
      { name: 'full_name', values: ['Ravi'] },
      { name: 'favourite_product', values: ['ERP'] },
      { name: 'utm_campaign', values: ['diwali'] },
    ]);
    assert.deepEqual(result.unmappedAnswers, { favourite_product: 'ERP' });
    assert.deepEqual(result.utm, { utm_campaign: 'diwali' });
    assert.equal(result.contact.firstName, 'Ravi');
    assert.equal(result.contact.lastName, undefined);
  });

  it('joins multi-select answers', () => {
    const result = mapFieldData([{ name: 'services', values: ['SEO', 'Ads'] }], { services: 'notes' });
    assert.equal(result.lead.notes, 'SEO, Ads');
  });

  it('builds fullName from first/last name questions', () => {
    const result = mapFieldData([
      { name: 'first_name', values: ['Meera'] },
      { name: 'last_name', values: ['Iyer'] },
    ]);
    assert.equal(result.contact.fullName, 'Meera Iyer');
  });

  it('never throws on missing/empty field_data', () => {
    assert.doesNotThrow(() => mapFieldData(undefined));
    assert.deepEqual(mapFieldData([]).unmappedAnswers, {});
  });
});

describe('suggestMapping / sanitizeMapping', () => {
  it('suggests targets for form questions', () => {
    assert.deepEqual(
      suggestMapping([{ key: 'full_name' }, { key: 'work_email' }, { key: 'what_do_you_need?' }, { key: 'utm_source' }]),
      { full_name: 'fullName', work_email: 'email', 'what_do_you_need?': 'notes', utm_source: 'ignore' }
    );
  });

  it('drops invalid targets and non-objects', () => {
    assert.deepEqual(sanitizeMapping({ a: 'email', b: 'drop table', c: 'custom:gst_no', d: 'custom:bad key' }), { a: 'email', c: 'custom:gst_no' });
    assert.deepEqual(sanitizeMapping(null), {});
    assert.deepEqual(sanitizeMapping(['email']), {});
  });
});
