'use strict';

/**
 * Fudge Work smart triage + meeting → tasks (ticket W20), on the P5 AI foundation.
 *
 *   suggestTriage        — priority / assignee / list / due date for new or unassigned tasks.
 *                          Read-only: the AI only suggests, a person accepts.
 *   extractMeetingTasks  — action items (owner + due date) from pasted notes or a transcript.
 *                          Read-only preview.
 *   Writes go through agent actions (permission-checked, audited, undoable):
 *     work.task.apply_triage    — apply the fields a person accepted to one task
 *     work.meeting.create_tasks — create the reviewed action items as tasks linked to the meeting
 *
 * The workload signal is W6 capacity: open estimated hours vs weekly capacity per member. The
 * skills signal is the member's job role plus the names / tags of tasks they completed recently.
 */

const { renderTemplate, generateObject, normalizeLanguage, AiError } = require('@webfudge/ai');

const TASK_UID = 'api::task.task';
const MEMBER_UID = 'api::organization-user.organization-user';
const LIST_UID = 'api::task-list.task-list';
const MEETING_UID = 'api::meeting.meeting';
const PROJECT_UID = 'api::project.project';

const OPEN = { $notIn: ['COMPLETED', 'CANCELLED'] };
const PRIORITIES = ['low', 'medium', 'high'];
const MAX_TRIAGE = 25;
const MAX_ITEMS = 30;
const MAX_NOTES = 30000;

const relId = (v) => (v && typeof v === 'object' ? v.id ?? null : v ?? null);
const r1 = (n) => Math.round((Number(n) || 0) * 10) / 10;
const todayIso = () => new Date().toISOString().slice(0, 10);
const userName = (u) => [u?.firstName, u?.lastName].filter(Boolean).join(' ') || u?.username || u?.email || `User #${u?.id}`;
const str = (v, max) => String(v ?? '').trim().slice(0, max);

const badRequest = (message) => new AiError(message, { code: 'AI_BAD_REQUEST', status: 400 });
const notFound = (what) => new AiError(`${what} not found.`, { code: 'AI_SUBJECT_NOT_FOUND', status: 404 });

/** YYYY-MM-DD on or after today, else null. */
function validDate(v, today) {
  const d = typeof v === 'string' ? v.slice(0, 10) : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d))) return null;
  return d >= today ? d : null;
}
const priorityOf = (v, fallback = 'medium') => (PRIORITIES.includes(v) ? v : fallback);
/** Stored at noon UTC so the calendar day is the same in Indian and European time zones. */
const toDateTime = (d) => (d ? `${String(d).slice(0, 10)}T12:00:00.000Z` : null);

// ---------- team / workload ----------

function buildTeam(members, openTasks = [], recentTasks = []) {
  const hours = new Map();
  const counts = new Map();
  const recent = new Map();
  for (const t of openTasks) {
    const uid = relId(t.assignee);
    counts.set(uid, (counts.get(uid) || 0) + 1);
    if (t.estimatedHours != null) hours.set(uid, (hours.get(uid) || 0) + Number(t.estimatedHours));
  }
  for (const t of recentTasks) {
    const uid = relId(t.assignee);
    const list = recent.get(uid) || [];
    if (list.length >= 5) continue;
    const tags = Array.isArray(t.tags) ? t.tags.filter((x) => typeof x === 'string').slice(0, 3) : [];
    list.push(tags.length ? `${t.name} (${tags.join(', ')})` : t.name);
    recent.set(uid, list);
  }
  return members
    .filter((m) => m.user?.id)
    .map((m) => ({
      userId: m.user.id,
      name: userName(m.user),
      jobRole: m.jobRole || null,
      capacity: m.weeklyCapacityHours == null ? 40 : Number(m.weeklyCapacityHours),
      openHours: r1(hours.get(m.user.id)),
      openTasks: counts.get(m.user.id) || 0,
      recentWork: recent.get(m.user.id) || [],
    }));
}

