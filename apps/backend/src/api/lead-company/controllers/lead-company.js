'use strict';

/**
 * lead-company controller
 * - Requires authenticated user (ctx.state.user set by global jwt-auth middleware).
 * - All data is scoped to ctx.state.orgId (tenant isolation).
 * - On create, organization is auto-set from ctx.state.orgId.
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { applyCustomFields, applyCustomFieldFilter } = require('../../../utils/crm-custom-fields');
const { applyAssignmentOnCreate, applyFirstContactOnUpdate } = require('../../../utils/lead-assignment');
const { getSetting } = require('../../../utils/crm-org-settings');
const { logCrmActivity, collectChangedKeys, actorDisplayName } = require('../../../utils/crm-activity-log');
const { emitUpdateNotifications, assignedStakeholderIds, notifyUsers } = require('../../../utils/notification-emitter');
const {
  orgIdFromRelation,
  extractQueryFilters,
  readListQuery,
  createPopulateSanitizer,
  safeCount,
} = require('../../../utils/content-api-helpers');
const { canAccess, requireModuleAccess, requireOwnerOrModuleManage } = require('../../../utils/rbac');
const {
  attachRelationsToLeadCompanies,
  assignedToUserIdFromFilters,
  leadCompanyIdsForAssignedUser,
} = require('../../../utils/crm-relation-attach');

const UID = 'api::lead-company.lead-company';
const CONTACT_UID = 'api::contact.contact';
const CLIENT_ACCOUNT_UID = 'api::client-account.client-account';
const { leadStatusKeys, ensurePipelines, defaultPipeline } = require('../../../utils/crm-pipeline');

/** Fallback list; the real list is per org (crm-pipeline entity=lead, ticket G2). */
const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'LOST', 'CONVERTED'];

/** Allowed populate keys for lead-company — unknown keys cause 500s in Strapi 5 */
const LEAD_POPULATE_FALLBACK = ['assignedTo', 'organization'];
const sanitizePopulate = createPopulateSanitizer(
  new Set(['assignedTo', 'organization', 'contacts', 'convertedAccount']),
  LEAD_POPULATE_FALLBACK
);

function normalizeLeadStatus(value) {
  if (value == null) return null;
  const normalized = String(value).trim().toUpperCase();
  return normalized || null;
}

/** Legacy CLIENT → QUALIFIED (or CONVERTED when already linked to a client account). */
function remapLegacyClientStatus(status, hasConvertedAccount) {
  const normalized = normalizeLeadStatus(status);
  if (normalized !== 'CLIENT') return normalized;
  return hasConvertedAccount ? 'CONVERTED' : 'QUALIFIED';
}

function validateAndApplyLeadStatus(ctx, data, allowed = LEAD_STATUSES) {
  if (!Object.prototype.hasOwnProperty.call(data, 'status')) return;
  let normalized = normalizeLeadStatus(data.status);
  if (!normalized) {
    delete data.status;
    return;
  }
  // Accept legacy CLIENT writes and store as QUALIFIED
  if (normalized === 'CLIENT') {
    normalized = 'QUALIFIED';
  }
  if (!allowed.includes(normalized)) {
    ctx.badRequest(`Invalid lead status "${data.status}". Allowed statuses: ${allowed.join(', ')}`);
    return ctx.body || true; // ctx.badRequest returns undefined; callers stop on a truthy value
  }
  data.status = normalized;
  return null;
}

/** Persist remapped CLIENT statuses so list/stats stay consistent. */
async function persistRemappedClientStatuses(strapi, rows) {
  if (!Array.isArray(rows) || !rows.length) return rows;
  for (const row of rows) {
    if (!row || normalizeLeadStatus(row.status) !== 'CLIENT') continue;
    const next = remapLegacyClientStatus(row.status, Boolean(row.convertedAccount));
    try {
      await strapi.entityService.update(UID, row.id, { data: { status: next } });
      row.status = next;
    } catch (err) {
      strapi.log.warn(
        'lead-company CLIENT→%s remap failed for %s: %s',
        next,
        row.id,
        err?.message || String(err)
      );
    }
  }
  return rows;
}

