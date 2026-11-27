'use strict';

/** Fudge Work smart triage + meeting → tasks (ticket W20). */

const { registerTemplate } = require('./index');

const DATE = { type: ['string', 'null'], description: 'YYYY-MM-DD or null' };
const PRIORITY = { type: 'string', enum: ['low', 'medium', 'high'] };

registerTemplate({
  key: 'work.task_triage',
  task: 'classify',
  description: 'Suggests priority, assignee, list and due date for new or unassigned tasks.',
  maxTokens: 3000,
  system: [
    'You are Fudge AI inside Fudge Work, a project management app. You triage new and unassigned tasks.',
    'For every task suggest: priority (low / medium / high), the best assignee, the task list and a due date.',
    'Pick the assignee from the team only: match the job role and recent work to the task, and prefer people with free capacity (openHours well below capacity).',
    'Pick a list only from the lists of the task\'s project; use null when none fits. Use null for the assignee when nobody fits.',
    'Due dates are YYYY-MM-DD, on or after today, realistic for the priority (high: within 3 working days). Keep an existing due date unless it is in the past.',
    'Tasks requested by a client through the portal deserve a prompt answer. Bugs that block people are high.',
    'Give one short reason per task that names the deciding facts. Use only the facts given.',
  ].join('\n'),
  schema: {
    type: 'object',
    properties: {
      suggestions: {
        type: 'array',
        maxItems: 25,
        items: {
          type: 'object',
          properties: {
            taskId: { type: 'integer' },
            priority: PRIORITY,
            assigneeId: { type: ['integer', 'null'] },
            taskListId: { type: ['integer', 'null'] },
            dueDate: DATE,
            reason: { type: 'string', maxLength: 300 },
          },
          required: ['taskId', 'priority', 'assigneeId', 'taskListId', 'dueDate', 'reason'],
          additionalProperties: false,
        },
      },
    },
    required: ['suggestions'],
    additionalProperties: false,
  },
  user: ({ today, tasks = [], team = [], lists = [] }) =>
    [
      `Today: ${today}`,
      `Tasks to triage:\n${JSON.stringify(tasks, null, 2)}`,
      `Team (capacity and openHours are hours per week):\n${JSON.stringify(team, null, 2)}`,
      `Task lists:\n${JSON.stringify(lists, null, 2)}`,
    ].join('\n\n'),
});

registerTemplate({
  key: 'work.meeting_action_items',
  task: 'extract',
  description: 'Extracts action items with owner and due date from meeting notes or a transcript.',
  maxTokens: 3000,
  system: [
    'You are Fudge AI inside Fudge Work, a project management app.',
    'Read the meeting notes or transcript and list the concrete action items: things someone agreed or was asked to do.',
    'Skip decisions, discussion and status updates that need no follow-up. Merge duplicates.',
    'Title: a short imperative task name. Description: one or two sentences of context from the meeting, or an empty string.',
    'Owner: the person\'s name exactly as it appears in the notes, or null when nobody was named. Prefer names that match the team list.',
    'Due date: YYYY-MM-DD resolved against the meeting date ("Friday", "next week", "by the 5th"), or null when none was said.',
    'Priority: high only when the notes say it is urgent or blocking; otherwise medium, or low for nice-to-haves.',
    'Use only what the notes say.',
  ].join('\n'),
  schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        maxItems: 30,
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', maxLength: 200 },
            description: { type: 'string', maxLength: 600 },
            owner: { type: ['string', 'null'] },
            dueDate: DATE,
            priority: PRIORITY,
          },
          required: ['title', 'description', 'owner', 'dueDate', 'priority'],
          additionalProperties: false,
        },
      },
    },
    required: ['items'],
    additionalProperties: false,
  },
  user: ({ meeting = {}, team = [], notes = '' }) =>
    [
      `Meeting: ${meeting.title || 'Untitled'} on ${meeting.date || 'unknown date'}`,
      `Team: ${team.map((m) => m.name).join(', ') || '(none)'}`,
      `Notes / transcript:\n"""\n${notes}\n"""`,
    ].join('\n\n'),
});