async function loadTeam(strapi, orgId) {
  const members = await strapi.entityService.findMany(MEMBER_UID, {
    filters: { organization: orgId, isActive: true },
    populate: { user: { fields: ['id', 'username', 'firstName', 'lastName', 'email'] } },
    limit: 200,
  });
  const ids = members.map((m) => m.user?.id).filter(Boolean);
  if (!ids.length) return [];
  const since = new Date(Date.now() - 90 * 86400000).toISOString();
  const [open, recent] = await Promise.all([
    strapi.entityService.findMany(TASK_UID, {
      filters: { organization: orgId, status: OPEN, assignee: { id: { $in: ids } } },
      fields: ['id', 'estimatedHours'],
      populate: { assignee: { fields: ['id'] } },
      limit: 5000,
    }),
    strapi.entityService.findMany(TASK_UID, {
      filters: { organization: orgId, status: 'COMPLETED', assignee: { id: { $in: ids } }, updatedAt: { $gte: since } },
      fields: ['id', 'name', 'tags'],
      populate: { assignee: { fields: ['id'] } },
      sort: { updatedAt: 'desc' },
      limit: 500,
    }),
  ]);
  return buildTeam(members, open, recent);
}

// ---------- validation of model output ----------

function normalizeSuggestion(raw, { team = [], lists = [], today = todayIso() } = {}) {
  const assigneeId = team.some((m) => m.userId === raw?.assigneeId) ? raw.assigneeId : null;
  const taskListId = lists.some((l) => l.id === raw?.taskListId) ? raw.taskListId : null;
  return {
    taskId: Number(raw?.taskId),
    priority: priorityOf(raw?.priority),
    assigneeId,
    taskListId,
    scheduledDate: validDate(raw?.dueDate, today),
    reason: str(raw?.reason, 300),
  };
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9ऀ-ॿ ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Member id for a name said in a meeting: full name, else a unique first-name match. */
function matchOwner(name, team = []) {
  const n = norm(name);
  if (!n) return null;
  const full = team.filter((m) => norm(m.name) === n);
  if (full.length === 1) return full[0].userId;
  const first = n.split(' ')[0];
  const byFirst = team.filter((m) => norm(m.name).split(' ')[0] === first);
  return byFirst.length === 1 ? byFirst[0].userId : null;
}

function normalizeActionItems(items = [], { team = [], today = todayIso() } = {}) {
  return (Array.isArray(items) ? items : [])
    .map((it) => {
      const ownerName = str(it?.owner, 100) || null;
      return {
        title: str(it?.title, 200),
        description: str(it?.description, 600),
        ownerName,
        assigneeId: matchOwner(ownerName, team),
        scheduledDate: validDate(it?.dueDate, today),
        priority: priorityOf(it?.priority),
      };
    })
    .filter((it) => it.title)
    .slice(0, MAX_ITEMS);
}

// ---------- AI flows ----------

/**
 * @param scope   { orgId, userId }
 * @param input   { taskIds: number[], language? }
 * @param opts    { client (ai.clientFor(strapi, ctx)), today? }
 */
async function suggestTriage(strapi, scope, { taskIds, language } = {}, { client, today = todayIso() } = {}) {
  const ids = [...new Set((Array.isArray(taskIds) ? taskIds : []).map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  if (!ids.length) throw badRequest('Pick at least one task to triage.');
  if (ids.length > MAX_TRIAGE) throw badRequest(`Triage up to ${MAX_TRIAGE} tasks at a time.`);

  const tasks = await strapi.entityService.findMany(TASK_UID, {
    filters: { id: { $in: ids }, organization: scope.orgId },
    fields: ['id', 'name', 'description', 'priority', 'status', 'taskType', 'scheduledDate', 'estimatedHours'],
    populate: {
      projects: { fields: ['id', 'name'] },
      assignee: { fields: ['id'] },
      taskList: { fields: ['id'] },
      clientRequestedBy: { fields: ['id'] },
    },
    limit: MAX_TRIAGE,
  });
  if (!tasks.length) throw notFound('Tasks');

  const projectIds = [...new Set(tasks.flatMap((t) => (t.projects || []).map((p) => p.id)))];
  const [team, listRows] = await Promise.all([
    loadTeam(strapi, scope.orgId),
    projectIds.length
      ? strapi.entityService.findMany(LIST_UID, {
          filters: { organization: scope.orgId, project: { id: { $in: projectIds } } },
          fields: ['id', 'name', 'sortOrder'],
          populate: { project: { fields: ['id'] } },
          sort: { sortOrder: 'asc' },
          limit: 500,
        })
      : [],
  ]);
  const lists = listRows.map((l) => ({ id: l.id, name: l.name, projectId: relId(l.project) }));

  const payload = tasks.map((t) => ({
    taskId: t.id,
    name: t.name,
    description: str(t.description, 500) || null,
    type: t.taskType || 'task',
    currentPriority: t.priority || null,
    currentAssigneeId: relId(t.assignee),
    currentListId: relId(t.taskList),
    currentDueDate: t.scheduledDate ? String(t.scheduledDate).slice(0, 10) : null,
    estimatedHours: t.estimatedHours == null ? null : Number(t.estimatedHours),
    project: t.projects?.[0] ? { id: t.projects[0].id, name: t.projects[0].name } : null,
    fromClientPortal: Boolean(relId(t.clientRequestedBy)),
  }));

  const tpl = renderTemplate('work.task_triage', { today, tasks: payload, team, lists }, { language: normalizeLanguage(language) });
  const out = await generateObject(client, { ...tpl, feature: 'work.task_triage', metadata: { subjectType: 'task', subjectId: ids.length === 1 ? ids[0] : null, count: ids.length } });

  const byTask = new Map();
  for (const raw of out.object?.suggestions || []) {
    const task = tasks.find((t) => t.id === Number(raw?.taskId));
    if (!task || byTask.has(task.id)) continue;
    const projectId = task.projects?.[0]?.id ?? null;
    byTask.set(task.id, normalizeSuggestion(raw, { team, lists: lists.filter((l) => l.projectId === projectId), today }));
  }
  const suggestions = tasks.map(
    (t) => byTask.get(t.id) || { taskId: t.id, priority: priorityOf(t.priority), assigneeId: null, taskListId: null, scheduledDate: null, reason: 'Fudge AI had no suggestion for this task.' },
  );

  return { suggestions, team: team.map(({ userId, name, jobRole, capacity, openHours }) => ({ userId, name, jobRole, capacity, openHours })), lists, model: out.model, creditsUsed: out.credits };
}

/**
 * @param input { notes? (falls back to the notes saved on the meeting), language? }
 */
async function extractMeetingTasks(strapi, scope, meetingId, { notes, language } = {}, { client, today = todayIso() } = {}) {
  const meeting = await strapi.entityService.findOne(MEETING_UID, Number(meetingId), { populate: { organization: { fields: ['id'] } } });
  if (!meeting || String(relId(meeting.organization)) !== String(scope.orgId)) throw notFound('Meeting');
  const text = String(notes || meeting.notes || '').trim().slice(0, MAX_NOTES);
  if (!text) throw badRequest('Paste the meeting notes or transcript first.');

  const team = await loadTeam(strapi, scope.orgId);
  const tpl = renderTemplate(
    'work.meeting_action_items',
    { meeting: { title: meeting.title, date: meeting.startTime ? String(meeting.startTime).slice(0, 10) : today }, team, notes: text },
    { language: normalizeLanguage(language) },
  );
  const out = await generateObject(client, { ...tpl, feature: 'work.meeting_action_items', metadata: { subjectType: 'meeting', subjectId: meeting.id } });

  return {
    meeting: { id: meeting.id, title: meeting.title || null },
    items: normalizeActionItems(out.object?.items, { team, today }),
    team: team.map(({ userId, name }) => ({ userId, name })),
    model: out.model,
    creditsUsed: out.credits,
  };
}

// ---------- actions ----------

async function isMember(strapi, orgId, userId) {
  const rows = await strapi.entityService.findMany(MEMBER_UID, { filters: { organization: orgId, user: Number(userId), isActive: true }, fields: ['id'], limit: 1 });
  return rows.length > 0;
}
async function assertMember(strapi, orgId, userId) {
  if (userId != null && !(await isMember(strapi, orgId, userId))) throw new Error(`User #${userId} is not a member of this organization.`);
}
async function assertList(strapi, orgId, listId) {
  if (listId == null) return;
  const rows = await strapi.entityService.findMany(LIST_UID, { filters: { id: Number(listId), organization: orgId }, fields: ['id'], limit: 1 });
  if (!rows.length) throw new Error('Task list not found.');
}
async function loadOrgRecord(strapi, uid, id, orgId, populate = {}) {
  const row = await strapi.entityService.findOne(uid, Number(id), { populate: { organization: { fields: ['id'] }, ...populate } });
  return row && String(relId(row.organization)) === String(orgId) ? row : null;
}

const TASKS_WRITE = { app: 'pm', module: 'tasks', access: 'write' };

function registerWorkTriageActions(r, strapi) {
  r.define({
    key: 'work.task.apply_triage',
    label: 'apply triage to a task',
    permission: TASKS_WRITE,
    describe: (input) => `Triaged task #${input.taskId}`,
    async execute(input, { orgId }) {
      const task = await loadOrgRecord(strapi, TASK_UID, input.taskId, orgId, { assignee: { fields: ['id'] }, taskList: { fields: ['id'] } });
      if (!task) throw new Error('Task not found.');
      const data = {};
      const previous = {};
      if (input.priority !== undefined) {
        data.priority = priorityOf(input.priority, task.priority || 'medium');
        previous.priority = task.priority ?? null;
      }
      if (input.assigneeId !== undefined) {
        await assertMember(strapi, orgId, input.assigneeId);
        data.assignee = input.assigneeId == null ? null : Number(input.assigneeId);
        previous.assignee = relId(task.assignee);
      }
      if (input.taskListId !== undefined) {
        await assertList(strapi, orgId, input.taskListId);
        data.taskList = input.taskListId == null ? null : Number(input.taskListId);
        previous.taskList = relId(task.taskList);
      }
      if (input.scheduledDate !== undefined) {
        data.scheduledDate = toDateTime(input.scheduledDate);
        previous.scheduledDate = task.scheduledDate ?? null;
      }
      if (!Object.keys(data).length) throw new Error('Nothing to apply.');
      await strapi.entityService.update(TASK_UID, task.id, { data });
      return {
        result: { taskId: task.id, applied: Object.keys(data) },
        undoData: { taskId: task.id, previous },
        subject: { type: 'task', id: task.id },
        summary: `Triaged task "${task.name || `#${task.id}`}" (${Object.keys(data).join(', ')})`,
      };
    },
    async undo({ taskId, previous }, { orgId }) {
      const task = await loadOrgRecord(strapi, TASK_UID, taskId, orgId);
      if (!task) throw new Error('Task not found.');
      await strapi.entityService.update(TASK_UID, task.id, { data: previous });
    },
  });

  r.define({
    key: 'work.meeting.create_tasks',
    label: 'create tasks from a meeting',
    permission: TASKS_WRITE,
    describe: (input) => `Created ${input.items?.length || 0} tasks from meeting #${input.meetingId}`,
    async execute(input, { orgId }) {
      const meeting = await loadOrgRecord(strapi, MEETING_UID, input.meetingId, orgId);
      if (!meeting) throw new Error('Meeting not found.');
      if (input.projectId != null && !(await loadOrgRecord(strapi, PROJECT_UID, input.projectId, orgId))) throw new Error('Project not found.');
      await assertList(strapi, orgId, input.taskListId ?? null);
      const items = (input.items || []).filter((it) => str(it?.title, 200)).slice(0, MAX_ITEMS);
      if (!items.length) throw new Error('No action items to create.');
      for (const it of items) await assertMember(strapi, orgId, it.assigneeId ?? null);

      const taskIds = [];
      for (const it of items) {
        const row = await strapi.entityService.create(TASK_UID, {
          data: {
            name: str(it.title, 200),
            description: str(it.description, 2000) || null,
            priority: priorityOf(it.priority),
            status: 'SCHEDULED',
            taskType: 'task',
            organization: orgId,
            meeting: meeting.id,
            projects: input.projectId != null ? [Number(input.projectId)] : [],
            taskList: input.taskListId != null ? Number(input.taskListId) : null,
            assignee: it.assigneeId != null ? Number(it.assigneeId) : null,
            assigner: input.assignerId ?? null,
            scheduledDate: toDateTime(it.scheduledDate),
          },
        });
        taskIds.push(row.id);
      }
      return {
        result: { taskIds, count: taskIds.length },
        undoData: { taskIds },
        subject: { type: 'meeting', id: meeting.id },
        summary: `Created ${taskIds.length} task${taskIds.length === 1 ? '' : 's'} from meeting "${meeting.title || `#${meeting.id}`}"`,
      };
    },
    async undo({ taskIds = [] }) {
      for (const id of taskIds) await strapi.entityService.delete(TASK_UID, id);
    },
  });
}

module.exports = {
  buildTeam,
  loadTeam,
  normalizeSuggestion,
  matchOwner,
  normalizeActionItems,
  suggestTriage,
  extractMeetingTasks,
  registerWorkTriageActions,
  MAX_TRIAGE,
};
