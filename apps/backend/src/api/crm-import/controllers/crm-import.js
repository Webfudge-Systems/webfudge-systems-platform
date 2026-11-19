'use strict';

/**
 * CSV/Excel imports, duplicate checks and lead merge (ticket G4).
 *
 * The browser parses the file and maps columns; POST /crm-imports receives mapped rows
 * ({ fieldKey: value, 'cf:customKey': value }) and processes them in the background. Progress, counts,
 * error rows (for the downloadable error file) and duplicate rows are saved on the crm-import record.
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { orgIdFromRelation } = require('../../../utils/content-api-helpers');
const { requireModuleAccess, canAccess } = require('../../../utils/rbac');
const {
  LEAD_UID,
  CONTACT_UID,
  normalizeEmail,
  normalizePhone,
  buildIndex,
  addToIndex,
  matchIn,
  findDuplicates,
} = require('../../../utils/crm-dedupe');
const { listFields, applyCustomFields } = require('../../../utils/crm-custom-fields');
const { leadStatusKeys } = require('../../../utils/crm-pipeline');
const { applyAssignmentOnCreate } = require('../../../utils/lead-assignment');
const { contactAllowance, contactLimitMessage, requireContactCapacity } = require('../../../utils/saas-plans');

const UID = 'api::crm-import.crm-import';
const MAX_ROWS = 20000;
const MAX_LISTED = 5000;

const FIELDS = {
  lead: ['companyName', 'industry', 'type', 'website', 'phone', 'email', 'address', 'city', 'state', 'country', 'zipCode', 'employees', 'description', 'linkedIn', 'source', 'status', 'segment', 'dealValue', 'notes', 'nextConnectDate'],
  contact: ['firstName', 'lastName', 'email', 'phone', 'companyName', 'companyWebsite', 'jobTitle', 'department', 'address', 'city', 'state', 'country', 'zipCode', 'linkedIn', 'source', 'status', 'notes'],
};
const MODULE = { lead: 'leads', contact: 'contacts' };

function str(v, max = 500) {
  if (v == null) return '';
  return String(v).trim().slice(0, max);
}

/** Validate + map one row. Returns { data } or { error }. */
function buildRecord(entity, row, ctxInfo) {
  const data = {};
  for (const f of FIELDS[entity]) {
    const v = str(row[f], f === 'description' || f === 'notes' ? 5000 : 500);
    if (v !== '') data[f] = v;
  }
  if (entity === 'lead' && !data.companyName) return { error: 'Company name is missing' };
  if (entity === 'contact') {
    // Contacts need first and last name: split a full name in "First name" when no last name is mapped.
    if (data.firstName && !data.lastName) {
      const parts = data.firstName.split(/\s+/);
      if (parts.length > 1) {
        data.firstName = parts.shift();
        data.lastName = parts.join(' ');
      }
    }
    if (!data.firstName) return { error: 'First name is missing' };
    if (!data.lastName) return { error: 'Last name is missing' };
  }
  if (data.email) {
    const e = normalizeEmail(data.email);
    if (!e) return { error: `Invalid email "${data.email}"` };
    data.email = e;
  }
  if (data.phone) {
    const p = normalizePhone(data.phone);
    if (!p) return { error: `Invalid phone "${data.phone}"` };
    data.phone = p;
  }
  if (entity === 'lead') {
    if (data.status) {
      const s = data.status.toUpperCase().replace(/\s+/g, '_');
      if (!ctxInfo.leadStatuses.includes(s)) return { error: `Unknown status "${data.status}"` };
      data.status = s;
    } else data.status = 'NEW';
    data.source = (data.source || 'IMPORT').toUpperCase();
    if (data.dealValue) {
      const n = Number(String(data.dealValue).replace(/[,\s₹]/g, ''));
      if (!Number.isFinite(n)) return { error: `Deal value "${data.dealValue}" is not a number` };
      data.dealValue = n;
    }
    if (data.nextConnectDate) {
      const t = Date.parse(data.nextConnectDate);
      if (Number.isNaN(t)) return { error: `Next connect date "${data.nextConnectDate}" is not a date` };
      data.nextConnectDate = new Date(t).toISOString().slice(0, 10);
    }
  }
  const custom = {};
  for (const [k, v] of Object.entries(row)) {
    if (k.startsWith('cf:') && str(v) !== '') custom[k.slice(3)] = v;
  }
  if (Object.keys(custom).length) data.customFields = custom;
  return { data };
}

