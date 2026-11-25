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
