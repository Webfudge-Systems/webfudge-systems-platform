'use strict';

/**
 * Fudge Grow templates for ticket G19: deal health signals from notes, the daily "what to say" line,
 * and the forecast explanation. Kept apart from ./grow.js so parallel Grow AI tickets do not edit the same file.
 */

const { registerTemplate } = require('./index');

registerTemplate({
  key: 'grow.deal_signals',
  task: 'classify',
  description: 'Reads recent notes on open deals: competitor mentioned, tone, and one line on what the rep should say next.',
  maxTokens: 2500,
  system: [
    'You are Fudge AI inside Fudge Grow, a CRM used by sales teams.',
    'For each deal you get its stage, value, the health reasons computed by the system, and its most recent notes and comments.',
    'For each deal return:',
    '- competitor: the name of a competing vendor or product the buyer mentioned in the notes, or an empty string. Only use names that appear in the notes.',
    '- sentiment: the buyer\'s tone in the notes: positive, neutral or negative (neutral when there are no notes).',
    '- evidence: a short quote or paraphrase (max 120 characters) that supports the competitor or sentiment, or an empty string.',
    '- whatToSay: one or two sentences the rep can say on today\'s call, addressing the biggest risk. Concrete, polite, no made-up facts.',
    'Return one item per deal, with the same dealId.',
  ].join('\n'),
  schema: {
    type: 'object',
    properties: {
      deals: {
        type: 'array',
        maxItems: 25,
        items: {
          type: 'object',
          properties: {
            dealId: { type: 'integer' },
            competitor: { type: 'string', maxLength: 80 },
            sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
            evidence: { type: 'string', maxLength: 160 },
            whatToSay: { type: 'string', maxLength: 300 },
          },
          required: ['dealId', 'competitor', 'sentiment', 'evidence', 'whatToSay'],
          additionalProperties: false,
        },
      },
    },
    required: ['deals'],
    additionalProperties: false,
  },
  user: ({ deals, today }) => `Today: ${today}\n\nDeals:\n${JSON.stringify(deals, null, 2)}`,
});

registerTemplate({
  key: 'grow.forecast_explain',
  task: 'summarize',
  description: 'Explains a revenue forecast (computed deterministically) in plain words.',
  maxTokens: 1200,
  system: [
    'You are Fudge AI inside Fudge Grow, a CRM. You are given a monthly revenue forecast that was computed from',
    'the open pipeline weighted by the team\'s historical stage win rates, with an 80% confidence range.',
    'Explain to the sales manager in plain words what the number means, what drives it and the biggest risks to it,',
    'and name at most three deals to focus on. Use only the numbers and deals given. Do not change or invent numbers.',
  ].join('\n'),
  schema: {
    type: 'object',
    properties: {
      headline: { type: 'string', maxLength: 160 },
      explanation: { type: 'string', maxLength: 900 },
      focus: { type: 'array', maxItems: 3, items: { type: 'string', maxLength: 200 } },
    },
    required: ['headline', 'explanation', 'focus'],
    additionalProperties: false,
  },
  user: ({ forecast, currency, today }) => `Today: ${today}\nCurrency: ${currency || 'INR'}\n\nForecast:\n${JSON.stringify(forecast, null, 2)}`,
});
