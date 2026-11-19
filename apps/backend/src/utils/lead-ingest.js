'use strict';

/**
 * Shared lead ingestion for every automated lead source (G7 connectors, G6 Meta Lead Ads, …).
 *
 *   const { ingestLead } = require('../../../utils/lead-ingest');
 *   const r = await ingestLead(strapi, {
 *     orgId, source: 'INDIAMART', sourceLabel: 'IndiaMART', sourceKey: 'indiamart',
 *     sourceDetails: { ... }, externalId: 'vendor lead id',
 *     lead: { fullName, firstName, lastName, email, phone, companyName, city, state, country, zipCode,
 *             address, website, jobTitle, message, industry },
 *   });
 *   // r = { status: 'created' | 'merged' | 'duplicate_delivery', leadCompanyId, contactId, matchedOn }
 *
 * - Dedupe (G4 normalisation): an existing lead-company in the org with the same email or phone (on the
 *   lead itself or on one of its contacts) is reused. Only empty fields are filled; the enquiry is appended
 *   to notes; a contact is added when the person is new to that lead.
 * - New leads get source + sourceDetails, status NEW, G5 assignment rules + first-contact SLA (falling back
 *   to the org owner) and a notification for the assignee.
 * - Every call logs a CRM activity on the lead and a lead-capture-event row (Grow Settings → Lead sources).
 * - A repeat delivery of the same source + externalId (vendor retries) returns 'duplicate_delivery'.
 */

const { LEAD_UID, CONTACT_UID, normalizeEmail, normalizePhone } = require('./crm-dedupe');
const { applyAssignmentOnCreate } = require('./lead-assignment');
const { ACTIVITY_UID } = require('./crm-activity-log');
const { notifyUsers } = require('./notification-emitter');

const EVENT_UID = 'api::lead-capture-event.lead-capture-event';
const LEAD_FIELDS = ['id', 'companyName', 'email', 'phone', 'city', 'state', 'country', 'zipCode', 'address', 'website', 'industry', 'notes', 'sourceDetails'];
const FILLABLE = ['email', 'phone', 'city', 'state', 'country', 'zipCode', 'address', 'website', 'industry'];

const str = (v, max = 255) => (v == null ? '' : String(v).trim().slice(0, max));

/** Phone spellings a stored value might use, for an indexed $in lookup (stored phones aren't normalised). */
function phoneVariants(e164) {
  if (!e164) return [];
  const digits = e164.replace(/\D/g, '');
  const out = new Set([e164, digits]);
  if (digits.length === 12 && digits.startsWith('91')) {
    const local = digits.slice(2);
    for (const v of [local, `0${local}`, `+91 ${local}`, `+91-${local}`, `91 ${local}`, `${local.slice(0, 5)} ${local.slice(5)}`, `+91 ${local.slice(0, 5)} ${local.slice(5)}`]) out.add(v);
  }
  return [...out];
}

function contactFilters(email, phone) {
  const or = [];
  if (email) or.push({ email: { $eqi: email } });
  if (phone) {
    or.push({ phone: { $in: phoneVariants(phone) } });
    or.push({ phone: { $endsWith: phone.replace(/\D/g, '').slice(-10) } });
  }
  return or;
}

/** Existing lead-company for this email/phone in the org: { lead, matchedOn } or null. */
async function findExistingLead(strapi, orgId, email, phone) {
  const or = contactFilters(email, phone);
  if (!or.length) return null;
  const pickMatch = (rows) => {
    for (const on of ['email', 'phone']) {
      const hit = rows.find((r) => (on === 'email' ? email && normalizeEmail(r.email) === email : phone && normalizePhone(r.phone) === phone));
      if (hit) return { row: hit, matchedOn: on };
    }
    return null;
  };

  const leads = await strapi.entityService.findMany(LEAD_UID, {
    filters: { organization: orgId, $or: or },
    fields: LEAD_FIELDS,
    sort: [{ id: 'asc' }],
    limit: 25,
  });
  const direct = pickMatch(leads);
  if (direct) return { lead: direct.row, matchedOn: direct.matchedOn };

  const contacts = await strapi.entityService.findMany(CONTACT_UID, {
    filters: { organization: orgId, leadCompany: { id: { $notNull: true } }, $or: or },
    fields: ['id', 'email', 'phone'],
    populate: { leadCompany: { fields: LEAD_FIELDS } },
    sort: [{ id: 'asc' }],
    limit: 25,
  });
  const viaContact = pickMatch(contacts.filter((c) => c.leadCompany));
  if (viaContact) return { lead: viaContact.row.leadCompany, matchedOn: `contact ${viaContact.matchedOn}` };
  return null;
}

async function findContactOnLead(strapi, orgId, leadId, email, phone) {
  const or = contactFilters(email, phone);
  if (!or.length) return null;
  const rows = await strapi.entityService.findMany(CONTACT_UID, {
    filters: { organization: orgId, leadCompany: { id: leadId }, $or: or },
    fields: ['id', 'email', 'phone'],
    limit: 25,
  });
  return rows.find((c) => (email && normalizeEmail(c.email) === email) || (phone && normalizePhone(c.phone) === phone)) || null;
}

