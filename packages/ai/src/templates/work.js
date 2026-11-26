'use strict';

/** Fudge Work (PM) templates. Connect templates go in ./connect.js when that app starts using AI. */

const { registerTemplate } = require('./index');

registerTemplate({
  key: 'work.task_summary',
  task: 'summarize',
  description: 'Summarizes a task and its comments into status, blockers and next steps.',
  maxTokens: 1500,
  system: [
    'You are Fudge AI inside Fudge Work, a project management app.',
    'Summarize the task for a busy project manager: where it stands, what blocks it and what should happen next.',
    'Use only the facts given.',
  ].join('\n'),
  schema: {
    type: 'object',
    properties: {
      status: { type: 'string', maxLength: 300 },
      blockers: { type: 'array', items: { type: 'string', maxLength: 200 }, maxItems: 5 },
      nextSteps: { type: 'array', items: { type: 'string', maxLength: 200 }, maxItems: 5 },
    },
    required: ['status', 'blockers', 'nextSteps'],
    additionalProperties: false,
  },
  user: ({ task, comments = [] }) =>
    `Task:\n${JSON.stringify(task, null, 2)}\n\nComments (oldest first):\n${comments.map((c) => `- ${c}`).join('\n') || '(none)'}`,
});

// W17 Status Reporter: one call writes the internal and the client version of a project's weekly update.
const statusList = (max = 8) => ({ type: 'array', items: { type: 'string', maxLength: 240 }, maxItems: max });

registerTemplate({
  key: 'work.weekly_status',
  task: 'draft',
  description: "Writes a project's weekly update from real task activity: an internal version and a client version.",
  maxTokens: 3000,
  system: [
    'You are Fudge AI, the Status Reporter teammate inside Fudge Work, a project management app.',
    "Write this week's update for one project from the task activity you are given. Use only those facts: never invent tasks, dates, numbers or people.",
    'Return two versions:',
    '- internal: for the delivery team. Direct and specific. Name tasks and owners, call out blockers, overdue work and risks plainly.',
    '- client: for the client. Warm, professional and short. Talk about outcomes and progress, not internal process. Never mention internal review, hours, rates, budgets, internal names other than the project manager, or tasks marked clientVisible=false when any task is marked clientVisible=true. Put anything you need from the client in needsFromClient.',
    'Lists hold one short line per item. Use an empty list when there is nothing to say. Keep risks to real ones visible in the data (overdue work, blocked or on-hold tasks, no progress, deadlines next week).',
  ].join('\n'),
  schema: {
    type: 'object',
    properties: {
      internal: {
        type: 'object',
        properties: {
          headline: { type: 'string', maxLength: 240 },
          health: { type: 'string', enum: ['on_track', 'at_risk', 'off_track'] },
          done: statusList(),
          inProgress: statusList(),
          blocked: statusList(),
          nextWeek: statusList(),
          risks: statusList(5),
        },
        required: ['headline', 'health', 'done', 'inProgress', 'blocked', 'nextWeek', 'risks'],
        additionalProperties: false,
      },
      client: {
        type: 'object',
        properties: {
          subject: { type: 'string', maxLength: 140 },
          summary: { type: 'string', maxLength: 600 },
          done: statusList(),
          inProgress: statusList(),
          nextWeek: statusList(),
          needsFromClient: statusList(5),
        },
        required: ['subject', 'summary', 'done', 'inProgress', 'nextWeek', 'needsFromClient'],
        additionalProperties: false,
      },
    },
    required: ['internal', 'client'],
    additionalProperties: false,
  },
  user: ({ project, period, activity }) =>
    [
      `Project:\n${JSON.stringify(project, null, 2)}`,
      `Reporting period: ${period.from} to ${period.to} (next week: ${period.nextFrom} to ${period.nextTo}).`,
      `Task activity:\n${JSON.stringify(activity, null, 2)}`,
    ].join('\n\n'),
});
