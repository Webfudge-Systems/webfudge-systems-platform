'use strict';

/** Fudge Grow AI auto-capture (ticket G10): deal facts from conversations. */

const { registerTemplate } = require('./index');

const EVIDENCE = { type: ['string', 'null'], maxLength: 300, description: 'Short quote from the conversation, in its original language, or null' };

registerTemplate({
  key: 'grow.auto_capture',
  task: 'extract',
  description: 'Extracts budget, timeline, requirement, next step and stage change from CRM conversations.',
  maxTokens: 1500,
  system: [
    'You are Fudge AI inside Fudge Grow, a CRM used by Indian sales teams. You read a lead\'s or deal\'s recent conversations',
    '(comments, call and meeting notes, emails). They can be in English, Hindi, or Hinglish (Hindi in Latin script) mixed freely.',
    'Extract only facts the customer or the rep actually stated. Never guess. Use null for anything not stated.',
    '- budget: the amount the customer can spend, as a plain number in the stated currency (e.g. "5 lakh" = 500000, "2 crore" = 20000000, "50k" = 50000). currency is an ISO code (INR when rupees, lakh or crore are used).',
    '- timeline: when the customer wants to start or decide. text is a short phrase; date is YYYY-MM-DD on or after today when a date can be worked out, else null.',
    '- requirement: what the customer needs, one or two sentences.',
    '- nextStep: the next action the rep should take, as a short task title starting with a verb, with a due date (YYYY-MM-DD, on or after today) when one was agreed, else null.',
    '- stage: a new stage only when the conversation clearly moves the record forward or back, chosen from the allowed stages; else null. Never repeat the current stage.',
    'Newer conversations win over older ones. evidence quotes the words you relied on.',
  ].join('\n'),
  schema: {
    type: 'object',
    properties: {
      budget: {
        type: 'object',
        properties: { amount: { type: ['number', 'null'] }, currency: { type: ['string', 'null'] }, evidence: EVIDENCE },
        required: ['amount', 'currency', 'evidence'],
        additionalProperties: false,
      },
      timeline: {
        type: 'object',
        properties: { text: { type: ['string', 'null'], maxLength: 120 }, date: { type: ['string', 'null'] }, evidence: EVIDENCE },
        required: ['text', 'date', 'evidence'],
        additionalProperties: false,
      },
      requirement: {
        type: 'object',
        properties: { text: { type: ['string', 'null'], maxLength: 600 }, evidence: EVIDENCE },
        required: ['text', 'evidence'],
        additionalProperties: false,
      },
      nextStep: {
        type: 'object',
        properties: { title: { type: ['string', 'null'], maxLength: 160 }, dueDate: { type: ['string', 'null'] }, evidence: EVIDENCE },
        required: ['title', 'dueDate', 'evidence'],
        additionalProperties: false,
      },
      stage: {
        type: 'object',
        properties: { value: { type: ['string', 'null'] }, evidence: EVIDENCE },
        required: ['value', 'evidence'],
        additionalProperties: false,
      },
    },
    required: ['budget', 'timeline', 'requirement', 'nextStep', 'stage'],
    additionalProperties: false,
  },
  user: ({ today, subject = {}, stages = [], conversations = [] }) =>
    [
      `Today: ${today}`,
      `Record (${subject.type || 'lead'}): ${JSON.stringify(subject.current || {})}`,
      `Allowed stages: ${stages.join(', ') || '(none)'}`,
      `Conversations, oldest first:\n"""\n${conversations.map((c) => `[${c.at || ''}] (${c.source}) ${c.text}`).join('\n---\n')}\n"""`,
    ].join('\n\n'),
});
