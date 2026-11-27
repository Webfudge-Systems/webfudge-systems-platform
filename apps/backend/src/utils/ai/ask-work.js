'use strict';

/**
 * W21 Ask Work: answers plain-language questions about the user's work.
 *
 * The model never touches the database. Step 1 (work.ask_plan) turns the question into at most
 * three calls to a fixed set of read-only tools. The backend sanitizes those calls (whitelisted tool
 * names, typed arguments) and runs them with the asking user's scope: always org-scoped, and for
 * non-admins limited to the same task/project visibility the task list uses (own tasks + projects
 * they can see, W1 workspace rules). Step 2 (work.ask_answer) writes the answer from those rows only,
 * and only task ids that the tools returned can be cited back to the UI.
 */

const OPEN = ['COMPLETED', 'CANCELLED'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CALLS = 3;
const MAX_ROWS = 25;

const str = (max) => ({ type: 'string', maxLength: max });
const date = { type: 'string', format: 'date' };

/** Tool name → argument spec. `enum` arrays are enforced; dates must be YYYY-MM-DD. */
const TOOLS = {
  find_tasks: {
    description: 'Tasks visible to the user. Filters are optional and combined with AND.',
    args: {
      status: { enum: ['open', 'overdue', 'completed', 'any'] },
      project: { text: 80, note: 'project name (partial)' },
      client: { text: 80, note: 'client / company name (partial)' },
      assignee: { text: 80, note: '"me" or a person name (partial)' },
      priority: { enum: ['low', 'medium', 'high'] },
      text: { text: 80, note: 'words in the task name' },
      dueFrom: { date: true },
      dueTo: { date: true },
      completedFrom: { date: true },
      completedTo: { date: true },
      limit: { int: [1, MAX_ROWS] },
    },
  },
  find_projects: {
    description: 'Projects visible to the user.',
    args: {
      query: { text: 80, note: 'project name (partial)' },
      client: { text: 80, note: 'client / company name (partial)' },
      limit: { int: [1, MAX_ROWS] },
    },
  },
};

function sanitizeArgs(spec, raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [key, rule] of Object.entries(spec)) {
    const v = raw[key];
    if (v == null || v === '') continue;
    if (rule.enum) {
      if (rule.enum.includes(v)) out[key] = v;
    } else if (rule.date) {
      if (typeof v === 'string' && DATE_RE.test(v)) out[key] = v;
    } else if (rule.int) {
      const n = parseInt(v, 10);
      if (Number.isFinite(n)) out[key] = Math.min(rule.int[1], Math.max(rule.int[0], n));
    } else if (rule.text) {
      const s = String(v).trim().slice(0, rule.text);
      if (s) out[key] = s;
    }
  }
  return out;
}

/** Keeps only known tools with typed arguments; at most MAX_CALLS. */
function sanitizeCalls(raw) {
  return (Array.isArray(raw) ? raw : [])
    .filter((c) => c && Object.prototype.hasOwnProperty.call(TOOLS, c.tool))
    .slice(0, MAX_CALLS)
    .map((c) => ({ tool: c.tool, args: sanitizeArgs(TOOLS[c.tool].args, c.args) }));
}

const inIds = (ids) => ({ id: { $in: ids.length ? ids : [-1] } });

/** Visibility clause for tasks (same rule as GET /tasks for non-admins). */
function taskVisibility(scope) {
  if (scope.isAdmin) return { organization: scope.orgId };
  const uid = scope.userId;
  const or = [{ assigner: uid }, { assignee: uid }, { collaborators: { id: uid } }];
  if (scope.visibleProjectIds?.length) or.push({ projects: { id: { $in: scope.visibleProjectIds } } });
  return { $or: or };
}

/**
 * @param {object} a  sanitized args plus resolved `projectIds` / `assigneeIds`
 * @param {object} scope { orgId, userId, isAdmin, visibleProjectIds, today }
 */
