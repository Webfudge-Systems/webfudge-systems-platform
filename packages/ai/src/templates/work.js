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

// W16 AI project planner: brief / SOW → phases, tasks, owners by role, estimates, dependencies.
// The backend (apps/backend/src/utils/ai/work-planner.js) normalizes the answer (unique refs, no
// dependency loops, dates recomputed from dependencies) before a person edits it in a preview.
const PLAN_TASK_TYPES = ['task', 'deliverable', 'milestone', 'bug'];

registerTemplate({
  key: 'work.project_plan',
  task: 'plan',
  description: 'Turns a project brief or statement of work into phases, tasks, roles, estimates and dependencies.',
  maxTokens: 10000,
  system: [
    'You are Fudge AI inside Fudge Work, a project management app used by agencies and service businesses in India.',
    'You turn a client brief or statement of work (SOW) into a delivery plan that a project manager will review and edit before creating the project.',
    '',
    'Rules:',
    '- Split the work into 2 to 8 phases in delivery order. Each phase has 1 to 15 concrete tasks a person can pick up.',
    '- Every task has a short ref ("T1", "T2", ...) unique across the whole plan.',
    '- role: the job title of the person who should own the task, e.g. Project manager, Designer, Developer, Copywriter, Performance marketer, Videographer, Video editor, Account manager, QA engineer, SEO specialist. Reuse the same spelling for the same role.',
    '- type: "milestone" for sign-offs, approvals and go-lives (estimateHours 0, durationDays 0); "deliverable" for something handed to the client; otherwise "task".',
    '- estimateHours: realistic effort in hours for one person (0 to 400). durationDays: calendar working days the task spans (0 to 120).',
    '- startDay: working days after the project start when the task can begin. dependsOn: refs of tasks that must finish first. A task may only depend on tasks listed before it. Do not add a dependency that is already implied by another.',
    '- Include client review and approval steps where the scope implies them, and a kickoff at the start.',
    '- Cover everything in scope. Put anything unclear or missing in assumptions, and delivery risks in risks. Do not invent budgets or dates the brief does not give.',
    '- Use only the facts given; keep names short (under 80 characters).',
    '',
    'House style: these are the built-in templates the team already uses. Follow their granularity when the work is similar.',
    '- Website build: Discovery (kickoff, assets, sitemap, sign-off) → Design (wireframes, homepage, inner pages, copy, approval) → Development (hosting/CMS, build pages, forms/analytics/SEO) → QA & Launch (QA, client review, go live, handover).',
    '- Ad campaign: Planning (brief, research, media plan) → Creative (copy, creatives, approval) → Launch (tracking, build campaigns, live) → Optimise & Report.',
    '- Video production: Pre-production (brief, script, storyboard, schedule, approval) → Production (shoot) → Post-production (rough cut, feedback, finishing, final delivery).',
    '- Client onboarding: Welcome (welcome email, logins, kickoff) → Setup (folders, audit, 30-60-90 plan, sign-off).',
  ].join('\n'),
  schema: {
    type: 'object',
    properties: {
      projectName: { type: 'string', maxLength: 120 },
      summary: { type: 'string', maxLength: 800 },
      phases: {
        type: 'array',
        minItems: 1,
        maxItems: 12,
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', maxLength: 120 },
            tasks: {
              type: 'array',
              minItems: 1,
              maxItems: 25,
              items: {
                type: 'object',
                properties: {
                  ref: { type: 'string', maxLength: 12 },
                  name: { type: 'string', maxLength: 160 },
                  description: { type: 'string', maxLength: 600 },
                  role: { type: 'string', maxLength: 60 },
                  type: { type: 'string', enum: PLAN_TASK_TYPES },
                  estimateHours: { type: 'number', minimum: 0, maximum: 2000 },
                  startDay: { type: 'integer', minimum: 0, maximum: 2000 },
                  durationDays: { type: 'integer', minimum: 0, maximum: 365 },
                  dependsOn: { type: 'array', items: { type: 'string', maxLength: 12 }, maxItems: 10 },
                },
                required: ['ref', 'name', 'description', 'role', 'type', 'estimateHours', 'startDay', 'durationDays', 'dependsOn'],
                additionalProperties: false,
              },
            },
          },
          required: ['name', 'tasks'],
          additionalProperties: false,
        },
      },
      assumptions: { type: 'array', items: { type: 'string', maxLength: 300 }, maxItems: 10 },
      risks: { type: 'array', items: { type: 'string', maxLength: 300 }, maxItems: 10 },
    },
    required: ['projectName', 'summary', 'phases', 'assumptions', 'risks'],
    additionalProperties: false,
  },
  user: ({ brief = '', deal = null, proposals = [], hasDocument = false, startDate = null }) => {
    const parts = [];
    if (startDate) parts.push(`Project start date: ${startDate}`);
    if (deal) parts.push(`Won deal:\n${JSON.stringify(deal, null, 2)}`);
    if (proposals.length) parts.push(`Proposals / SOW linked to the deal:\n${JSON.stringify(proposals, null, 2)}`);
    if (hasDocument) parts.push('The attached document is the statement of work. Plan everything it puts in scope.');
    if (brief) parts.push(`Brief from the project manager:\n${brief}`);
    if (!parts.length) parts.push('(no brief given)');
    return `${parts.join('\n\n')}\n\nPropose the delivery plan.`;
  },
});
