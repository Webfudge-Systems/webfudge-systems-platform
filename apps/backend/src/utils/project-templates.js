'use strict';

/**
 * Built-in project templates (ticket W4). Each template has phases; each phase becomes a parent task
 * and its tasks become subtasks. Dates are relative to the project start:
 *   start = projectStart + startDay, due = start + days.
 * `role` maps to an assignee chosen when the project is created (projectManager → the project manager).
 * Also used by Grow G23 (won deal → project from template).
 */

const TASK_TYPES = ['task', 'bug', 'deliverable', 'milestone'];

const ROLES = {
  projectManager: 'Project manager',
  designer: 'Designer',
  developer: 'Developer',
  copywriter: 'Copywriter',
  marketer: 'Performance marketer',
  videographer: 'Videographer',
  editor: 'Video editor',
  accountManager: 'Account manager',
};

const TEMPLATES = [
  {
    key: 'website-build',
    name: 'Website build',
    description: 'Discovery to launch for a marketing or business website.',
    roles: ['projectManager', 'designer', 'developer', 'copywriter'],
    phases: [
      {
        name: 'Discovery',
        tasks: [
          { name: 'Kickoff call with client', startDay: 0, days: 1, role: 'projectManager', type: 'task' },
          { name: 'Collect brand assets and logins', startDay: 1, days: 3, role: 'projectManager', type: 'task' },
          { name: 'Sitemap and page list', startDay: 2, days: 3, role: 'designer', type: 'deliverable' },
          { name: 'Discovery sign-off', startDay: 5, days: 0, role: 'projectManager', type: 'milestone' },
        ],
      },
      {
        name: 'Design',
        tasks: [
          { name: 'Wireframes', startDay: 6, days: 4, role: 'designer', type: 'deliverable' },
          { name: 'Homepage design', startDay: 10, days: 4, role: 'designer', type: 'deliverable' },
          { name: 'Inner page designs', startDay: 14, days: 5, role: 'designer', type: 'deliverable' },
          { name: 'Website copy', startDay: 8, days: 8, role: 'copywriter', type: 'deliverable' },
          { name: 'Design approval', startDay: 19, days: 0, role: 'projectManager', type: 'milestone' },
        ],
      },
      {
        name: 'Development',
        tasks: [
          { name: 'Set up hosting, domain and CMS', startDay: 19, days: 2, role: 'developer', type: 'task' },
          { name: 'Build pages', startDay: 21, days: 8, role: 'developer', type: 'task' },
          { name: 'Forms, analytics and SEO basics', startDay: 27, days: 3, role: 'developer', type: 'task' },
        ],
      },
      {
        name: 'QA & Launch',
        tasks: [
          { name: 'Cross-browser and mobile QA', startDay: 30, days: 3, role: 'developer', type: 'task' },
          { name: 'Client review round', startDay: 32, days: 3, role: 'projectManager', type: 'task' },
          { name: 'Go live', startDay: 35, days: 0, role: 'developer', type: 'milestone' },
          { name: 'Handover and training', startDay: 36, days: 2, role: 'projectManager', type: 'deliverable' },
        ],
      },
    ],
  },
  {
    key: 'ad-campaign',
    name: 'Ad campaign',
    description: 'Plan, produce and launch a paid ads campaign with a first optimisation cycle.',
    roles: ['projectManager', 'marketer', 'designer', 'copywriter'],
    phases: [
      {
        name: 'Planning',
        tasks: [
          { name: 'Campaign brief and goals', startDay: 0, days: 2, role: 'projectManager', type: 'deliverable' },
          { name: 'Audience and keyword research', startDay: 1, days: 3, role: 'marketer', type: 'task' },
          { name: 'Media plan and budget split', startDay: 3, days: 2, role: 'marketer', type: 'deliverable' },
        ],
      },
      {
        name: 'Creative',
        tasks: [
          { name: 'Ad copy variants', startDay: 5, days: 3, role: 'copywriter', type: 'deliverable' },
          { name: 'Static and video creatives', startDay: 5, days: 5, role: 'designer', type: 'deliverable' },
          { name: 'Creative approval', startDay: 10, days: 0, role: 'projectManager', type: 'milestone' },
        ],
      },
      {
        name: 'Launch',
        tasks: [
          { name: 'Pixel, conversion and UTM setup', startDay: 8, days: 2, role: 'marketer', type: 'task' },
          { name: 'Build campaigns and ad sets', startDay: 10, days: 2, role: 'marketer', type: 'task' },
          { name: 'Campaign live', startDay: 12, days: 0, role: 'marketer', type: 'milestone' },
        ],
      },
      {
        name: 'Optimise & Report',
        tasks: [
          { name: 'Week 1 optimisation', startDay: 13, days: 7, role: 'marketer', type: 'task' },
          { name: 'Performance report', startDay: 20, days: 2, role: 'marketer', type: 'deliverable' },
        ],
      },
    ],
  },
  {
    key: 'video-production',
    name: 'Video production',
    description: 'Script to final delivery for a brand or product video.',
    roles: ['projectManager', 'copywriter', 'videographer', 'editor'],
    phases: [
      {
        name: 'Pre-production',
        tasks: [
          { name: 'Creative brief', startDay: 0, days: 2, role: 'projectManager', type: 'deliverable' },
          { name: 'Script', startDay: 2, days: 4, role: 'copywriter', type: 'deliverable' },
          { name: 'Storyboard and shot list', startDay: 5, days: 3, role: 'videographer', type: 'deliverable' },
          { name: 'Locations, cast and schedule', startDay: 6, days: 4, role: 'projectManager', type: 'task' },
          { name: 'Script approval', startDay: 8, days: 0, role: 'projectManager', type: 'milestone' },
        ],
      },
      {
        name: 'Production',
        tasks: [{ name: 'Shoot day', startDay: 11, days: 1, role: 'videographer', type: 'task' }],
      },
      {
        name: 'Post-production',
        tasks: [
          { name: 'Rough cut', startDay: 12, days: 4, role: 'editor', type: 'deliverable' },
          { name: 'Client feedback round', startDay: 16, days: 2, role: 'projectManager', type: 'task' },
          { name: 'Colour, sound and graphics', startDay: 18, days: 4, role: 'editor', type: 'task' },
          { name: 'Final delivery', startDay: 22, days: 1, role: 'editor', type: 'milestone' },
        ],
      },
    ],
  },
  {
    key: 'client-onboarding',
    name: 'Client onboarding',
    description: 'First two weeks with a new retainer client.',
    roles: ['accountManager', 'projectManager'],
    phases: [
      {
        name: 'Welcome',
        tasks: [
          { name: 'Send welcome email and agreement', startDay: 0, days: 1, role: 'accountManager', type: 'task' },
          { name: 'Collect logins and assets', startDay: 1, days: 3, role: 'accountManager', type: 'task' },
          { name: 'Kickoff meeting', startDay: 3, days: 1, role: 'projectManager', type: 'milestone' },
        ],
      },
      {
        name: 'Setup',
        tasks: [
          { name: 'Create shared folders and channels', startDay: 4, days: 1, role: 'projectManager', type: 'task' },
          { name: 'Audit current marketing and tools', startDay: 4, days: 4, role: 'projectManager', type: 'deliverable' },
          { name: '30-60-90 day plan', startDay: 8, days: 3, role: 'accountManager', type: 'deliverable' },
          { name: 'Plan sign-off', startDay: 12, days: 0, role: 'accountManager', type: 'milestone' },
        ],
      },
    ],
  },
];

