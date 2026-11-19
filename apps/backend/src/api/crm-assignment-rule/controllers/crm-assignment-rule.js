'use strict';

/**
 * Lead assignment rules + first-contact SLA (G5).
 * Rules/SLA settings: read for CRM members, write for CRM settings managers.
 * SLA summary: managers see the whole org, others only their own leads.
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { orgIdFromRelation } = require('../../../utils/content-api-helpers');
const { requireAppSettingsManage, requireModuleAccess, canAccess } = require('../../../utils/rbac');
const { RULE_UID, pickAssignee } = require('../../../utils/lead-assignment');
const { getSetting, setSetting } = require('../../../utils/crm-org-settings');

const LEAD_UID = 'api::lead-company.lead-company';
const CLOSED = ['LOST', 'CONVERTED'];
const STRATEGIES = ['round_robin', 'load_based'];
const MATCH_KEYS = ['cities', 'states', 'pincodes', 'sources', 'industries'];
const MAX_RULES = 50;

function cleanList(v) {
  const arr = Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : [];
  return [...new Set(arr.map((x) => String(x).trim()).filter(Boolean))].slice(0, 200);
}

function normalizeRule(body, { creating }) {
  const data = {};
  if (creating || body.name !== undefined) {
    const name = String(body.name || '').trim();
    if (!name) return { error: 'Rule name is required' };
    data.name = name.slice(0, 120);
  }
  if (body.strategy !== undefined || creating) {
    const s = body.strategy || 'round_robin';
    if (!STRATEGIES.includes(s)) return { error: `Strategy must be one of: ${STRATEGIES.join(', ')}` };
    data.strategy = s;
  }
  if (body.enabled !== undefined) data.enabled = Boolean(body.enabled);
  if (body.sortOrder !== undefined) data.sortOrder = parseInt(body.sortOrder, 10) || 0;
  if (body.maxOpenLeads !== undefined) {
    const n = parseInt(body.maxOpenLeads, 10);
    data.maxOpenLeads = Number.isFinite(n) && n > 0 ? n : null;
  }
  if (body.match !== undefined) {
    const m = body.match && typeof body.match === 'object' ? body.match : {};
    data.match = Object.fromEntries(MATCH_KEYS.map((k) => [k, cleanList(m[k])]).filter(([, v]) => v.length));
  }
  if (body.assigneeIds !== undefined || creating) {
    const ids = [...new Set((Array.isArray(body.assigneeIds) ? body.assigneeIds : []).map(Number).filter((n) => n > 0))];
    if (!ids.length) return { error: 'Pick at least one teammate to assign leads to' };
    data.assigneeIds = ids;
    data.lastAssignedIndex = -1;
  }
  return { data };
}

async function memberIds(strapi, orgId) {
  const rows = await strapi.entityService.findMany('api::organization-user.organization-user', {
    filters: { organization: orgId },
    populate: { user: { fields: ['id'] } },
    limit: 2000,
  });
  return new Set(rows.map((r) => Number(r.user?.id)).filter(Boolean));
}

function serialize(row) {
  if (!row) return row;
  const { organization, ...rest } = row;
  return { ...rest, match: rest.match || {}, assigneeIds: Array.isArray(rest.assigneeIds) ? rest.assigneeIds : [] };
}

async function loadOwned(strapi, ctx) {
  const id = parseInt(String(ctx.params.id), 10);
  if (Number.isNaN(id)) return null;
  const row = await strapi.entityService.findOne(RULE_UID, id, { populate: ['organization'] });
  if (!row || orgIdFromRelation(row.organization) !== ctx.state.orgId) return null;
  return row;
}

function guard(ctx) {
  if (!ctx.state.user) {
    ctx.unauthorized('Missing or invalid credentials');
    return false;
  }
  if (!ctx.state.orgId) {
    ctx.forbidden('No active organization');
    return false;
  }
  return true;
}

module.exports = createCoreController(RULE_UID, ({ strapi }) => ({
  async find(ctx) {
    if (!guard(ctx)) return;
    const denied = requireModuleAccess(ctx, 'crm', 'leads', 'read');
    if (denied) return denied;
    const rows = await strapi.entityService.findMany(RULE_UID, {
      filters: { organization: ctx.state.orgId },
      sort: [{ sortOrder: 'asc' }, { id: 'asc' }],
      limit: MAX_RULES,
    });
    ctx.set('Cache-Control', 'no-store');
    return { data: rows.map(serialize), meta: { strategies: STRATEGIES, matchKeys: MATCH_KEYS } };
  },

  async create(ctx) {
    if (!guard(ctx)) return;
    const denied = requireAppSettingsManage(ctx);
    if (denied) return denied;
    const body = ctx.request?.body?.data || ctx.request?.body || {};
    const { data, error } = normalizeRule(body, { creating: true });
    if (error) return ctx.badRequest(error);
    const members = await memberIds(strapi, ctx.state.orgId);
    if (data.assigneeIds.some((id) => !members.has(id))) return ctx.badRequest('Assignees must be members of this organization');
    const count = await strapi.db.query(RULE_UID).count({ where: { organization: ctx.state.orgId } });
    if (count >= MAX_RULES) return ctx.badRequest(`At most ${MAX_RULES} rules`);
    if (data.sortOrder === undefined) data.sortOrder = count;
    const entry = await strapi.entityService.create(RULE_UID, { data: { ...data, organization: ctx.state.orgId } });
    return { data: serialize(entry) };
  },

  async update(ctx) {
    if (!guard(ctx)) return;
    const denied = requireAppSettingsManage(ctx);
    if (denied) return denied;
    const row = await loadOwned(strapi, ctx);
    if (!row) return ctx.notFound('Rule not found');
    const body = ctx.request?.body?.data || ctx.request?.body || {};
    const { data, error } = normalizeRule(body, { creating: false });
    if (error) return ctx.badRequest(error);
    if (data.assigneeIds) {
      const members = await memberIds(strapi, ctx.state.orgId);
      if (data.assigneeIds.some((id) => !members.has(id))) return ctx.badRequest('Assignees must be members of this organization');
    }
    const entry = await strapi.entityService.update(RULE_UID, row.id, { data });
    return { data: serialize(entry) };
  },

  async delete(ctx) {
    if (!guard(ctx)) return;
    const denied = requireAppSettingsManage(ctx);
    if (denied) return denied;
    const row = await loadOwned(strapi, ctx);
    if (!row) return ctx.notFound('Rule not found');
    await strapi.entityService.delete(RULE_UID, row.id);
    return { data: { id: row.id } };
  },

  /** POST /crm-assignment-rules/test { city, state, zipCode, source, industry } → who would get it (dry run, no pointer move). */
  async test(ctx) {
    if (!guard(ctx)) return;
    const denied = requireAppSettingsManage(ctx);
    if (denied) return denied;
    const body = ctx.request?.body?.data || ctx.request?.body || {};
    const lead = {
      city: body.city,
      state: body.state,
      zipCode: body.zipCode,
      source: body.source,
      industry: body.industry,
    };
    // Dry run inside a transaction we roll back, so the round-robin pointer doesn't advance.
    let pick = null;
    try {
      await strapi.db.transaction(async ({ rollback }) => {
        pick = await pickAssignee(strapi, ctx.state.orgId, lead);
        await rollback();
      });
    } catch (_) {
      /* rollback throws in some drivers; result already captured */
    }
    return { data: pick };
  },

  async getSla(ctx) {
    if (!guard(ctx)) return;
    const denied = requireModuleAccess(ctx, 'crm', 'leads', 'read');
    if (denied) return denied;
    const [sla, assignment] = await Promise.all([
      getSetting(strapi, ctx.state.orgId, 'lead_sla'),
      getSetting(strapi, ctx.state.orgId, 'lead_assignment'),
    ]);
    ctx.set('Cache-Control', 'no-store');
    return { data: { sla, assignment } };
  },

  /** PUT /crm-lead-sla { sla: { enabled, firstContactMinutes, reassignOnBreach }, assignment: { applyToRepCreated } } */
  async setSla(ctx) {
    if (!guard(ctx)) return;
    const denied = requireAppSettingsManage(ctx);
    if (denied) return denied;
    const body = ctx.request?.body?.data || ctx.request?.body || {};
    if (body.sla) {
      const mins = parseInt(body.sla.firstContactMinutes, 10);
      if (!Number.isFinite(mins) || mins < 5 || mins > 60 * 24 * 14) {
        return ctx.badRequest('First-contact time must be between 5 minutes and 14 days');
      }
      await setSetting(strapi, ctx.state.orgId, 'lead_sla', {
        enabled: Boolean(body.sla.enabled),
        firstContactMinutes: mins,
        reassignOnBreach: Boolean(body.sla.reassignOnBreach),
      });
    }
    if (body.assignment) {
      await setSetting(strapi, ctx.state.orgId, 'lead_assignment', {
        applyToRepCreated: Boolean(body.assignment.applyToRepCreated),
      });
    }
    return this.getSla(ctx);
  },

  /** GET /crm-lead-sla/summary → { breached, dueSoon, items: [...] } for the dashboard widget. */
  async slaSummary(ctx) {
    if (!guard(ctx)) return;
    const denied = requireModuleAccess(ctx, 'crm', 'leads', 'read');
    if (denied) return denied;
    const sla = await getSetting(strapi, ctx.state.orgId, 'lead_sla');
    const base = {
      organization: ctx.state.orgId,
      firstContactedAt: { $null: true },
      status: { $notIn: CLOSED },
    };
    if (!canAccess(ctx, 'crm', 'leads', 'manage')) base.assignedTo = ctx.state.user.id;
    const now = new Date();
    const soon = new Date(now.getTime() + 60 * 60000).toISOString();
    const [breachedRows, dueSoon] = await Promise.all([
      strapi.entityService.findMany(LEAD_UID, {
        filters: { ...base, slaBreachedAt: { $notNull: true } },
        fields: ['id', 'companyName', 'firstContactDueAt', 'slaBreachedAt', 'source'],
        populate: { assignedTo: { fields: ['id', 'username', 'firstName', 'lastName', 'email'] } },
        sort: [{ firstContactDueAt: 'asc' }],
        limit: 10,
      }),
      strapi.db.query(LEAD_UID).count({
        where: { ...base, slaBreachedAt: null, firstContactDueAt: { $gte: now.toISOString(), $lte: soon } },
      }),
    ]);
    const breached = await strapi.db.query(LEAD_UID).count({ where: { ...base, slaBreachedAt: { $notNull: true } } });
    ctx.set('Cache-Control', 'no-store');
    return {
      data: {
        enabled: Boolean(sla?.enabled),
        firstContactMinutes: sla?.firstContactMinutes,
        breached,
        dueSoon,
        items: breachedRows.map((r) => ({
          id: r.id,
          companyName: r.companyName,
          source: r.source,
          firstContactDueAt: r.firstContactDueAt,
          slaBreachedAt: r.slaBreachedAt,
          owner: r.assignedTo
            ? {
                id: r.assignedTo.id,
                name:
                  [r.assignedTo.firstName, r.assignedTo.lastName].filter(Boolean).join(' ') ||
                  r.assignedTo.username ||
                  r.assignedTo.email,
              }
            : null,
        })),
      },
    };
  },
}));
