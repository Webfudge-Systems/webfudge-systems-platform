'use strict';

/** W21 Ask Work: question → read-only tool calls → answer from the tool results only. */

const { registerTemplate } = require('./index');

const text = { type: 'string', maxLength: 80 };
const date = { type: 'string', maxLength: 10 };

registerTemplate({
  key: 'work.ask_plan',
  task: 'extract',
  description: 'Turns a question about work into up to three read-only tool calls.',
  maxTokens: 800,
  system: [
    'You are Fudge AI inside Fudge Work, a project management app.',
    'Decide which read-only tools answer the user question. You cannot read data any other way.',
    'Tools:',
    '- find_tasks: tasks the user can see. args: status (open | overdue | completed | any), project, client, assignee ("me" or a person name), priority (low | medium | high), text, dueFrom, dueTo, completedFrom, completedTo (YYYY-MM-DD), limit (1-25).',
    '- find_projects: projects the user can see. args: query, client, limit.',
    'Resolve relative dates ("this week" = Monday of the current week to today) using the date given.',
    '"What did X finish" means find_tasks with status completed, assignee X and a completedFrom/completedTo range.',
    'Use at most 3 calls. Return no calls if the question is not about work in this app.',
  ].join('\n'),
  schema: {
    type: 'object',
    properties: {
      calls: {
        type: 'array',
        maxItems: 3,
        items: {
          type: 'object',
          properties: {
            tool: { type: 'string', enum: ['find_tasks', 'find_projects'] },
            args: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['open', 'overdue', 'completed', 'any'] },
                project: text,
                client: text,
                assignee: text,
                priority: { type: 'string', enum: ['low', 'medium', 'high'] },
                text,
                query: text,
                dueFrom: date,
                dueTo: date,
                completedFrom: date,
                completedTo: date,
                limit: { type: 'integer' },
              },
              additionalProperties: false,
            },
          },
          required: ['tool', 'args'],
          additionalProperties: false,
        },
      },
    },
    required: ['calls'],
    additionalProperties: false,
  },
  user: ({ question, today, me, history = [] }) =>
    [
      `Today: ${today} (${new Date(`${today}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })}). The user is ${me}.`,
      history.length ? `Earlier in this chat:\n${history.map((h) => `Q: ${h.q}\nA: ${h.a}`).join('\n')}` : '',
      `Question: ${question}`,
    ]
      .filter(Boolean)
      .join('\n\n'),
});

registerTemplate({
  key: 'work.ask_answer',
  task: 'summarize',
  description: 'Answers a work question from tool results only.',
  maxTokens: 1200,
  system: [
    'You are Fudge AI inside Fudge Work, a project management app.',
    'Answer the question using only the tool results given. Never invent tasks, people, dates or numbers.',
    'If the results are empty or a tool says not_allowed, say you found nothing you can show, briefly.',
    'Be short: one or two sentences, then the key items. List task ids you mention in taskIds.',
  ].join('\n'),
  schema: {
    type: 'object',
    properties: {
      answer: { type: 'string', maxLength: 1500 },
      taskIds: { type: 'array', items: { type: 'integer' }, maxItems: 25 },
    },
    required: ['answer', 'taskIds'],
    additionalProperties: false,
  },
  user: ({ question, today, me, results = [] }) =>
    `Today: ${today}. The user is ${me}.\n\nQuestion: ${question}\n\nTool results:\n${JSON.stringify(results, null, 1)}`,
});