async function runImport(strapi, jobId, { orgId, userId, entity, rows, duplicateMode }) {
  const uid = entity === 'contact' ? CONTACT_UID : LEAD_UID;
  const update = (data) => strapi.entityService.update(UID, jobId, { data });
  try {
    await update({ status: 'running' });
    const [index, defs, leadStatuses] = await Promise.all([
      buildIndex(strapi, orgId, entity),
      listFields(strapi, orgId, entity),
      entity === 'lead' ? leadStatusKeys(strapi, orgId) : Promise.resolve([]),
    ]);
    const errors = [];
    const dups = [];
    // SaaS: stop creating contacts once the Grow Free plan limit is reached (G16).
    const allowance = entity === 'contact' ? await contactAllowance(strapi, orgId) : { remaining: Infinity };
    let overLimit = 0;
    let created = 0;
    let duplicates = 0;
    let failed = 0;
    for (let i = 0; i < rows.length; i++) {
      const rowNo = i + 2; // header is row 1
      const row = rows[i] || {};
      const { data, error } = buildRecord(entity, row, { leadStatuses });
      if (error) {
        failed += 1;
        if (errors.length < MAX_LISTED) errors.push({ row: rowNo, reason: error, values: row });
      } else {
        const cfErr = await applyCustomFields(strapi, orgId, entity, data, null, defs);
        if (cfErr) {
          failed += 1;
          if (errors.length < MAX_LISTED) errors.push({ row: rowNo, reason: cfErr, values: row });
        } else {
          const match = matchIn(index, entity, data);
          if (match) {
            duplicates += 1;
            if (dups.length < MAX_LISTED) dups.push({ row: rowNo, matchId: match.id, matchLabel: match.label, matchedOn: match.matchedOn, values: row });
          }
          if ((!match || duplicateMode === 'create') && created >= allowance.remaining) {
            failed += 1;
            overLimit += 1;
            if (errors.length < MAX_LISTED) errors.push({ row: rowNo, reason: contactLimitMessage(allowance.limit), values: row });
          } else if (!match || duplicateMode === 'create') {
            try {
              const record = { ...data, organization: orgId, assignedTo: userId };
              if (entity === 'lead') {
                await applyAssignmentOnCreate(strapi, orgId, record, { explicitOwner: false, fallbackUserId: userId });
              }
              const entry = await strapi.entityService.create(uid, { data: record });
              created += 1;
              addToIndex(index, entity, entry);
            } catch (e) {
              failed += 1;
              if (errors.length < MAX_LISTED) errors.push({ row: rowNo, reason: e?.message || 'Could not save', values: row });
            }
          }
        }
      }
      if ((i + 1) % 200 === 0) {
        await update({ processed: i + 1, created, duplicates, failed });
        await new Promise((r) => setImmediate(r));
      }
    }
    await update({
      status: 'done',
      processed: rows.length,
      created,
      duplicates,
      failed,
      errorRows: errors,
      duplicateRows: dups,
      finishedAt: new Date().toISOString(),
      message: `Imported ${created} of ${rows.length}. ${duplicates} possible duplicate(s)${duplicateMode === 'skip' ? ' skipped' : ' created anyway'}, ${failed} row(s) with errors.${overLimit ? ` ${overLimit} row(s) not imported: ${contactLimitMessage(allowance.limit)}` : ''}`,
    });
  } catch (e) {
    strapi.log.error(`[crm-import ${jobId}] ${e?.stack || e}`);
    await update({ status: 'failed', message: e?.message || 'Import failed', finishedAt: new Date().toISOString() }).catch(() => {});
  }
}

function serialize(row, { full = false } = {}) {
  if (!row) return row;
  const { organization, createdByUser, errorRows, duplicateRows, ...rest } = row;
  const out = { ...rest, errorCount: Array.isArray(errorRows) ? errorRows.length : 0, duplicateCount: Array.isArray(duplicateRows) ? duplicateRows.length : 0 };
  if (full) {
    out.errorRows = errorRows || [];
    out.duplicateRows = duplicateRows || [];
  }
  return out;
}

