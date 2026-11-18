'use strict';

/**
 * Lead auto-assignment + first-contact SLA (ticket G5).
 *
 * Rules (crm-assignment-rule) are evaluated in order; the first enabled rule whose criteria match the
 * lead picks an owner from its assignees:
 *   round_robin — next assignee in turn (pointer stored on the rule)
 *   load_based  — assignee with the fewest open leads, skipping anyone at maxOpenLeads
 * Criteria (all optional, AND across fields, OR within a field): cities, states, pincodes (prefixes),
 * sources, industries. A rule with no criteria matches every lead.
 * SLA: when enabled for the org, new leads get firstContactDueAt = now + firstContactMinutes. Moving the
 * lead out of NEW (or logging a meeting) records firstContactedAt. A cron flags breaches.
 */

const RULE_UID = 'api::crm-assignment-rule.crm-assignment-rule';
const LEAD_UID = 'api::lead-company.lead-company';
const CLOSED = ['LOST', 'CONVERTED'];
const { getSetting } = require('./crm-org-settings');
const { notifyUsers } = require('./notification-emitter');

const norm = (v) => String(v || '').trim().toLowerCase();

function matches(rule, lead) {
  const m = rule.match && typeof rule.match === 'object' ? rule.match : {};
  const inList = (list, value) => !Array.isArray(list) || !list.length || list.map(norm).includes(norm(value));
  if (!inList(m.cities, lead.city)) return false;
  if (!inList(m.states, lead.state)) return false;
  if (!inList(m.sources, lead.source)) return false;
  if (!inList(m.industries, lead.industry)) return false;
  if (Array.isArray(m.pincodes) && m.pincodes.length) {
    const zip = String(lead.zipCode || '').replace(/\s/g, '');
    if (!m.pincodes.some((p) => zip.startsWith(String(p).replace(/\s/g, '')))) return false;
  }
  return true;
}

async function activeMemberIds(strapi, orgId) {
  const rows = await strapi.entityService.findMany('api::organization-user.organization-user', {
    filters: { organization: orgId, isActive: true },
    populate: { user: { fields: ['id'] } },
    limit: 2000,
  });
  return new Set(rows.map((r) => r.user?.id).filter(Boolean).map(Number));
}

async function openLeadCount(strapi, orgId, userId) {
  return strapi.db.query(LEAD_UID).count({
    where: { organization: orgId, assignedTo: userId, status: { $notIn: CLOSED } },
  });
}

/**
 * Pick an owner for a lead. Returns { userId, ruleId, ruleName } or null (no rule matched / nobody free).
 * @param {object} lead plain lead data (city, state, zipCode, source, industry)
 * @param {{ excludeUserId?: number }} [opts]
 */
async function pickAssignee(strapi, orgId, lead, opts = {}) {
  const rules = await strapi.entityService.findMany(RULE_UID, {
    filters: { organization: orgId, enabled: true },
    sort: [{ sortOrder: 'asc' }, { id: 'asc' }],
    limit: 100,
  });
  if (!rules.length) return null;
  const members = await activeMemberIds(strapi, orgId);
  for (const rule of rules) {
    if (!matches(rule, lead)) continue;
    const pool = (Array.isArray(rule.assigneeIds) ? rule.assigneeIds : [])
      .map(Number)
      .filter((id) => members.has(id) && id !== Number(opts.excludeUserId));
    if (!pool.length) continue;

    if (rule.strategy === 'load_based') {
      let best = null;
      for (const id of pool) {
        const n = await openLeadCount(strapi, orgId, id);
        if (rule.maxOpenLeads && n >= rule.maxOpenLeads) continue;
        if (!best || n < best.n) best = { id, n };
      }
      if (best) return { userId: best.id, ruleId: rule.id, ruleName: rule.name };
      continue;
    }

    // round robin (respects the cap too)
    const start = Number.isInteger(rule.lastAssignedIndex) ? rule.lastAssignedIndex : -1;
    for (let step = 1; step <= pool.length; step++) {
      const idx = (start + step) % pool.length;
      const id = pool[idx];
      if (rule.maxOpenLeads && (await openLeadCount(strapi, orgId, id)) >= rule.maxOpenLeads) continue;
      await strapi.entityService.update(RULE_UID, rule.id, { data: { lastAssignedIndex: idx } });
      return { userId: id, ruleId: rule.id, ruleName: rule.name };
    }
  }
  return null;
}

