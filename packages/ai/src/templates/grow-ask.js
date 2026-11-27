'use strict';

/**
 * G20 Ask Grow + Draft anything (Fudge Grow).
 *   grow.ask_filter    question → one whitelisted lead filter (the backend runs it; the model never queries)
 *   grow.draft_message record facts + org brand tone → email / follow-up / proposal intro draft
 */

const { registerTemplate } = require('./index');

const text = (n) => ({ type: 'string', maxLength: n });

registerTemplate({
  key: 'grow.ask_filter',
  task: 'extract',
  description: 'Turns a plain-language question about leads into one whitelisted lead filter.',
  maxTokens: 600,
  system: [
    'You are Fudge AI inside Fudge Grow, a CRM. Turn the user question into ONE filter over the leads list.',
    'Fields (all optional, combined with AND):',
    '- city: city / area name. - source: lead source code (META_ADS, GOOGLE_ADS, WEBSITE, REFERRAL, SOCIAL_MEDIA, EMAIL_CAMPAIGN, COLD_CALL, TRADE_SHOW, PARTNER, INDIAMART, JUSTDIAL, OTHER). "Meta", "Facebook" or "Instagram" = META_ADS.',
    '- status: pipeline status code (NEW, CONTACTED, QUALIFIED, LOST, CONVERTED or an org status given below).',
    '- owner: "me" or a person name. - industry, text (words in the company name).',
    '- period: today | yesterday | this_week | last_week | this_month | last_month | last_7_days | last_30_days (when the lead was created). Or createdFrom / createdTo as YYYY-MM-DD.',
    '- scoreMin / scoreMax: lead score 0-100, inclusive ("score > 70" means scoreMin 71).',
    '- notContacted: true when the user asks for leads nobody called / contacted / followed up.',
    'Leave out anything the question does not ask for. Never invent values. explanation: one short sentence.',
  ].join('\n'),
  schema: {
    type: 'object',
    properties: {
      filter: {
        type: 'object',
        properties: {
          city: text(60),
          source: text(40),
          status: text(30),
          owner: text(80),
          industry: text(60),
          text: text(80),
          period: { type: 'string', enum: ['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month', 'last_7_days', 'last_30_days'] },
          createdFrom: text(10),
          createdTo: text(10),
          scoreMin: { type: 'integer' },
          scoreMax: { type: 'integer' },
          notContacted: { type: 'boolean' },
        },
        additionalProperties: false,
      },
      explanation: text(300),
    },
    required: ['filter'],
    additionalProperties: false,
  },
  user: ({ question, today, statuses }) =>
    `Today: ${today}\nOrg statuses: ${(statuses || []).join(', ') || 'default'}\n\nQuestion: """${question}"""\n\nReturn the filter.`,
});

const KIND_GOALS = {
  email: 'a short email that moves the conversation forward',
  followup: 'a follow-up after the last touch, asking for a clear next step',
  proposal_intro: 'an introduction for a proposal: the problem, how we help, and the next step',
};

registerTemplate({
  key: 'grow.draft_message',
  task: 'draft',
  description: 'Drafts an email / follow-up / proposal intro from a CRM record in the org brand tone. Returned to the user, never sent.',
  maxTokens: 1500,
  system: [
    'You are Fudge AI, writing on behalf of a salesperson using Fudge Grow.',
    'Write in the brand tone given. Be specific to the record facts. Body under 160 words.',
    'Never promise prices, discounts or dates that are not in the facts. No placeholders like [Name].',
  ].join('\n'),
  schema: {
    type: 'object',
    properties: { subject: text(150), body: text(3000) },
    required: ['subject', 'body'],
    additionalProperties: false,
  },
  user: ({ kind, recordType, facts, brandTone, senderName, instructions }) =>
    [
      `Write ${KIND_GOALS[kind] || KIND_GOALS.email}.`,
      `Brand tone: ${brandTone || 'friendly, professional, concise'}`,
      `Sender: ${senderName || 'the account owner'}`,
      `${recordType} facts:\n${JSON.stringify(facts, null, 2)}`,
      instructions ? `Extra instructions from the sender: """${instructions}"""` : '',
    ]
      .filter(Boolean)
      .join('\n\n'),
});

module.exports = { KIND_GOALS };
