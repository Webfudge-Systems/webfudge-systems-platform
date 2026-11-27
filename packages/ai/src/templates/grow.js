'use strict';

/** Fudge Grow (CRM) templates. */

const { registerTemplate } = require('./index');

/** Keeps only the lead fields worth showing the model (no ids, no internal relations). */
function leadFacts(lead = {}) {
  const keys = [
    'companyName', 'industry', 'type', 'website', 'email', 'phone', 'city', 'state', 'country',
    'employees', 'founded', 'source', 'status', 'segment', 'dealValue', 'description', 'notes',
    'firstContactedAt', 'nextConnectDate', 'createdAt',
  ];
  const facts = {};
  for (const k of keys) {
    const v = lead[k];
    if (v !== null && v !== undefined && v !== '') facts[k] = v;
  }
  if (Array.isArray(lead.contacts) && lead.contacts.length) {
    facts.contacts = lead.contacts.slice(0, 5).map((c) => ({ name: [c.firstName, c.lastName].filter(Boolean).join(' '), jobTitle: c.jobTitle || undefined, hasEmail: Boolean(c.email), hasPhone: Boolean(c.phone) }));
  }
  if (lead.customFields && typeof lead.customFields === 'object') facts.customFields = lead.customFields;
  return facts;
}

registerTemplate({
  key: 'grow.lead_score',
  task: 'score',
  description: 'Scores one lead 0-100 with reasons (ticket G11 consumer).',
  maxTokens: 1024,
  system: [
    'You are Fudge AI, the sales assistant inside Fudge Grow, a CRM used by small and mid-size businesses in India.',
    'You score how likely a lead is to become a paying customer in the next 90 days, from 0 (no chance) to 100 (ready to buy).',
    'Judge fit and intent from the facts given: completeness of contact details, company size and industry, the source, deal value, engagement and notes.',
    'Missing information lowers confidence, not necessarily the score; say what is missing in the reasons.',
    'Use only the facts provided and the business memory snippets, if any. Do not invent facts.',
    'label: hot for 70-100, warm for 40-69, cold for 0-39.',
    'reasons: 2 to 5 short, specific sentences a salesperson can act on.',
    'nextStep: one concrete action for the salesperson.',
  ].join('\n'),
  schema: {
    type: 'object',
    properties: {
      score: { type: 'integer', minimum: 0, maximum: 100 },
      label: { type: 'string', enum: ['hot', 'warm', 'cold'] },
      reasons: { type: 'array', items: { type: 'string', maxLength: 300 }, minItems: 1, maxItems: 5 },
      nextStep: { type: 'string', maxLength: 300 },
    },
    required: ['score', 'label', 'reasons', 'nextStep'],
    additionalProperties: false,
  },
  user: ({ lead, memory = [], signals = null }) => {
    const parts = [`Lead:\n${JSON.stringify(leadFacts(lead), null, 2)}`];
    if (memory.length) parts.push(`Business memory (notes from this organization):\n${memory.map((m) => `- ${m.text}`).join('\n')}`);
    // G11: deterministic baseline + recent conversation, so the model judges sentiment/intent on top of the rules.
    if (signals?.baseline) {
      const b = signals.baseline;
      parts.push(`Baseline score from rules: ${b.score}/100 (fit ${b.fit}/50, intent ${b.intent}/50).${b.factors?.length ? `\nRule factors:\n${b.factors.map((f) => `- ${f}`).join('\n')}` : ''}`);
    }
    if (signals?.recentActivity?.length) parts.push(`Recent activity, newest first (judge the sentiment and buying intent):\n${signals.recentActivity.map((a) => `- ${a}`).join('\n')}`);
    if (signals?.meetings?.length) parts.push(`Meetings:\n${JSON.stringify(signals.meetings)}`);
    parts.push('Score this lead.');
    return parts.join('\n\n');
  },
});

registerTemplate({
  key: 'grow.followup_email',
  task: 'draft',
  description: 'Drafts a short follow-up email to a lead. Outbound: goes to the approval queue.',
  maxTokens: 1500,
  system: [
    'You are Fudge AI, writing on behalf of a salesperson using Fudge Grow.',
    'Write a short, warm, specific follow-up email. No more than 120 words in the body.',
    'Never promise prices, discounts or dates that are not in the facts. No placeholders like [Name].',
  ].join('\n'),
  schema: {
    type: 'object',
    properties: {
      subject: { type: 'string', maxLength: 150 },
      body: { type: 'string', maxLength: 2000 },
    },
    required: ['subject', 'body'],
    additionalProperties: false,
  },
  user: ({ lead, senderName, goal }) =>
    `Lead:\n${JSON.stringify(leadFacts(lead), null, 2)}\n\nSender: ${senderName || 'the account owner'}\nGoal of the email: ${goal || 'book a short call'}\n\nDraft the email.`,
});

module.exports = { leadFacts };
