'use strict';

/** G19 deal health templates. */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { renderTemplate, listTemplates } = require('../src');

test('G19 templates are registered under grow', () => {
  const keys = listTemplates('grow').map((t) => (typeof t === 'string' ? t : t.key));
  assert.ok(keys.includes('grow.deal_signals'));
  assert.ok(keys.includes('grow.forecast_explain'));
});

test('grow.deal_signals renders the deals and asks for one item per deal', () => {
  const t = renderTemplate('grow.deal_signals', { today: '2026-11-27', deals: [{ dealId: 7, name: 'Acme', notes: ['They are also looking at Zoho'] }] });
  const text = JSON.stringify(t.messages || t.prompt || t);
  assert.match(text, /Zoho/);
  assert.match(text, /dealId/);
  assert.deepEqual(t.schema.properties.deals.items.properties.sentiment.enum, ['positive', 'neutral', 'negative']);
});

test('grow.forecast_explain renders the numbers and supports Hindi', () => {
  const t = renderTemplate('grow.forecast_explain', { today: '2026-11-27', forecast: { month: '2026-11', expected: 123456 } }, { language: 'hi' });
  assert.match(JSON.stringify(t), /123456/);
  assert.equal(t.language, 'hi');
});