/**
 * Apply rules + SLA to a lead create payload (mutates `data`).
 * Rules run only when the caller didn't choose an owner (`explicitOwner` false).
 */
async function applyAssignmentOnCreate(strapi, orgId, data, { explicitOwner, fallbackUserId }) {
  if (!explicitOwner) {
    try {
      const pick = await pickAssignee(strapi, orgId, data);
      if (pick) {
        data.assignedTo = pick.userId;
        data.assignedByRule = pick.ruleName;
      } else if (!data.assignedTo && fallbackUserId) {
        data.assignedTo = fallbackUserId;
      }
    } catch (e) {
      strapi.log.warn(`[lead-assignment] ${e?.message || e}`);
      if (!data.assignedTo && fallbackUserId) data.assignedTo = fallbackUserId;
    }
  }
  const sla = await getSetting(strapi, orgId, 'lead_sla');
  if (sla?.enabled && Number(sla.firstContactMinutes) > 0 && String(data.status || 'NEW').toUpperCase() === 'NEW') {
    data.firstContactDueAt = new Date(Date.now() + Number(sla.firstContactMinutes) * 60000).toISOString();
  }
}

/** Record first contact on a status change out of NEW (mutates `data`). */
function applyFirstContactOnUpdate(data, existing) {
  if (existing?.firstContactedAt) return;
  const next = data.status != null ? String(data.status).toUpperCase() : null;
  if (next && next !== 'NEW') data.firstContactedAt = new Date().toISOString();
}

async function markFirstContact(strapi, leadId, orgId) {
  const lead = await strapi.entityService.findOne(LEAD_UID, leadId, {
    fields: ['id', 'firstContactedAt'],
    populate: { organization: { fields: ['id'] } },
  });
  if (lead && !lead.firstContactedAt && Number(lead.organization?.id) === Number(orgId)) {
    await strapi.entityService.update(LEAD_UID, leadId, { data: { firstContactedAt: new Date().toISOString() } });
  }
}

/** Cron: flag first-contact SLA breaches, notify owners, optionally reassign. */
async function processSlaBreaches(strapi) {
  const now = new Date().toISOString();
  const due = await strapi.entityService.findMany(LEAD_UID, {
    filters: {
      firstContactDueAt: { $lt: now },
      firstContactedAt: { $null: true },
      slaBreachedAt: { $null: true },
      status: { $notIn: CLOSED },
    },
    populate: { organization: { fields: ['id'] }, assignedTo: { fields: ['id'] } },
    limit: 500,
  });
  let flagged = 0;
  for (const lead of due) {
    const orgId = lead.organization?.id;
    if (!orgId) continue;
    const data = { slaBreachedAt: now };
    const ownerId = lead.assignedTo?.id;
    const sla = await getSetting(strapi, orgId, 'lead_sla');
    let reassignedTo = null;
    if (sla?.reassignOnBreach) {
      const pick = await pickAssignee(strapi, orgId, lead, { excludeUserId: ownerId });
      if (pick) {
        reassignedTo = pick.userId;
        data.assignedTo = pick.userId;
        data.assignedByRule = `${pick.ruleName} (SLA reassignment)`;
        data.firstContactDueAt = new Date(Date.now() + Number(sla.firstContactMinutes || 60) * 60000).toISOString();
        data.slaBreachedAt = null;
      }
    }
    await strapi.entityService.update(LEAD_UID, lead.id, { data });
    flagged += 1;
    const link = { subjectType: 'lead_company', subjectId: lead.id, href: `/sales/lead-companies/${lead.id}` };
    const slaLink = { ...link, category: 'sla' };
    if (ownerId) {
      await notifyUsers(strapi, {
        userIds: [ownerId],
        organizationId: orgId,
        type: 'warning',
        title: `First-contact SLA missed: ${lead.companyName}`,
        message: reassignedTo ? 'The lead was reassigned to a teammate.' : 'Contact this lead as soon as possible.',
        data: slaLink,
      });
    }
    if (reassignedTo) {
      await notifyUsers(strapi, {
        userIds: [reassignedTo],
        organizationId: orgId,
        type: 'lead_assigned',
        title: `Lead assigned to you: ${lead.companyName}`,
        message: 'Reassigned after the first-contact SLA was missed.',
        data: link,
      });
    }
  }
  return flagged;
}

module.exports = {
  RULE_UID,
  matches,
  pickAssignee,
  applyAssignmentOnCreate,
  applyFirstContactOnUpdate,
  markFirstContact,
  processSlaBreaches,
};