function addDays(date, days) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Template list for the UI (no internals). */
function listTemplates() {
  return TEMPLATES.map((t) => {
    const tasks = t.phases.flatMap((p) => p.tasks);
    const lastDay = Math.max(...tasks.map((x) => x.startDay + x.days));
    return {
      key: t.key,
      name: t.name,
      description: t.description,
      durationDays: lastDay,
      roles: t.roles.map((key) => ({ key, label: ROLES[key] || key })),
      phases: t.phases.map((p) => ({ name: p.name, taskCount: p.tasks.length })),
      taskCount: tasks.length,
    };
  });
}

function getTemplate(key) {
  return TEMPLATES.find((t) => t.key === key) || null;
}

/**
 * Build the task rows for a template (pure; no DB). Dates are ISO strings.
 * @returns {{ endDate: string, phases: Array<{ name, startDate, scheduledDate, tasks: Array<{ name, taskType, role, startDate, scheduledDate }> }> }}
 */
function planTemplate(template, startDateIso) {
  const start = new Date(`${String(startDateIso).slice(0, 10)}T09:00:00.000Z`);
  let lastEnd = start;
  const phases = template.phases.map((p) => {
    const tasks = p.tasks.map((t) => {
      const s = addDays(start, t.startDay);
      const e = addDays(s, t.days);
      if (e > lastEnd) lastEnd = e;
      return {
        name: t.name,
        taskType: TASK_TYPES.includes(t.type) ? t.type : 'task',
        role: t.role,
        roleLabel: ROLES[t.role] || t.role,
        startDate: s.toISOString(),
        scheduledDate: e.toISOString(),
      };
    });
    const pStart = new Date(Math.min(...tasks.map((t) => Date.parse(t.startDate))));
    const pEnd = new Date(Math.max(...tasks.map((t) => Date.parse(t.scheduledDate))));
    return { name: p.name, startDate: pStart.toISOString(), scheduledDate: pEnd.toISOString(), tasks };
  });
  return { endDate: lastEnd.toISOString(), phases };
}

module.exports = { TASK_TYPES, ROLES, listTemplates, getTemplate, planTemplate };
