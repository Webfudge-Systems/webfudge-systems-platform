'use strict';

/**
 * lead-company controller
 * - Requires authenticated user (ctx.state.user set by global jwt-auth middleware).
 * - All data is scoped to ctx.state.orgId (tenant isolation).
 * - On create, organization is auto-set from ctx.state.orgId.
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { logCrmActivity, collectChangedKeys } = require('../../../utils/crm-activity-log');
const UID = 'api::lead-company.lead-company';
const CONTACT_UID = 'api::contact.contact';
const CLIENT_ACCOUNT_UID = 'api::client-account.client-account';
const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'LOST', 'CONVERTED', 'CLIENT'];

function orgIdFromRelation(rel) {
  if (rel == null) return null;
  if (typeof rel === 'object') return rel.id ?? null;
  return rel;
}

/** Allowed populate keys for lead-company — unknown keys cause 500s in Strapi 5 */
const ALLOWED_POPULATE = new Set(['assignedTo', 'organization', 'contacts', 'convertedAccount']);

function sanitizePopulate(populate) {
  const fallback = ['assignedTo', 'organization'];
  if (populate == null || populate === '' || populate === '*') {
    return fallback;
  }
  let keys = [];
  if (Array.isArray(populate)) {
    keys = populate.map((p) => (typeof p === 'string' ? p : '')).filter(Boolean);
  } else if (typeof populate === 'object') {
    keys = Object.values(populate)
      .map((v) => (typeof v === 'string' ? v : ''))
      .filter(Boolean);
  } else if (typeof populate === 'string') {
    keys = populate
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const filtered = [...new Set(keys.filter((k) => ALLOWED_POPULATE.has(k)))];
  return filtered.length ? filtered : fallback;
}

function normalizeLeadStatus(value) {
  if (value == null) return null;
  const normalized = String(value).trim().toUpperCase();
  return normalized || null;
}

function validateAndApplyLeadStatus(ctx, data) {
  if (!Object.prototype.hasOwnProperty.call(data, 'status')) return;
  const normalized = normalizeLeadStatus(data.status);
  if (!normalized) {
    delete data.status;
    return;
  }
  if (!LEAD_STATUSES.includes(normalized)) {
    return ctx.badRequest(
      `Invalid lead status "${data.status}". Allowed statuses: ${LEAD_STATUSES.join(', ')}`
    );
  }
  data.status = normalized;
  return null;
}

function leadCompanyIdFromContact(c) {
  if (c == null || c.leadCompany == null) return null;
  const lc = c.leadCompany;
  return typeof lc === 'object' ? lc.id ?? lc.documentId ?? null : lc;
}

/** Match contact → lead row when ids differ by type (number vs string) or documentId is used in URLs. */
function leadKeySetForRows(leadCompanies) {
  const keys = new Set();
  for (const row of leadCompanies) {
    if (row?.id != null) keys.add(String(row.id));
    if (row?.documentId != null) keys.add(String(row.documentId));
  }
  return keys;
}

function contactsForLeadKeys(contacts, keySet) {
  return (contacts || []).filter((c) => {
    const lid = leadCompanyIdFromContact(c);
    return lid != null && keySet.has(String(lid));
  });
}

/**
 * Strapi 5 populate on inverse oneToMany (mappedBy) often omits `contacts` on findMany/findOne.
 * Load org contacts and attach by leadCompany id (no `$in` on relation — unreliable in some setups).
 */
async function attachContactsToLeadCompanies(strapi, orgId, leadCompanies) {
  const keySet = leadKeySetForRows(leadCompanies);
  if (!keySet.size) return leadCompanies;

  let contacts = [];
  try {
    contacts = await strapi.entityService.findMany(CONTACT_UID, {
      filters: { organization: orgId },
      limit: 5000,
    });
  } catch (err) {
    strapi.log.warn(
      'lead-company attachContactsToLeadCompanies: %s',
      err?.message || String(err)
    );
    return leadCompanies;
  }

  contacts = contactsForLeadKeys(contacts, keySet);

  const byLead = new Map();
  for (const c of contacts) {
    const lid = leadCompanyIdFromContact(c);
    if (lid == null) continue;
    const k = String(lid);
    if (!byLead.has(k)) byLead.set(k, []);
    byLead.get(k).push(c);
  }
  for (const list of byLead.values()) {
    list.sort((a, b) => Number(!!b.isPrimaryContact) - Number(!!a.isPrimaryContact));
  }

  return leadCompanies.map((row) => {
    for (const rid of [row.id, row.documentId]) {
      if (rid == null) continue;
      const list = byLead.get(String(rid));
      if (list?.length) return { ...row, contacts: list };
    }
    return row;
  });
}

async function attachContactsToLeadCompany(strapi, orgId, entry) {
  if (entry?.id == null && entry?.documentId == null) return entry;
  const [withContacts] = await attachContactsToLeadCompanies(strapi, orgId, [entry]);
  return withContacts;
}

module.exports = createCoreController(UID, ({ strapi }) => ({
  async statuses(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    return {
      data: LEAD_STATUSES.map((value) => ({
        value,
        label: value.replace(/_/g, ' '),
      })),
    };
  },

  async find(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');

    const query = ctx.query || {};
    const page = parseInt(query['pagination[page]'] || query.page || '1', 10);
    const pageSize = Math.min(
      parseInt(query['pagination[pageSize]'] || query.pageSize || '25', 10),
      100
    );
    const sort = query.sort || 'createdAt:desc';
    const [sortField, sortOrder] = sort.split(':');

    const filters = { organization: ctx.state.orgId };

    const pop = sanitizePopulate(query.populate);
    let results = await strapi.entityService.findMany(UID, {
      filters,
      start: (page - 1) * pageSize,
      limit: pageSize,
      sort: sortField
        ? { [sortField]: (sortOrder || 'desc').toUpperCase() }
        : { createdAt: 'DESC' },
      populate: pop,
    });

    if (pop.includes('contacts') && results.length > 0) {
      results = await attachContactsToLeadCompanies(strapi, ctx.state.orgId, results);
    }

    // Count total for this org
    let total = 0;
    try {
      total = await strapi.db.query(UID).count({ where: filters });
    } catch (_) {
      total = results.length;
    }
    const pageCount = Math.ceil(Math.max(total, 1) / pageSize);
    return { data: results, meta: { pagination: { page, pageSize, pageCount, total } } };
  },

  async findOne(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');

    const { id } = ctx.params;
    const pop = sanitizePopulate(ctx.query?.populate);
    let entry = await strapi.entityService.findOne(UID, id, {
      populate: pop,
    });
    if (!entry) return ctx.notFound();
    if (orgIdFromRelation(entry.organization) !== ctx.state.orgId) {
      return ctx.forbidden('Access denied');
    }
    if (pop.includes('contacts')) {
      entry = await attachContactsToLeadCompany(strapi, ctx.state.orgId, entry);
    }
    return { data: entry };
  },

  async create(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');

    const body = ctx.request?.body || {};
    const payload = body.data || body;
    const data = typeof payload === 'object' ? { ...payload } : {};

    // Force org and creator
    data.organization = ctx.state.orgId;
    if (!data.assignedTo && ctx.state.user?.id) {
      data.assignedTo = ctx.state.user.id;
    }
    const statusErr = validateAndApplyLeadStatus(ctx, data);
    if (statusErr) return statusErr;

    const entry = await strapi.entityService.create(UID, { data });
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
    const { id } = ctx.params;

    const existing = await strapi.entityService.findOne(UID, id, {
      populate: ['organization', 'assignedTo'],
    });
    if (!existing) return ctx.notFound();
    if (orgIdFromRelation(existing.organization) !== ctx.state.orgId) {
      return ctx.forbidden('Access denied');
    }

    const body = ctx.request?.body || {};
    const payload = body.data || body;
    const data = typeof payload === 'object' ? { ...payload } : {};
    delete data.organization;
    const statusErr = validateAndApplyLeadStatus(ctx, data);
    if (statusErr) return statusErr;

    const entry = await strapi.entityService.update(UID, id, { data });
    const changedKeys = collectChangedKeys(data);
    try {
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
   * Creates a client-account from this lead company, marks the lead as CONVERTED,
   * and links all contacts to the new client account (keeping lead-company link).
   */
  async convertToClient(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const { id } = ctx.params;

    const leadCompany = await strapi.entityService.findOne(UID, id, {
      populate: ['organization', 'assignedTo', 'contacts', 'convertedAccount'],
    });
    if (!leadCompany) return ctx.notFound();
    if (orgIdFromRelation(leadCompany.organization) !== ctx.state.orgId) {
      return ctx.forbidden('Access denied');
    }
    if (leadCompany.status === 'CONVERTED' || leadCompany.convertedAccount != null) {
      return ctx.badRequest('Lead company is already converted to a client account');
    }

    const clientAccountData = {
      companyName: leadCompany.companyName,
      industry: leadCompany.industry || null,
      type: leadCompany.type || null,
      subType: leadCompany.subType || null,
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

    const clientAccount = await strapi.entityService.create(CLIENT_ACCOUNT_UID, {
      data: clientAccountData,
    });

    // Mark lead as CONVERTED and link to the new client account
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
    const { id } = ctx.params;

    const existing = await strapi.entityService.findOne(UID, id, {
      populate: ['organization'],
    });
    if (!existing) return ctx.notFound();
    if (orgIdFromRelation(existing.organization) !== ctx.state.orgId) {
      return ctx.forbidden('Access denied');
    }

    const entry = await strapi.entityService.delete(UID, id);
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
    return { data: entry };
  },
}));