function canManageLeadCompanies(ctx) {
  return canAccess(ctx, 'crm', 'leads', 'manage');
}

/** Merge client filters while always enforcing tenant org scope. */
function buildLeadListFilters(orgId, extra) {
  const orgFilter = { organization: orgId };
  if (!extra || typeof extra !== 'object' || Array.isArray(extra)) return orgFilter;

  const merged = { ...extra };
  delete merged.organization;

  // QUALIFIED tab should include legacy CLIENT rows until remapped
  if (merged.status != null) {
    const statusVal =
      typeof merged.status === 'object' && merged.status.$eq != null
        ? String(merged.status.$eq).toUpperCase()
        : String(merged.status).toUpperCase();
    if (statusVal === 'QUALIFIED') {
      merged.status = { $in: ['QUALIFIED', 'CLIENT'] };
    } else if (statusVal === 'CLIENT') {
      merged.status = { $in: ['QUALIFIED', 'CLIENT'] };
    }
  }

  const keys = Object.keys(merged).filter((k) => merged[k] != null && merged[k] !== '');
  if (!keys.length) return orgFilter;

  if (!merged.$or && !merged.$and && keys.length <= 6) {
    return { ...orgFilter, ...merged };
  }

  return { $and: [orgFilter, merged] };
}

/** Apply assignedTo filter via link table when present (Strapi 5 relation filter is unreliable). */
async function buildLeadListFiltersResolved(strapi, orgId, extra) {
  const assignedUserId = assignedToUserIdFromFilters(extra);
  if (assignedUserId == null) return buildLeadListFilters(orgId, extra);

  const { assignedTo, ...rest } = extra || {};
  const uid = parseInt(assignedUserId, 10);

  const [linkIds, entityRows] = await Promise.all([
    leadCompanyIdsForAssignedUser(strapi, assignedUserId),
    Number.isNaN(uid)
      ? []
      : strapi.entityService
          .findMany(UID, {
            filters: buildLeadListFilters(orgId, { assignedTo: { id: uid } }),
            fields: ['id'],
            limit: 5000,
          })
          .catch(() => []),
  ]);

  const leadIds = [
    ...new Set([
      ...linkIds,
      ...(entityRows || []).map((row) => row.id).filter((id) => id != null),
    ]),
  ];
  const idFilter = leadIds.length ? { id: { $in: leadIds } } : { id: { $in: [-1] } };
  return buildLeadListFilters(orgId, { ...rest, ...idFilter });
}

