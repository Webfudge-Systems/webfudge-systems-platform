'use strict';

/**
 * Goals / OKRs (W12). All routes live under /api/goals (see routes/goal.js).
 * Read: anyone in the org with Work project access (private objectives: owner, creator, admins).
 * Write an objective and its key results: org admin / manager, Work project managers, the
 * objective's owner or creator. Check in on a key result: those plus the key result's owner.
 * Task-based key results are not checked in by hand; they follow their linked tasks (utils/goals).
 */

const { requireModuleAccess, canAccess, isPmOrgAdminRole, isPmOrgManagerRole } = require('../../../utils/rbac');
const { loadProjectForAccess, buildProjectVisibilityFilters, orgMemberUserIds } = require('../../../utils/workspaces');
const G = require('../../../utils/goals');

const TASK_UID = 'api::task.task';
const PROJECT_UID = 'api::project.project';
const USER_FIELDS = ['id', 'username', 'firstName', 'lastName', 'email'];
const isDay = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
const body = (ctx) => ctx.request?.body?.data || ctx.request?.body || {};
const intId = (v) => {
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) || n <= 0 ? null : n;
};
const ids = (a) => [...new Set((Array.isArray(a) ? a : []).map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 500);
const userName = (u) => (u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email : null);
const person = (u) => (u ? { id: u.id, name: userName(u), email: u.email || null } : null);

function guard(ctx, level = 'read') {
  if (!ctx.state.user) {
    ctx.unauthorized('Missing or invalid credentials');
    return false;
  }
  if (!ctx.state.orgId) {
    ctx.forbidden('No active organization');
    return false;
  }
  const denied = requireModuleAccess(ctx, 'pm', 'projects', level);
  if (denied) return false;
  return true;
}

const uid = (ctx) => Number(ctx.state.user.id);
const isGoalAdmin = (ctx) => isPmOrgAdminRole(ctx) || isPmOrgManagerRole(ctx) || canAccess(ctx, 'pm', 'projects', 'manage');
const canEditObjective = (ctx, o) => isGoalAdmin(ctx) || G.relId(o.owner) === uid(ctx) || G.relId(o.createdByUser) === uid(ctx);
const canSeeObjective = (ctx, o) => o.visibility !== 'private' || isPmOrgAdminRole(ctx) || canEditObjective(ctx, o);
const canCheckIn = (ctx, o, kr) => canEditObjective(ctx, o) || G.relId(kr.owner) === uid(ctx);

const KR_POPULATE = {
  owner: { fields: USER_FIELDS },
  tasks: { fields: ['id', 'name', 'status'], populate: { projects: { fields: ['id'] } } },
  projects: { fields: ['id', 'name', 'slug'] },
};
const OBJECTIVE_POPULATE = {
  owner: { fields: USER_FIELDS },
  createdByUser: { fields: ['id'] },
  parent: { fields: ['id', 'title'] },
  organization: { fields: ['id'] },
  keyResults: { populate: KR_POPULATE, sort: [{ sortOrder: 'asc' }, { id: 'asc' }] },
};

/** Project ids the caller may view (for hiding names of linked work they can't see). */
async function visibleProjectIds(strapi, ctx) {
  const filters = await buildProjectVisibilityFilters(strapi, ctx, ctx.state.orgId, ctx.state.user.id);
  const rows = await strapi.entityService.findMany(PROJECT_UID, { filters, fields: ['id'], limit: 10000 });
  return new Set(rows.map((r) => r.id));
}

function serializeKr(kr, visible, { detail = false } = {}) {
  const canSee = (t) => !visible || !(t.projects || []).length || (t.projects || []).some((p) => visible.has(p.id));
  const tasks = kr.tasks || [];
  const projects = kr.projects || [];
  const out = {
    id: kr.id,
    title: kr.title,
    metricType: kr.metricType,
    startValue: G.num(kr.startValue),
    targetValue: G.num(kr.targetValue, 100),
    currentValue: G.num(kr.currentValue),
    unit: kr.unit || (kr.metricType === 'percent' ? '%' : ''),
    progress: G.r1(kr.progress),
    confidence: kr.confidence || 'on_track',
    sortOrder: kr.sortOrder || 0,
    lastCheckInAt: kr.lastCheckInAt || null,
    owner: person(kr.owner),
    linkedTaskCount: tasks.length,
    linkedProjectCount: projects.length,
  };
  if (detail || visible) {
    out.tasks = tasks.filter(canSee).map((t) => ({ id: t.id, name: t.name, status: t.status, done: t.status === 'COMPLETED' }));
    out.hiddenTaskCount = tasks.length - out.tasks.length;
    out.projects = projects.filter((p) => !visible || visible.has(p.id)).map((p) => ({ id: p.id, name: p.name, slug: p.slug || null }));
  }
  return out;
}

function serializeObjective(ctx, o, visible, opts) {
  const krs = (o.keyResults || []).map((kr) => ({ ...serializeKr(kr, visible, opts), canCheckIn: canCheckIn(ctx, o, kr) }));
  return {
    id: o.id,
    title: o.title,
    description: o.description || '',
    periodLabel: o.periodLabel || '',
    startDate: o.startDate || null,
    endDate: o.endDate || null,
    status: o.status || 'active',
    visibility: o.visibility || 'organization',
    scope: o.scope || 'work',
    progress: G.r1(o.progress),
    health: G.objectiveHealth(krs),
    owner: person(o.owner),
    parent: o.parent ? { id: o.parent.id, title: o.parent.title } : null,
    keyResults: krs,
    canEdit: canEditObjective(ctx, o),
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

async function loadObjective(strapi, ctx, rawId) {
  const id = intId(rawId);
  if (!id) return null;
  const o = await strapi.entityService.findOne(G.OBJECTIVE_UID, id, { populate: OBJECTIVE_POPULATE });
  if (!o || G.relId(o.organization) !== Number(ctx.state.orgId)) return null;
  if (!canSeeObjective(ctx, o)) return null;
  return o;
}

async function loadKrWithObjective(strapi, ctx, rawId) {
  const id = intId(rawId);
  if (!id) return null;
  const kr = await strapi.entityService.findOne(G.KR_UID, id, {
    populate: { ...KR_POPULATE, objective: { fields: ['id'] }, organization: { fields: ['id'] } },
  });
  if (!kr || G.relId(kr.organization) !== Number(ctx.state.orgId)) return null;
  const objective = await loadObjective(strapi, ctx, G.relId(kr.objective));
  if (!objective) return null;
  return { kr, objective };
}

async function validOwner(strapi, ctx, raw) {
  if (raw === undefined) return { skip: true };
  if (raw === null || raw === '') return { id: null };
  const id = intId(raw);
  if (!id) return { error: 'Pick a valid owner' };
  const members = await orgMemberUserIds(strapi, ctx.state.orgId);
  if (!members.has(id)) return { error: 'The owner must be a member of this organization' };
  return { id };
}

function normalizeObjective(b, creating) {
  const data = {};
  if (creating || b.title !== undefined) {
    const title = String(b.title || '').trim().slice(0, 200);
    if (!title) return { error: 'Give the objective a title' };
    data.title = title;
  }
  if (b.description !== undefined) data.description = String(b.description || '').slice(0, 4000);
  if (b.periodLabel !== undefined) data.periodLabel = String(b.periodLabel || '').trim().slice(0, 60);
  for (const k of ['startDate', 'endDate']) {
    if (b[k] === undefined) continue;
    if (b[k] === null || b[k] === '') data[k] = null;
    else if (!isDay(b[k])) return { error: `Use a YYYY-MM-DD ${k === 'startDate' ? 'start' : 'end'} date` };
    else data[k] = b[k];
  }
  if (data.startDate && data.endDate && data.endDate < data.startDate) return { error: 'The end date must be after the start date' };
  if (b.status !== undefined) {
    if (!['active', 'completed', 'archived'].includes(b.status)) return { error: 'Unknown status' };
    data.status = b.status;
  }
  if (b.visibility !== undefined) {
    if (!['organization', 'private'].includes(b.visibility)) return { error: 'Unknown visibility' };
    data.visibility = b.visibility;
  }
  if (creating && b.scope !== undefined) data.scope = String(b.scope || 'work').slice(0, 30);
  return { data };
}

function normalizeKr(b, creating, current = {}) {
  const data = {};
  if (creating || b.title !== undefined) {
    const title = String(b.title || '').trim().slice(0, 200);
    if (!title) return { error: 'Give the key result a title' };
    data.title = title;
  }
  const type = b.metricType !== undefined ? b.metricType : current.metricType || 'number';
  if (!G.METRIC_TYPES.includes(type)) return { error: 'Type must be number, percent or tasks' };
  if (creating || b.metricType !== undefined) data.metricType = type;
  if (type !== 'tasks') {
    for (const k of ['startValue', 'targetValue', 'currentValue']) {
      if (b[k] === undefined || b[k] === null || b[k] === '') continue;
      const n = Number(b[k]);
      if (!Number.isFinite(n)) return { error: `${k} must be a number` };
      data[k] = n;
    }
    if (type === 'percent') {
      if (creating && data.targetValue === undefined) data.targetValue = 100;
      if (creating && data.startValue === undefined) data.startValue = 0;
    }
    if (creating && data.currentValue === undefined) data.currentValue = data.startValue ?? 0;
  }
  if (b.unit !== undefined) data.unit = String(b.unit || '').slice(0, 20);
  if (b.confidence !== undefined) {
    if (!G.CONFIDENCE.includes(b.confidence)) return { error: 'Unknown confidence' };
    data.confidence = b.confidence;
  }
  if (b.sortOrder !== undefined) data.sortOrder = parseInt(b.sortOrder, 10) || 0;
  return { data, type };
}

/** Validate linked task / project ids: in the org and visible to the caller. */
async function validLinks(strapi, ctx, b) {
  const out = {};
  if (b.projectIds !== undefined) {
    const pids = ids(b.projectIds);
    for (const pid of pids) {
      if (!(await loadProjectForAccess(strapi, ctx, pid))) return { error: 'You can only link projects you can see' };
    }
    out.projects = pids;
  }
  if (b.taskIds !== undefined) {
    const tids = ids(b.taskIds);
    if (tids.length) {
      const rows = await strapi.entityService.findMany(TASK_UID, {
        filters: { id: { $in: tids }, organization: { id: ctx.state.orgId } },
        fields: ['id'],
        populate: { projects: { fields: ['id'] } },
        limit: tids.length,
      });
      if (rows.length !== tids.length) return { error: 'You can only link tasks from this organization' };
      const visible = await visibleProjectIds(strapi, ctx);
      const hidden = rows.some((t) => (t.projects || []).length && !(t.projects || []).some((p) => visible.has(p.id)));
      if (hidden) return { error: 'You can only link tasks you can see' };
    }
    out.tasks = tids;
  }
  return { data: out };
}

async function afterKrWrite(strapi, ctx, kr) {
  if (kr.metricType === 'tasks') await G.recomputeTaskKeyResult(strapi, kr.id, { authorId: uid(ctx) });
  else {
    const progress = G.metricProgress(kr.startValue, kr.targetValue, kr.currentValue);
    if (G.num(kr.progress) !== progress) await strapi.entityService.update(G.KR_UID, kr.id, { data: { progress } });
  }
  await G.recomputeObjective(strapi, G.relId(kr.objective));
}

async function respondObjective(strapi, ctx, id) {
  const o = await loadObjective(strapi, ctx, id);
  if (!o) return { data: null };
  const visible = await visibleProjectIds(strapi, ctx);
  return { data: serializeObjective(ctx, o, visible, { detail: true }), meta: { canCreate: true } };
}

module.exports = ({ strapi }) => ({
  /** GET /goals/objectives?status=&period=&ownerId=&mine=1 */
  async listObjectives(ctx) {
    if (!guard(ctx)) return;
    const q = ctx.query || {};
    const filters = { organization: { id: ctx.state.orgId } };
    if (q.status && q.status !== 'all') filters.status = q.status;
    else if (!q.status) filters.status = { $ne: 'archived' };
    if (q.period) filters.periodLabel = String(q.period);
    if (q.scope) filters.scope = String(q.scope);
    if (intId(q.ownerId)) filters.owner = { id: intId(q.ownerId) };
    if (q.mine === '1' || q.mine === 'true') filters.$or = [{ owner: { id: uid(ctx) } }, { keyResults: { owner: { id: uid(ctx) } } }];
    const rows = await strapi.entityService.findMany(G.OBJECTIVE_UID, {
      filters,
      populate: OBJECTIVE_POPULATE,
      sort: [{ createdAt: 'desc' }],
      limit: 500,
    });
    const list = rows.filter((o) => canSeeObjective(ctx, o)).map((o) => serializeObjective(ctx, o, null));
    const periods = [...new Set((await strapi.entityService.findMany(G.OBJECTIVE_UID, {
      filters: { organization: { id: ctx.state.orgId } },
      fields: ['periodLabel'],
      limit: 1000,
    })).map((r) => r.periodLabel).filter(Boolean))].sort().reverse();
    ctx.set('Cache-Control', 'no-store');
    return { data: list, meta: { periods, canManageAll: isGoalAdmin(ctx) } };
  },

  async getObjective(ctx) {
    if (!guard(ctx)) return;
    const res = await respondObjective(strapi, ctx, ctx.params.id);
    if (!res.data) return ctx.notFound('Objective not found');
    ctx.set('Cache-Control', 'no-store');
    return res;
  },

  async createObjective(ctx) {
    if (!guard(ctx)) return;
    const b = body(ctx);
    const { data, error } = normalizeObjective(b, true);
    if (error) return ctx.badRequest(error);
    const owner = await validOwner(strapi, ctx, b.ownerId === undefined ? uid(ctx) : b.ownerId);
    if (owner.error) return ctx.badRequest(owner.error);
    if (b.parentId) {
      const parent = await loadObjective(strapi, ctx, b.parentId);
      if (!parent) return ctx.badRequest('Parent objective not found');
      data.parent = parent.id;
    }
    const entry = await strapi.entityService.create(G.OBJECTIVE_UID, {
      data: { ...data, owner: owner.id ?? null, createdByUser: uid(ctx), organization: ctx.state.orgId, progress: 0 },
    });
    // Key results can be created together with the objective.
    const krs = Array.isArray(b.keyResults) ? b.keyResults.slice(0, 20) : [];
    for (const [i, krBody] of krs.entries()) {
      const res = await createKr(strapi, ctx, entry, { sortOrder: i, ...krBody });
      if (res.error) return ctx.badRequest(res.error);
    }
    ctx.status = 201;
    return respondObjective(strapi, ctx, entry.id);
  },

  async updateObjective(ctx) {
    if (!guard(ctx)) return;
    const o = await loadObjective(strapi, ctx, ctx.params.id);
    if (!o) return ctx.notFound('Objective not found');
    if (!canEditObjective(ctx, o)) return ctx.forbidden('Only the owner or a manager can edit this objective');
    const b = body(ctx);
    const { data, error } = normalizeObjective({ startDate: o.startDate, endDate: o.endDate, ...b }, false);
    if (error) return ctx.badRequest(error);
    const owner = await validOwner(strapi, ctx, b.ownerId);
    if (owner.error) return ctx.badRequest(owner.error);
    if (!owner.skip) data.owner = owner.id;
    if (b.parentId !== undefined) {
      if (!b.parentId) data.parent = null;
      else {
        const parent = await loadObjective(strapi, ctx, b.parentId);
        if (!parent || parent.id === o.id) return ctx.badRequest('Parent objective not found');
        data.parent = parent.id;
      }
    }
    await strapi.entityService.update(G.OBJECTIVE_UID, o.id, { data });
    return respondObjective(strapi, ctx, o.id);
  },

  async deleteObjective(ctx) {
    if (!guard(ctx)) return;
    const o = await loadObjective(strapi, ctx, ctx.params.id);
    if (!o) return ctx.notFound('Objective not found');
    if (!canEditObjective(ctx, o)) return ctx.forbidden('Only the owner or a manager can delete this objective');
    for (const kr of o.keyResults || []) await deleteKrCascade(strapi, kr.id);
    await strapi.entityService.delete(G.OBJECTIVE_UID, o.id);
    return { data: { id: o.id } };
  },

  /** POST /goals/objectives/:id/key-results */
  async createKeyResult(ctx) {
    if (!guard(ctx)) return;
    const o = await loadObjective(strapi, ctx, ctx.params.id);
    if (!o) return ctx.notFound('Objective not found');
    if (!canEditObjective(ctx, o)) return ctx.forbidden('Only the owner or a manager can add key results');
    const res = await createKr(strapi, ctx, o, { sortOrder: (o.keyResults || []).length, ...body(ctx) });
    if (res.error) return ctx.badRequest(res.error);
    ctx.status = 201;
    return respondObjective(strapi, ctx, o.id);
  },

  async updateKeyResult(ctx) {
    if (!guard(ctx)) return;
    const loaded = await loadKrWithObjective(strapi, ctx, ctx.params.id);
    if (!loaded) return ctx.notFound('Key result not found');
    const { kr, objective } = loaded;
    if (!canEditObjective(ctx, objective)) return ctx.forbidden('Only the owner or a manager can edit key results');
    const b = body(ctx);
    const { data, error } = normalizeKr(b, false, kr);
    if (error) return ctx.badRequest(error);
    const owner = await validOwner(strapi, ctx, b.ownerId);
    if (owner.error) return ctx.badRequest(owner.error);
    if (!owner.skip) data.owner = owner.id;
    const links = await validLinks(strapi, ctx, b);
    if (links.error) return ctx.badRequest(links.error);
    // Keep links the caller can't see when they edit the list (they only send what they see).
    if (links.data.tasks) {
      const visible = await visibleProjectIds(strapi, ctx);
      const hidden = (kr.tasks || []).filter((t) => (t.projects || []).length && !(t.projects || []).some((p) => visible.has(p.id))).map((t) => t.id);
      links.data.tasks = [...new Set([...links.data.tasks, ...hidden])];
    }
    const updated = await strapi.entityService.update(G.KR_UID, kr.id, { data: { ...data, ...links.data }, populate: { objective: { fields: ['id'] } } });
    await afterKrWrite(strapi, ctx, updated);
    return respondObjective(strapi, ctx, objective.id);
  },

  async deleteKeyResult(ctx) {
    if (!guard(ctx)) return;
    const loaded = await loadKrWithObjective(strapi, ctx, ctx.params.id);
    if (!loaded) return ctx.notFound('Key result not found');
    if (!canEditObjective(ctx, loaded.objective)) return ctx.forbidden('Only the owner or a manager can delete key results');
    await deleteKrCascade(strapi, loaded.kr.id);
    await G.recomputeObjective(strapi, loaded.objective.id);
    return respondObjective(strapi, ctx, loaded.objective.id);
  },

  /** GET /goals/key-results/:id/check-ins → history, newest first */
  async listCheckIns(ctx) {
    if (!guard(ctx)) return;
    const loaded = await loadKrWithObjective(strapi, ctx, ctx.params.id);
    if (!loaded) return ctx.notFound('Key result not found');
    const rows = await strapi.entityService.findMany(G.CHECKIN_UID, {
      filters: { keyResult: { id: loaded.kr.id } },
      populate: { author: { fields: USER_FIELDS } },
      sort: [{ createdAt: 'desc' }, { id: 'desc' }],
      limit: 200,
    });
    ctx.set('Cache-Control', 'no-store');
    return {
      data: rows.map((c) => ({
        id: c.id,
        value: c.value == null ? null : G.num(c.value),
        progress: c.progress == null ? null : G.r1(c.progress),
        confidence: c.confidence || null,
        note: c.note || '',
        source: c.source || 'manual',
        author: person(c.author),
        createdAt: c.createdAt,
      })),
      meta: { canCheckIn: canCheckIn(ctx, loaded.objective, loaded.kr) && loaded.kr.metricType !== 'tasks' },
    };
  },

  /** POST /goals/key-results/:id/check-ins { value, confidence, note } */
  async createCheckIn(ctx) {
    if (!guard(ctx)) return;
    const loaded = await loadKrWithObjective(strapi, ctx, ctx.params.id);
    if (!loaded) return ctx.notFound('Key result not found');
    const { kr, objective } = loaded;
    if (!canCheckIn(ctx, objective, kr)) return ctx.forbidden('Only the owner or a manager can check in');
    const b = body(ctx);
    const confidence = b.confidence === undefined || b.confidence === null || b.confidence === '' ? null : b.confidence;
    if (confidence && !G.CONFIDENCE.includes(confidence)) return ctx.badRequest('Unknown confidence');
    const note = String(b.note || '').slice(0, 2000);
    let value = G.num(kr.currentValue);
    if (kr.metricType === 'tasks') {
      // Task-based progress comes from the linked tasks; a check-in only adds a note / confidence.
      if (!note && !confidence) return ctx.badRequest('Task-based key results update from their tasks; add a note or confidence');
    } else {
      if (b.value === undefined || b.value === null || b.value === '' || !Number.isFinite(Number(b.value))) return ctx.badRequest('Enter the current value');
      value = Number(b.value);
    }
    const progress = kr.metricType === 'tasks' ? G.r1(kr.progress) : G.metricProgress(kr.startValue, kr.targetValue, value);
    const now = new Date().toISOString();
    await strapi.entityService.create(G.CHECKIN_UID, {
      data: { value, progress, confidence, note, source: 'manual', keyResult: kr.id, author: uid(ctx), organization: ctx.state.orgId },
    });
    await strapi.entityService.update(G.KR_UID, kr.id, {
      data: { currentValue: value, progress, lastCheckInAt: now, ...(confidence ? { confidence } : {}) },
    });
    await G.recomputeObjective(strapi, objective.id);
    ctx.status = 201;
    return respondObjective(strapi, ctx, objective.id);
  },

  /** GET /goals/linked?projectId= → objectives with key results linked to the project or its tasks */
  async linked(ctx) {
    if (!guard(ctx)) return;
    const project = await loadProjectForAccess(strapi, ctx, ctx.query?.projectId);
    if (!project) return ctx.notFound('Project not found');
    const krs = await strapi.entityService.findMany(G.KR_UID, {
      filters: {
        organization: { id: ctx.state.orgId },
        $or: [{ projects: { id: project.id } }, { tasks: { projects: { id: project.id } } }],
      },
      fields: ['id'],
      populate: { objective: { fields: ['id'] } },
      limit: 500,
    });
    const objectiveIds = [...new Set(krs.map((k) => G.relId(k.objective)).filter(Boolean))];
    const linkedKrIds = new Set(krs.map((k) => k.id));
    const out = [];
    if (objectiveIds.length) {
      const rows = await strapi.entityService.findMany(G.OBJECTIVE_UID, {
        filters: { id: { $in: objectiveIds }, status: { $ne: 'archived' } },
        populate: OBJECTIVE_POPULATE,
        limit: 200,
      });
      for (const o of rows) {
        if (!canSeeObjective(ctx, o)) continue;
        const s = serializeObjective(ctx, o, null);
        out.push({ ...s, keyResults: s.keyResults.filter((k) => linkedKrIds.has(k.id)) });
      }
    }
    ctx.set('Cache-Control', 'no-store');
    return { data: out };
  },
});

async function createKr(strapi, ctx, objective, b) {
  const { data, error } = normalizeKr(b, true);
  if (error) return { error };
  const owner = await validOwner(strapi, ctx, b.ownerId === undefined ? G.relId(objective.owner) : b.ownerId);
  if (owner.error) return { error: owner.error };
  const links = await validLinks(strapi, ctx, b);
  if (links.error) return { error: links.error };
  const entry = await strapi.entityService.create(G.KR_UID, {
    data: { ...data, ...links.data, owner: owner.id ?? null, objective: objective.id, organization: ctx.state.orgId, progress: 0 },
    populate: { objective: { fields: ['id'] } },
  });
  await afterKrWrite(strapi, ctx, entry);
  return { entry };
}

async function deleteKrCascade(strapi, krId) {
  const checkIns = await strapi.entityService.findMany(G.CHECKIN_UID, { filters: { keyResult: { id: krId } }, fields: ['id'], limit: 10000 });
  for (const c of checkIns) await strapi.entityService.delete(G.CHECKIN_UID, c.id);
  await strapi.entityService.delete(G.KR_UID, krId);
}
