'use strict';

/**
 * Fudge Work templates for ticket W19: risk radar explanation, scope-creep check and change orders.
 * Kept apart from ./work.js so parallel Work AI tickets do not edit the same file.
 */

const { registerTemplate } = require('./index');

const MAX_SOW_CHARS = 60000;

registerTemplate({
  key: 'work.risk_explain',
  task: 'summarize',
  description: 'Explains a project risk radar (computed deterministically) and recommends what to do.',
  maxTokens: 1500,
  system: [
    'You are Fudge AI inside Fudge Work, a project management app used by agencies.',
    'You are given a risk radar that was computed from sprint velocity, task dependencies, team capacity and due dates.',
    'Explain to the project manager, in plain words, why the project is or is not at risk of missing its deadline,',
    'and recommend at most five concrete actions (for example: reassign a task, unblock a chain, cut or move scope, talk to the client).',
    'Use only the facts given. Do not invent people, tasks or dates. Keep it short.',
  ].join('\n'),
  schema: {
    type: 'object',
    properties: {
      headline: { type: 'string', maxLength: 160 },
      explanation: { type: 'string', maxLength: 900 },
      actions: {
        type: 'array',
        maxItems: 5,
        items: {
          type: 'object',
          properties: { title: { type: 'string', maxLength: 140 }, why: { type: 'string', maxLength: 300 } },
          required: ['title', 'why'],
          additionalProperties: false,
        },
      },
    },
    required: ['headline', 'explanation', 'actions'],
    additionalProperties: false,
  },
  user: ({ radar, today }) => `Today: ${today}\n\nRisk radar:\n${JSON.stringify(radar, null, 2)}`,
});

registerTemplate({
  key: 'work.scope_check',
  task: 'classify',
  description: 'Compares client requests with the statement of work (SOW) and flags out-of-scope work.',
  maxTokens: 2500,
  system: [
    'You are Fudge AI inside Fudge Work. You protect agencies from scope creep.',
    'You are given a statement of work (SOW) for a client project and a list of requests the client made.',
    'For each request decide:',
    '- in_scope: the SOW clearly covers it (including revisions or support the SOW allows),',
    '- out_of_scope: it asks for work, deliverables, quantities, channels or rounds the SOW does not cover,',
    '- unclear: the SOW is silent or ambiguous and a person should decide.',
    'Quote or name the SOW clause you relied on in sowReference (empty string when nothing relevant).',
    'For out_of_scope requests give a rough effort estimate in hours. Be conservative: only flag out_of_scope when the SOW gives a reason to.',
  ].join('\n'),
  schema: {
    type: 'object',
    properties: {
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            requestId: { type: 'string' },
            verdict: { type: 'string', enum: ['in_scope', 'out_of_scope', 'unclear'] },
            confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
            reason: { type: 'string', maxLength: 400 },
            sowReference: { type: 'string', maxLength: 300 },
            estimateHours: { type: 'number' },
          },
          required: ['requestId', 'verdict', 'confidence', 'reason', 'sowReference', 'estimateHours'],
          additionalProperties: false,
        },
      },
    },
    required: ['results'],
    additionalProperties: false,
  },
  user: ({ project, sowText, requests }) =>
    [
      `Project: ${project?.name || ''}${project?.client ? ` (client: ${project.client})` : ''}`,
      sowText ? `Statement of work:\n"""\n${String(sowText).slice(0, MAX_SOW_CHARS)}\n"""` : 'Statement of work: see the attached document.',
      `Client requests (JSON):\n${JSON.stringify(requests, null, 2)}`,
    ].join('\n\n'),
});

registerTemplate({
  key: 'work.change_order',
  task: 'draft',
  description: 'Drafts a change order email for an out-of-scope client request.',
  maxTokens: 1500,
  system: [
    'You are Fudge AI inside Fudge Work. Draft a short, friendly and professional change order email from an agency to its client.',
    'The client asked for work that is outside the agreed statement of work.',
    'The email must: thank them for the request, explain briefly that it is outside the current scope (cite the SOW point if given),',
    'describe the additional work, give the estimated effort (and cost when an hourly rate is given), state the impact on the timeline if any,',
    'and ask the client to approve the change order before the team starts. No legal language, no made-up numbers.',
  ].join('\n'),
  schema: {
    type: 'object',
    properties: {
      subject: { type: 'string', maxLength: 160 },
      body: { type: 'string', maxLength: 3000 },
      title: { type: 'string', maxLength: 140 },
      estimateHours: { type: 'number' },
    },
    required: ['subject', 'body', 'title', 'estimateHours'],
    additionalProperties: false,
  },
  user: ({ project, request, check, rate, senderName }) =>
    [
      `Project: ${project?.name || ''}${project?.client ? ` for ${project.client}` : ''}`,
      `Client request:\n${JSON.stringify(request, null, 2)}`,
      `Why it is out of scope: ${check?.reason || ''}${check?.sowReference ? `\nSOW reference: ${check.sowReference}` : ''}`,
      `Estimated effort: ${check?.estimateHours || 'unknown'} hours`,
      rate ? `Hourly rate: ${rate.amount} ${rate.currency}` : 'Hourly rate: not given (do not quote a price)',
      `Sign the email as: ${senderName || 'The project team'}`,
    ].join('\n\n'),
});

module.exports = { MAX_SOW_CHARS };