async function orgOwnerId(strapi, orgId) {
  try {
    const org = await strapi.entityService.findOne('api::organization.organization', orgId, { populate: { owner: { fields: ['id'] } } });
    return org?.owner?.id || null;
  } catch (_) {
    return null;
  }
}

function personName(lead) {
  return str(lead.fullName) || [lead.firstName, lead.lastName].filter(Boolean).join(' ').trim();
}

function companyNameFor(lead, email, phone) {
  return str(lead.companyName) || personName(lead) || email || phone || 'Unknown lead';
}

function stamp(sourceLabel) {
  return `[${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC · ${sourceLabel}]`;
}

async function writeActivity(strapi, { orgId, leadId, action, summary, meta }) {
  try {
    await strapi.entityService.create(ACTIVITY_UID, {
      data: { organization: orgId, actor: null, action, subjectType: 'lead_company', subjectId: leadId, leadCompany: leadId, summary: summary.slice(0, 255), meta },
    });
  } catch (err) {
    strapi.log.warn(`[lead-ingest] activity not written for lead ${leadId}: ${err?.message || err}`);
  }
}

/**
 * Record a capture event (also used directly for rejected / spam / test requests).
 * @param {{ orgId, sourceKey, status, message?, externalId?, leadCompanyId?, contactId?, matchedOn?, ip?, details? }} e
 */
async function logCaptureEvent(strapi, e) {
  if (!e?.orgId || !e.sourceKey) return null;
  try {
    return await strapi.entityService.create(EVENT_UID, {
      data: {
        organization: e.orgId,
        source: str(e.sourceKey, 40),
        status: str(e.status, 30),
        message: str(e.message, 500) || null,
        externalId: str(e.externalId, 200) || null,
        leadCompanyId: e.leadCompanyId || null,
        contactId: e.contactId || null,
        matchedOn: str(e.matchedOn, 40) || null,
        ip: str(e.ip, 64) || null,
        details: e.details && typeof e.details === 'object' ? e.details : null,
      },
    });
  } catch (err) {
    strapi.log.warn(`[lead-ingest] capture event not written: ${err?.message || err}`);
    return null;
  }
}

// Serialise ingests for the same org + person so two simultaneous deliveries can't both create a lead.
const locks = new Map();
async function withLock(key, fn) {
  const prev = locks.get(key) || Promise.resolve();
  let release;
  const mine = new Promise((r) => (release = r));
  const chained = prev.then(() => mine);
  locks.set(key, chained);
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (locks.get(key) === chained) locks.delete(key);
  }
}