function buildTaskFilters(a, scope) {
  const c = {};
  if (a.status === 'open') c.status = { $notIn: OPEN };
  if (a.status === 'overdue') {
    c.status = { $notIn: OPEN };
    c.scheduledDate = { $lt: `${scope.today}T00:00:00.000Z` };
  }
  if (a.status === 'completed') c.status = 'COMPLETED';
  if (a.projectIds) {
    const ids = scope.isAdmin ? a.projectIds : a.projectIds.filter((id) => (scope.visibleProjectIds || []).includes(id));
    c.projects = inIds(ids);
  }
  // Names match on the task's own project / client; the visibility clause still bounds the rows,
  // so a member finds their tasks on a project even when they cannot open the project itself.
  const names = [];
  if (a.project) names.push({ projects: { name: { $containsi: a.project } } });
  if (a.client) {
    names.push({ $or: [{ projects: { clientAccount: { companyName: { $containsi: a.client } } } }, { clientAccount: { companyName: { $containsi: a.client } } }] });
  }
  if (names.length) c.$and = names;
  if (a.assigneeIds) c.assignee = inIds(a.assigneeIds);
  if (a.priority) c.priority = a.priority;
  if (a.text) c.name = { $containsi: a.text };
  if (a.dueFrom || a.dueTo) {
    c.scheduledDate = { ...(c.scheduledDate || {}) };
    if (a.dueFrom) c.scheduledDate.$gte = `${a.dueFrom}T00:00:00.000Z`;
    if (a.dueTo) c.scheduledDate.$lte = `${a.dueTo}T23:59:59.999Z`;
  }
  if (a.completedFrom || a.completedTo) {
    c.completedAt = {};
    if (a.completedFrom) c.completedAt.$gte = `${a.completedFrom}T00:00:00.000Z`;
    if (a.completedTo) c.completedAt.$lte = `${a.completedTo}T23:59:59.999Z`;
  }
  return { organization: scope.orgId, $and: [taskVisibility(scope), c] };
}

function buildProjectFilters({ query, client }, scope) {
  const and = [{ organization: scope.orgId }];
  if (!scope.isAdmin) and.push(inIds(scope.visibleProjectIds || []));
  if (query && client) and.push({ $or: [{ name: { $containsi: query } }, { clientAccount: { companyName: { $containsi: client } } }] });
  else if (query || client) {
    const q = query || client;
    and.push({ $or: [{ name: { $containsi: q } }, { clientAccount: { companyName: { $containsi: q } } }] });
  }
  return { $and: and };
}

const personName = (u) => (u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email || `User #${u.id}` : null);
const day = (v) => (v ? String(v).slice(0, 10) : null);

function taskRow(t) {
  return {
    id: t.id,
    name: t.name,
    status: t.status,
    priority: t.priority || null,
    due: day(t.scheduledDate),
    completedAt: day(t.completedAt),
    project: t.projects?.[0]?.name || null,
    assignee: personName(t.assignee),
    estimatedHours: t.estimatedHours == null ? null : Number(t.estimatedHours),
  };
}

function projectRow(p) {
  return { id: p.id, name: p.name, status: p.status || null, client: p.clientAccount?.companyName || null, endDate: day(p.endDate) };
}

async function resolvePeople(text, scope, deps) {
  if (/^(me|myself|i)$/i.test(text)) return [scope.userId];
  const q = text.toLowerCase();
  const members = await deps.findMembers();
  return members
    .filter((u) => [personName(u), u.username, u.email].filter(Boolean).some((s) => String(s).toLowerCase().includes(q)))
    .map((u) => u.id);
}

/**
 * Runs sanitized calls. `deps` does the reads: { findTasks(filters, limit), findProjects(filters, limit), findMembers() }.
 * @returns {Promise<Array<{ tool, args, rows?, count?, error? }>>}
 */
async function executeCalls(calls, scope, deps) {
  const out = [];
  for (const { tool, args } of calls) {
    const limit = args.limit || 15;
    if (tool === 'find_tasks') {
      if (!scope.can?.tasks) {
        out.push({ tool, args, error: 'not_allowed' });
        continue;
      }
      const a = { ...args };
      if (args.assignee) a.assigneeIds = await resolvePeople(args.assignee, scope, deps);
      const rows = (await deps.findTasks(buildTaskFilters(a, scope), limit)).map(taskRow);
      out.push({ tool, args, rows, count: rows.length });
    } else if (tool === 'find_projects') {
      if (!scope.can?.projects) {
        out.push({ tool, args, error: 'not_allowed' });
        continue;
      }
      const rows = (await deps.findProjects(buildProjectFilters(args, scope), limit)).map(projectRow);
      out.push({ tool, args, rows, count: rows.length });
    }
  }
  return out;
}