module.exports = createCoreController(UID, ({ strapi }) => ({
  async statuses(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'crm', 'leads', 'read');
    if (denied) return denied;
    let stages = [];
    try {
      stages = defaultPipeline(await ensurePipelines(strapi, ctx.state.orgId, 'lead'))?.stages || [];
    } catch (_) {
      stages = [];
    }
    if (!stages.length) stages = LEAD_STATUSES.map((key) => ({ key, label: key.replace(/_/g, ' ') }));
    return {
      data: stages.map((s) => ({ value: s.key, label: s.label, color: s.color, kind: s.kind })),
    };
  },

  async stats(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'crm', 'leads', 'read');
    if (denied) return denied;

    const orgId = ctx.state.orgId;
    const base = { organization: orgId };
    const byStatus = {};

    const orgStatuses = await leadStatusKeys(strapi, orgId);
    await Promise.all(
      orgStatuses.map(async (status) => {
        byStatus[status] = await safeCount(strapi, UID, { ...base, status }, 0);
      })
    );
    // Fold legacy CLIENT into QUALIFIED until records are remapped
    const legacyClientCount = await safeCount(strapi, UID, { ...base, status: 'CLIENT' }, 0);
    byStatus.QUALIFIED = (byStatus.QUALIFIED || 0) + legacyClientCount;
    byStatus.total = await safeCount(strapi, UID, base, 0);

    let facets = { sources: [], types: [] };
    try {
      const rows = await strapi.entityService.findMany(UID, {
        filters: base,
        fields: ['source', 'type'],
        limit: 5000,
      });
      const sources = new Set();
      const types = new Set();
      for (const row of rows || []) {
        if (row?.source) sources.add(String(row.source).toUpperCase());
        if (row?.type) types.add(String(row.type));
      }
      facets = {
        sources: [...sources].sort((a, b) => a.localeCompare(b)),
        types: [...types].sort((a, b) => a.localeCompare(b)),
      };
    } catch (err) {
      strapi.log.warn('lead-company stats facets: %s', err?.message || String(err));
    }

    return { data: { byStatus, facets } };
  },

  async find(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'crm', 'leads', 'read');
    if (denied) return denied;

    const { query, page, pageSize, sort } = readListQuery(ctx, {
      maxPageSize: 500,
      defaultPageSize: 100,
    });

    const filters = await buildLeadListFiltersResolved(
      strapi,
      ctx.state.orgId,
      extractQueryFilters(query)
    );

    await applyCustomFieldFilter(strapi, ctx, 'lead', filters);

    const pop = sanitizePopulate(query.populate);
    let results = await strapi.entityService.findMany(UID, {
      filters,
      start: (page - 1) * pageSize,
      limit: pageSize,
      sort,
      populate: pop,
    });

    if (results.length > 0) {
      results = await attachRelationsToLeadCompanies(strapi, ctx.state.orgId, results);
      results = await persistRemappedClientStatuses(strapi, results);
    }

    const total = await safeCount(strapi, UID, filters, results.length);
    const pageCount = Math.ceil(Math.max(total, 1) / pageSize);
    return { data: results, meta: { pagination: { page, pageSize, pageCount, total } } };
  },

  async findOne(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'crm', 'leads', 'read');
    if (denied) return denied;

    const { id } = ctx.params;
    const pop = sanitizePopulate(ctx.query?.populate);
    let entry = await strapi.entityService.findOne(UID, id, {
      populate: pop,
    });
    if (!entry) return ctx.notFound();
    if (orgIdFromRelation(entry.organization) !== ctx.state.orgId) {
      return ctx.forbidden('Access denied');
    }
    entry = await attachRelationsToLeadCompanies(strapi, ctx.state.orgId, [entry]).then(
      (rows) => rows[0]
    );
    await persistRemappedClientStatuses(strapi, [entry]);
    return { data: entry };
  },

  async create(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'crm', 'leads', 'write');
    if (denied) return denied;

    const body = ctx.request?.body || {};
    const payload = body.data || body;
    const data = typeof payload === 'object' ? { ...payload } : {};

    // Force org; owner = explicit choice (managers), else assignment rules (G5), else the creator
    data.organization = ctx.state.orgId;
    const isManager = canManageLeadCompanies(ctx);
    delete data.assignedByRule;
    delete data.firstContactDueAt;
    delete data.firstContactedAt;
    delete data.slaBreachedAt;
    let explicitOwner = isManager && data.assignedTo != null && data.assignedTo !== '';
    if (!isManager) {
      data.assignedTo = ctx.state.user.id;
      const prefs = await getSetting(strapi, ctx.state.orgId, 'lead_assignment');
      explicitOwner = !prefs?.applyToRepCreated;
    }
    await applyAssignmentOnCreate(strapi, ctx.state.orgId, data, {
      explicitOwner,
      fallbackUserId: ctx.state.user?.id,
    });
    const statusErr = validateAndApplyLeadStatus(
      ctx,
      data,
      data.status != null ? await leadStatusKeys(strapi, ctx.state.orgId) : undefined
    );
    if (statusErr) return statusErr;

    const customFieldError = await applyCustomFields(strapi, ctx.state.orgId, 'lead', data, null);
    if (customFieldError) return ctx.badRequest(customFieldError);

    const entry = await strapi.entityService.create(UID, { data });
    if (data.assignedByRule && Number(data.assignedTo) !== Number(ctx.state.user?.id)) {
      await notifyUsers(strapi, {
        userIds: [Number(data.assignedTo)],
        organizationId: ctx.state.orgId,
        type: 'lead_assigned',
        title: `New lead assigned to you: ${entry.companyName}`,
        message: `Assigned by the "${data.assignedByRule}" rule`,
        data: { subjectType: 'lead_company', subjectId: entry.id, href: `/sales/lead-companies/${entry.id}` },
      });
    }
    try {
      await logCrmActivity(strapi, {
        organizationId: ctx.state.orgId,
        actorUserId: ctx.state.user?.id,
        action: 'create',
        subjectType: 'lead_company',
        entity: entry,
        changedKeys: null,
      });
    } catch (_) {
      /* best-effort */
    }
    return { data: entry };
  },

  async update(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'crm', 'leads', 'write');
    if (denied) return denied;
    const { id } = ctx.params;

    const existing = await strapi.entityService.findOne(UID, id, {
      populate: ['organization', 'assignedTo'],
    });
    if (!existing) return ctx.notFound();
    if (orgIdFromRelation(existing.organization) !== ctx.state.orgId) {
      return ctx.forbidden('Access denied');
    }
    const ownershipDenied = requireOwnerOrModuleManage(
      ctx,
      'crm',
      'leads',
      existing,
      'You can only edit lead companies assigned to you'
    );
    if (ownershipDenied) return ownershipDenied;

    const body = ctx.request?.body || {};
    const payload = body.data || body;
    const data = typeof payload === 'object' ? { ...payload } : {};
    delete data.organization;
    delete data.firstContactDueAt;
    delete data.firstContactedAt;
    delete data.slaBreachedAt;
    delete data.assignedByRule;
    if (!canManageLeadCompanies(ctx)) {
      delete data.assignedTo;
    }
    const statusErr = validateAndApplyLeadStatus(
      ctx,
      data,
      data.status != null ? await leadStatusKeys(strapi, ctx.state.orgId) : undefined
    );
    if (statusErr) return statusErr;

    const customFieldError = await applyCustomFields(strapi, ctx.state.orgId, 'lead', data, existing);
    if (customFieldError) return ctx.badRequest(customFieldError);
    applyFirstContactOnUpdate(data, existing);
    if (data.assignedTo != null && Number(data.assignedTo?.id ?? data.assignedTo) !== Number(existing.assignedTo?.id)) {
      data.assignedByRule = null;
    }

    const entry = await strapi.entityService.update(UID, id, { data });
    const changedKeys = collectChangedKeys(data);
    try {
      const actorName = await actorDisplayName(strapi, ctx.state.user?.id);
      await emitUpdateNotifications(strapi, {
        organizationId: ctx.state.orgId,
        actorUserId: ctx.state.user?.id,
        actorName,
        subjectType: 'lead_company',
        subjectId: Number(id),
        entityName: (entry?.companyName || entry?.name || 'Lead').trim() || 'Lead',
        changedKeys,
        stakeholderIds: assignedStakeholderIds(existing),
        previousEntity: existing,
        patch: data,
      });
      await logCrmActivity(strapi, {
        organizationId: ctx.state.orgId,
        actorUserId: ctx.state.user?.id,
        action: 'update',
        subjectType: 'lead_company',
        entity: entry,
        changedKeys,
        previousEntity: existing,
        patch: data,
      });
    } catch (_) {
      /* best-effort */
    }
    return { data: entry };
  },

  /**
   * POST /lead-companies/:id/convert
   * Creates a client-account from this lead company (or links an existing one via
   * body.clientAccountId), marks the lead as CONVERTED, and links contacts.
   */
  async convertToClient(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'crm', 'leads', 'write');
    if (denied) return denied;
    const { id } = ctx.params;
    const body = ctx.request?.body?.data || ctx.request?.body || {};
    const existingClientAccountId =
      body.clientAccountId ?? body.clientAccount?.id ?? null;

    const leadCompany = await strapi.entityService.findOne(UID, id, {
      populate: ['organization', 'assignedTo', 'contacts', 'convertedAccount'],
    });
    if (!leadCompany) return ctx.notFound();
    if (orgIdFromRelation(leadCompany.organization) !== ctx.state.orgId) {
      return ctx.forbidden('Access denied');
    }
    const ownershipDenied = requireOwnerOrModuleManage(
      ctx,
      'crm',
      'leads',
      leadCompany,
      'You can only convert lead companies assigned to you'
    );
    if (ownershipDenied) return ownershipDenied;
    if (leadCompany.status === 'CONVERTED' || leadCompany.convertedAccount != null) {
      return ctx.badRequest('Lead company is already converted to a client account');
    }

    let clientAccount;
    if (existingClientAccountId != null) {
      clientAccount = await strapi.entityService.findOne(
        CLIENT_ACCOUNT_UID,
        existingClientAccountId,
        { populate: ['organization', 'convertedFromLead'] }
      );
      if (!clientAccount) return ctx.notFound('Client account not found');
      if (orgIdFromRelation(clientAccount.organization) !== ctx.state.orgId) {
        return ctx.forbidden('Access denied');
      }
      if (clientAccount.convertedFromLead != null) {
        return ctx.badRequest('Client account is already linked to a lead company');
      }
      clientAccount = await strapi.entityService.update(
        CLIENT_ACCOUNT_UID,
        clientAccount.id,
        {
          data: {
            convertedFromLead: id,
            conversionDate: clientAccount.conversionDate || new Date(),
          },
        }
      );
    } else {
      const clientAccountData = {
        companyName: leadCompany.companyName,
        industry: leadCompany.industry || null,
        type: leadCompany.type || null,
        website: leadCompany.website || null,
        phone: leadCompany.phone || null,
        email: leadCompany.email || null,
        address: leadCompany.address || null,
        city: leadCompany.city || null,
        state: leadCompany.state || null,
        country: leadCompany.country || null,
        zipCode: leadCompany.zipCode || null,
        employees: leadCompany.employees || null,
        founded: leadCompany.founded || null,
        description: leadCompany.description || null,
        linkedIn: leadCompany.linkedIn || null,
        twitter: leadCompany.twitter || null,
        notes: leadCompany.notes || null,
        dealValue: leadCompany.dealValue || 0,
        healthScore: leadCompany.healthScore || 75,
        status: 'ACTIVE',
        conversionDate: new Date(),
        organization: ctx.state.orgId,
        assignedTo: leadCompany.assignedTo?.id ?? ctx.state.user.id,
      };

      clientAccount = await strapi.entityService.create(CLIENT_ACCOUNT_UID, {
        data: clientAccountData,
      });
    }

    // Mark lead as CONVERTED and link to the client account
    const updatedLead = await strapi.entityService.update(UID, id, {
      data: {
        status: 'CONVERTED',
        convertedAt: new Date(),
        convertedAccount: clientAccount.id,
      },
    });

    // Link each contact to the new client account while keeping the lead-company link.
    // Do not rely on inverse populate only; query by leadCompany to guarantee we catch all linked contacts.
    let contacts = [];
    try {
      contacts = await strapi.entityService.findMany(CONTACT_UID, {
        filters: {
          organization: ctx.state.orgId,
          leadCompany: id,
        },
        limit: 5000,
      });
    } catch (err) {
      strapi.log.warn(
        'convertToClient: contact lookup by leadCompany failed, using populated contacts: %s',
        err?.message || String(err)
      );
      contacts = Array.isArray(leadCompany.contacts) ? leadCompany.contacts : [];
    }

    for (const contact of contacts) {
      try {
        await strapi.entityService.update(CONTACT_UID, contact.id, {
          data: { clientAccount: clientAccount.id },
        });
      } catch (err) {
        strapi.log.warn(
          'convertToClient: failed to link contact %s to client account: %s',
          contact.id,
          err?.message || String(err)
        );
      }
    }

    try {
      await logCrmActivity(strapi, {
        organizationId: ctx.state.orgId,
        actorUserId: ctx.state.user?.id,
        action: 'convert',
        subjectType: 'lead_company',
        entity: updatedLead,
        changedKeys: ['status', 'convertedAt', 'convertedAccount'],
      });
    } catch (_) {
      /* best-effort */
    }

    return {
      data: {
        leadCompany: updatedLead,
        clientAccount,
      },
    };
  },

  async delete(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'crm', 'leads', 'manage');
    if (denied) return denied;
    const { id } = ctx.params;

    const existing = await strapi.entityService.findOne(UID, id, {
      populate: ['organization'],
    });
    if (!existing) return ctx.notFound();
    if (orgIdFromRelation(existing.organization) !== ctx.state.orgId) {
      return ctx.forbidden('Access denied');
    }

    try {
      await logCrmActivity(strapi, {
        organizationId: ctx.state.orgId,
        actorUserId: ctx.state.user?.id,
        action: 'delete',
        subjectType: 'lead_company',
        entity: existing,
        changedKeys: null,
      });
    } catch (_) {
      /* best-effort */
    }

    await strapi.entityService.delete(UID, id);
    return { data: { id } };
  },
  /**
   * POST /lead-companies/:id/ai-score  { language?: 'en' | 'hi' | 'mr' }
   * Fudge AI lead score (P5 first consumer; UI in G11). SaaS + AI_ENABLED only, metered in credits.
   */
  async aiScore(ctx) {
    const ai = require('../../../utils/ai');
    if (!ai.requireAiEnabled(ctx)) return ctx.body;
    try {
      const data = await require('../../../utils/ai/grow').scoreLead(strapi, ctx, ctx.params.id, { language: ctx.request.body?.language });
      ctx.body = { data };
      return ctx.body;
    } catch (err) {
      return ai.sendAiError(ctx, err);
    }
  },

  /**
   * POST /lead-companies/:id/ai-followup  { language?, goal?, to? }
   * Drafts a follow-up email and puts it in the approval queue (never sent directly).
   */
  async aiFollowup(ctx) {
    const ai = require('../../../utils/ai');
    if (!ai.requireAiEnabled(ctx)) return ctx.body;
    try {
      const body = ctx.request.body || {};
      const data = await require('../../../utils/ai/grow').draftFollowup(strapi, ctx, ctx.params.id, { language: body.language, goal: body.goal, to: body.to });
      ctx.status = 201;
      ctx.body = { data };
      return ctx.body;
    } catch (err) {
      return ai.sendAiError(ctx, err);
    }
  },

  /**
   * POST /lead-companies/:id/rescore  { ai?: boolean }
   * G11: recalculates the lead score now. Rules always; Fudge AI layer when enabled, configured and
   * the org has credits (falls back to rule reasons otherwise). Works on Internal too (rules only).
   */
  async rescore(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'crm', 'leads', 'read');
    if (denied) return denied;
    const wantAi = ctx.request.body?.ai;
    const data = await require('../../../utils/lead-scoring').rescoreLead(strapi, ctx.params.id, {
      orgId: ctx.state.orgId,
      userId: ctx.state.user.id,
      ai: wantAi === false ? false : undefined,
      trigger: 'manual',
    });
    if (!data) return ctx.notFound('Lead not found.');
    ctx.body = { data };
    return ctx.body;
  },
}));