module.exports = createCoreController(UID, ({ strapi }) => ({
  /** GET /crm-imports — this org's recent imports. */
  async find(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const rows = await strapi.entityService.findMany(UID, {
      filters: { organization: ctx.state.orgId },
      sort: { createdAt: 'desc' },
      limit: 20,
    });
    return { data: rows.map((r) => serialize(r)) };
  },

  /** GET /crm-imports/:id — progress and results (error + duplicate rows). */
  async findOne(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const id = parseInt(String(ctx.params.id), 10);
    const row = Number.isNaN(id) ? null : await strapi.entityService.findOne(UID, id, { populate: ['organization'] });
    if (!row || orgIdFromRelation(row.organization) !== ctx.state.orgId) return ctx.notFound('Import not found');
    ctx.set('Cache-Control', 'no-store');
    return { data: serialize(row, { full: true }) };
  },

  /** POST /crm-imports — { entity: 'lead'|'contact', fileName, duplicateMode: 'skip'|'create', rows: [...] } */
  async create(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const body = ctx.request?.body?.data || ctx.request?.body || {};
    const entity = body.entity === 'contact' ? 'contact' : body.entity === 'lead' ? 'lead' : null;
    if (!entity) return ctx.badRequest('entity must be lead or contact');
    const denied = requireModuleAccess(ctx, 'crm', MODULE[entity], 'write');
    if (denied) return denied;
    const rows = Array.isArray(body.rows) ? body.rows : null;
    if (!rows || !rows.length) return ctx.badRequest('No rows to import');
    if (rows.length > MAX_ROWS) return ctx.badRequest(`At most ${MAX_ROWS} rows per import`);
    const duplicateMode = body.duplicateMode === 'create' ? 'create' : 'skip';
    if (entity === 'contact' && !(await requireContactCapacity(ctx, strapi, 1))) return;
    const job = await strapi.entityService.create(UID, {
      data: {
        entity,
        fileName: str(body.fileName, 200) || null,
        status: 'queued',
        duplicateMode,
        total: rows.length,
        organization: ctx.state.orgId,
        createdByUser: ctx.state.user.id,
      },
    });
    const args = { orgId: ctx.state.orgId, userId: ctx.state.user.id, entity, rows, duplicateMode };
    setImmediate(() => {
      runImport(strapi, job.id, args);
    });
    ctx.status = 202;
    return { data: serialize(job) };
  },

  /** GET /crm-duplicates?entity=lead|contact&email=&phone=&companyName= — possible duplicates (create forms). */
  async duplicates(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const entity = ctx.query?.entity === 'contact' ? 'contact' : 'lead';
    const denied = requireModuleAccess(ctx, 'crm', MODULE[entity], 'read');
    if (denied) return denied;
    const candidate = { email: ctx.query?.email, phone: ctx.query?.phone, companyName: ctx.query?.companyName };
    if (!candidate.email && !candidate.phone && !candidate.companyName) return { data: [] };
    const exclude = ctx.query?.excludeId ? String(ctx.query.excludeId) : null;
    const rows = await findDuplicates(strapi, ctx.state.orgId, entity, candidate);
    return { data: rows.filter((r) => String(r.id) !== exclude) };
  },

  /**
   * POST /crm-merge/lead — { keepId, mergeId, take: ['phone', ...], takeCustom: ['budget', ...] }
   * Copies the chosen values from the duplicate, moves its contacts, deals, meetings, tasks, proposals,
   * invoices and activity to the kept lead, then deletes the duplicate.
   */
  async mergeLeads(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    if (!canAccess(ctx, 'crm', 'leads', 'manage')) return ctx.forbidden('You need manage access to leads to merge them');
    const body = ctx.request?.body?.data || ctx.request?.body || {};
    const keepId = parseInt(String(body.keepId), 10);
    const mergeId = parseInt(String(body.mergeId), 10);
    if (Number.isNaN(keepId) || Number.isNaN(mergeId) || keepId === mergeId) return ctx.badRequest('Pick two different leads');
    const [keep, dup] = await Promise.all(
      [keepId, mergeId].map((id) => strapi.entityService.findOne(LEAD_UID, id, { populate: ['organization', 'convertedAccount'] }))
    );
    if (!keep || !dup || orgIdFromRelation(keep.organization) !== ctx.state.orgId || orgIdFromRelation(dup.organization) !== ctx.state.orgId) {
      return ctx.notFound('Lead not found');
    }
    if (dup.convertedAccount) return ctx.badRequest('The duplicate was converted to a client. Keep that one and merge the other into it.');

    const data = {};
    for (const f of Array.isArray(body.take) ? body.take : []) {
      if (FIELDS.lead.includes(f) || f === 'assignedTo') data[f] = dup[f] ?? null;
    }
    const takeCustom = Array.isArray(body.takeCustom) ? body.takeCustom : [];
    if (takeCustom.length) {
      const merged = { ...(keep.customFields || {}) };
      for (const k of takeCustom) if (dup.customFields && k in dup.customFields) merged[k] = dup.customFields[k];
      data.customFields = merged;
    }

    const moved = {};
    await strapi.db.transaction(async () => {
      if (Object.keys(data).length) await strapi.entityService.update(LEAD_UID, keepId, { data });
      const relUids = {
        contacts: 'api::contact.contact',
        deals: 'api::deal.deal',
        meetings: 'api::meeting.meeting',
        tasks: 'api::task.task',
        proposals: 'api::proposal.proposal',
        invoices: 'api::invoice.invoice',
        activity: 'api::crm-activity.crm-activity',
      };
      for (const [label, relUid] of Object.entries(relUids)) {
        const rows = await strapi.entityService.findMany(relUid, {
          filters: { leadCompany: mergeId },
          fields: ['id'],
          limit: 100000,
        });
        for (const r of rows) await strapi.entityService.update(relUid, r.id, { data: { leadCompany: keepId } });
        moved[label] = rows.length;
      }
      await strapi.entityService.delete(LEAD_UID, mergeId);
    });
    return { data: { keepId, mergedId: mergeId, moved } };
  },
}));