/** Unique ids, in the model's order, that a find_tasks result actually returned. */
function keepCitedIds(ids, results) {
  const allowed = new Set(results.filter((r) => r.tool === 'find_tasks').flatMap((r) => (r.rows || []).map((x) => Number(x.id))));
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(ids) ? ids : []) {
    const id = Number(raw);
    if (allowed.has(id) && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

// ---------- Strapi wiring ----------

const TASK_UID = 'api::task.task';
const PROJECT_UID = 'api::project.project';
const MEMBER_UID = 'api::organization-user.organization-user';

async function buildScope(strapi, ctx) {
  const { isPmOrgAdminRole, canAccess } = require('../rbac');
  const { buildProjectVisibilityFilters } = require('../workspaces');
  const orgId = ctx.state.orgId;
  const userId = ctx.state.user.id;
  const isAdmin = Boolean(isPmOrgAdminRole(ctx));
  let visibleProjectIds = null;
  if (!isAdmin) {
    const filters = await buildProjectVisibilityFilters(strapi, ctx, orgId, userId);
    const rows = await strapi.entityService.findMany(PROJECT_UID, { filters, fields: ['id'], limit: 1000 });
    visibleProjectIds = rows.map((r) => r.id);
  }
  return {
    orgId,
    userId,
    isAdmin,
    visibleProjectIds,
    can: { tasks: Boolean(canAccess(ctx, 'pm', 'tasks', 'read')), projects: Boolean(canAccess(ctx, 'pm', 'projects', 'read')) },
    today: new Date().toISOString().slice(0, 10),
  };
}

function strapiDeps(strapi, scope) {
  const userFields = ['id', 'username', 'firstName', 'lastName', 'email'];
  return {
    findTasks: (filters, limit) =>
      strapi.entityService.findMany(TASK_UID, {
        filters,
        fields: ['id', 'name', 'status', 'priority', 'scheduledDate', 'completedAt', 'estimatedHours'],
        populate: { projects: { fields: ['id', 'name'] }, assignee: { fields: userFields } },
        sort: { scheduledDate: 'asc' },
        limit,
      }),
    findProjects: (filters, limit) =>
      strapi.entityService.findMany(PROJECT_UID, {
        filters,
        fields: ['id', 'name', 'status', 'endDate'],
        populate: { clientAccount: { fields: ['id', 'companyName'] } },
        sort: { name: 'asc' },
        limit,
      }),
    async findMembers() {
      const rows = await strapi.entityService.findMany(MEMBER_UID, {
        filters: { organization: scope.orgId, isActive: true },
        populate: { user: { fields: userFields } },
        limit: 500,
      });
      return rows.map((r) => r.user).filter(Boolean);
    },
  };
}

/** Full question → answer flow. Throws AI errors for the caller's sendAiError. */
async function askWork(strapi, ctx, { question, language, history = [] }) {
  const ai = require('./index');
  const { renderTemplate, generateObject } = require('@webfudge/ai');
  const scope = await buildScope(strapi, ctx);
  const client = ai.clientFor(strapi, ctx);
  const me = personName(ctx.state.user);
  const recent = (Array.isArray(history) ? history : []).slice(-4).map((h) => ({ q: String(h.q || '').slice(0, 300), a: String(h.a || '').slice(0, 600) }));

  const plan = await generateObject(client, {
    ...renderTemplate('work.ask_plan', { question, today: scope.today, me, history: recent, tools: TOOLS }, { language }),
    feature: 'work.ask',
  });
  const calls = sanitizeCalls(plan.object?.calls);
  const results = await executeCalls(calls, scope, strapiDeps(strapi, scope));

  const answer = await generateObject(client, {
    ...renderTemplate('work.ask_answer', { question, today: scope.today, me, results }, { language }),
    feature: 'work.ask',
  });
  const ids = keepCitedIds(answer.object?.taskIds, results);
  const byId = new Map(results.flatMap((r) => r.rows || []).filter((r) => r.due !== undefined).map((r) => [r.id, r]));
  return {
    answer: answer.object?.answer || '',
    tasks: ids.map((id) => byId.get(id)),
    toolCalls: results.map((r) => ({ tool: r.tool, args: r.args, count: r.count ?? 0, error: r.error || null })),
    credits: (plan.credits || 0) + (answer.credits || 0),
  };
}

module.exports = { TOOLS, sanitizeCalls, buildTaskFilters, buildProjectFilters, executeCalls, keepCitedIds, buildScope, askWork };