async function ingestLead(strapi, input) {
  const { orgId, source, sourceLabel = source, sourceKey = String(source || '').toLowerCase(), externalId, ip } = input;
  const lead = input.lead || {};
  const sourceDetails = input.sourceDetails && typeof input.sourceDetails === 'object' ? input.sourceDetails : {};
  if (!orgId || !source) throw new Error('ingestLead: orgId and source are required');

  const email = normalizeEmail(lead.email);
  const phone = normalizePhone(lead.phone);
  if (!email && !phone) {
    const err = new Error('A lead needs an email address or a phone number');
    err.code = 'NO_CONTACT_INFO';
    throw err;
  }

  return withLock(`${orgId}:${email || ''}:${phone || ''}`, async () => {
    if (externalId) {
      const seen = await strapi.entityService.findMany(EVENT_UID, {
        filters: { organization: orgId, source: sourceKey, externalId: String(externalId), status: { $in: ['created', 'merged'] } },
        fields: ['id', 'leadCompanyId', 'contactId'],
        limit: 1,
      });
      if (seen[0]) {
        await logCaptureEvent(strapi, { orgId, sourceKey, status: 'duplicate_delivery', externalId, leadCompanyId: seen[0].leadCompanyId, ip, message: 'Same lead delivered again by the source; ignored' });
        return { status: 'duplicate_delivery', leadCompanyId: seen[0].leadCompanyId, contactId: seen[0].contactId, matchedOn: 'external id' };
      }
    }

    const name = personName(lead);
    const message = str(lead.message, 4000);
    const existing = await findExistingLead(strapi, orgId, email, phone);
    const captureMeta = { capture: { source, sourceLabel, externalId: externalId || undefined, details: sourceDetails } };
    let result;

    if (existing) {
      const prev = existing.lead;
      const patch = {};
      const candidate = { ...lead, email, phone };
      for (const f of FILLABLE) {
        const v = str(candidate[f], f === 'address' ? 500 : 255);
        if (v && !str(prev[f])) patch[f] = v;
      }
      if (message) patch.notes = [str(prev.notes, 20000), `${stamp(sourceLabel)} ${message}`].filter(Boolean).join('\n\n');
      const prevDetails = prev.sourceDetails && typeof prev.sourceDetails === 'object' ? prev.sourceDetails : {};
      const recaptures = Array.isArray(prevDetails.recaptures) ? prevDetails.recaptures.slice(-9) : [];
      patch.sourceDetails = { ...prevDetails, recaptures: [...recaptures, { source, at: new Date().toISOString(), externalId: externalId || undefined, ...sourceDetails }] };
      await strapi.entityService.update(LEAD_UID, prev.id, { data: patch });

      let contact = await findContactOnLead(strapi, orgId, prev.id, email, phone);
      if (!contact && name) contact = await createContact(strapi, orgId, prev.id, lead, email, phone, source, null);
      await writeActivity(strapi, {
        orgId,
        leadId: prev.id,
        action: 'update',
        summary: `Captured again from ${sourceLabel}${name ? ` (${name})` : ''} — matched on ${existing.matchedOn}`,
        meta: { ...captureMeta, changedFields: Object.keys(patch) },
      });
      result = { status: 'merged', leadCompanyId: prev.id, contactId: contact?.id || null, matchedOn: existing.matchedOn };
    } else {
      const data = {
        organization: orgId,
        companyName: companyNameFor(lead, email, phone).slice(0, 255),
        email: email || null,
        phone: phone || null,
        city: str(lead.city) || null,
        state: str(lead.state) || null,
        country: str(lead.country) || null,
        zipCode: str(lead.zipCode, 20) || null,
        address: str(lead.address, 500) || null,
        website: str(lead.website) || null,
        industry: str(lead.industry) || null,
        source,
        sourceDetails: { ...sourceDetails, capturedAt: new Date().toISOString(), externalId: externalId || undefined },
        status: 'NEW',
        notes: message ? `${stamp(sourceLabel)} ${message}` : null,
      };
      await applyAssignmentOnCreate(strapi, orgId, data, { explicitOwner: false, fallbackUserId: await orgOwnerId(strapi, orgId) });
      const entry = await strapi.entityService.create(LEAD_UID, { data });
      const contact = await createContact(strapi, orgId, entry.id, lead, email, phone, source, data.assignedTo);
      await writeActivity(strapi, {
        orgId,
        leadId: entry.id,
        action: 'create',
        summary: `Lead "${entry.companyName}" captured from ${sourceLabel}`,
        meta: { ...captureMeta, assignedByRule: data.assignedByRule || undefined },
      });
      if (data.assignedTo) {
        await notifyUsers(strapi, {
          userIds: [Number(data.assignedTo)],
          organizationId: orgId,
          type: 'lead_assigned',
          title: `New ${sourceLabel} lead: ${entry.companyName}`,
          message: data.assignedByRule ? `Assigned by the "${data.assignedByRule}" rule` : 'Assigned to you as the organization owner',
          data: { subjectType: 'lead_company', subjectId: entry.id, href: `/sales/lead-companies/${entry.id}` },
        }).catch(() => {});
      }
      result = { status: 'created', leadCompanyId: entry.id, contactId: contact?.id || null, matchedOn: null };
    }

    await logCaptureEvent(strapi, {
      orgId,
      sourceKey,
      status: result.status,
      externalId,
      leadCompanyId: result.leadCompanyId,
      contactId: result.contactId,
      matchedOn: result.matchedOn,
      ip,
      message: `${name || email || phone}${result.status === 'merged' ? ` → merged into lead #${result.leadCompanyId}` : ''}`,
      details: { name: name || undefined, email: email || undefined, phone: phone || undefined, ...sourceDetails },
    });
    return result;
  });
}

async function createContact(strapi, orgId, leadId, lead, email, phone, source, assignedTo) {
  const first = str(lead.firstName) || personName(lead).split(' ')[0] || (email ? email.split('@')[0] : 'Unknown');
  const last = str(lead.lastName) || (str(lead.firstName) ? '' : personName(lead).split(' ').slice(1).join(' '));
  // Strapi's validator rejects null for string attributes, so empty fields are left out entirely.
  const dropEmpty = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v != null && v !== ''));
  try {
    return await strapi.entityService.create(CONTACT_UID, {
      data: dropEmpty({
        organization: orgId,
        leadCompany: leadId,
        firstName: first,
        // contact.lastName is required; portals often send one name ("Ravi"), so keep the contact with "-".
        lastName: last || '-',
        email: email || null,
        phone: phone || null,
        jobTitle: str(lead.jobTitle) || null,
        companyName: str(lead.companyName) || null,
        city: str(lead.city) || null,
        state: str(lead.state) || null,
        country: str(lead.country) || null,
        zipCode: str(lead.zipCode, 20) || null,
        source,
        isPrimaryContact: true,
        assignedTo: assignedTo || null,
      }),
    });
  } catch (err) {
    strapi.log.warn(`[lead-ingest] contact not created for lead ${leadId}: ${err?.message || err}`);
    return null;
  }
}

module.exports = { EVENT_UID, ingestLead, logCaptureEvent, findExistingLead, phoneVariants };
