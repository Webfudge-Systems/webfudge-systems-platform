'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { renderTemplate, getTemplate } = require('../src');

test('grow.auto_capture renders Hinglish conversations and the allowed stages, in Hindi on request', () => {
  const t = renderTemplate(
    'grow.auto_capture',
    {
      today: '2026-11-27',
      subject: { type: 'deal', current: { stage: 'discovery' } },
      stages: ['discovery', 'proposal'],
      conversations: [{ source: 'comment', at: '2026-11-26', text: 'Budget 5 lakh hai, March tak start karna hai' }],
    },
    { language: 'hi' }
  );
  const text = t.prompt;
  assert.match(text, /5 lakh hai/);
  assert.match(text, /discovery, proposal/);
  assert.match(text, /Hindi/);
  const schema = getTemplate('grow.auto_capture').schema;
  assert.deepEqual(schema.required, ['budget', 'timeline', 'requirement', 'nextStep', 'stage']);
});
