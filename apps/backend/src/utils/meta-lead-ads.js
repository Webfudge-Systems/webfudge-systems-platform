'use strict';

/**
 * Meta Lead Ads capture (ticket G6, SaaS only).
 *
 * One connection per organization: a Facebook Page plus the lead forms chosen in Grow Settings,
 * each with its own question → field mapping. Meta calls POST /api/crm-meta/webhook for every new
 * lead; we verify X-Hub-Signature-256, fetch the lead from Graph with the Page token and create a
 * lead company (source META_ADS, campaign/ad/form ids in metaAttribution) plus its contact.
 *
 * Duplicates: the same Meta lead id is never stored twice (webhook retries, backfill), and a person
 * who already exists in the org (same email or phone on a lead company or contact) gets an activity
 * on their existing lead instead of a second lead.
 *
 * Tokens: AES-256-GCM encrypted with META_TOKEN_ENCRYPTION_KEY, private in the schema, and never
 * returned by any endpoint.
 */

const crypto = require('crypto');
const meta = require('@webfudge/meta-ads');
const { LEAD_UID, CONTACT_UID, normalizeEmail, normalizePhone, buildIndex, matchIn } = require('./crm-dedupe');
const { applyAssignmentOnCreate } = require('./lead-assignment');
const { applyCustomFields } = require('./crm-custom-fields');
const { notifyUsers } = require('./notification-emitter');

const CONNECTION_UID = 'api::crm-meta-connection.crm-meta-connection';
const ACTIVITY_UID = 'api::crm-activity.crm-activity';
const LEAD_SOURCE = 'META_ADS';
const MAX_BACKFILL = 500;

const LEAD_FIELDS = ['companyName', 'email', 'phone', 'website', 'industry', 'address', 'city', 'state', 'country', 'zipCode'];

function metaConfig() {
  const env = process.env;
  const publicUrl = String(env.PUBLIC_URL || '').replace(/\/+$/, '');
  return {
    appId: env.META_APP_ID || '',
    appSecret: env.META_APP_SECRET || '',
    verifyToken: env.META_WEBHOOK_VERIFY_TOKEN || '',
    encryptionKey: env.META_TOKEN_ENCRYPTION_KEY || '',
    graphVersion: env.META_GRAPH_VERSION || meta.DEFAULT_GRAPH_VERSION,
    // Test-only override (mock Graph server). Leave unset in every real deployment.
    baseUrl: env.META_GRAPH_BASE_URL || meta.DEFAULT_BASE_URL,
    redirectUri: env.META_OAUTH_REDIRECT_URI || (publicUrl ? `${publicUrl}/api/crm-meta/oauth/callback` : ''),
    crmUrl: String(env.CRM_APP_URL || 'http://localhost:3007').replace(/\/+$/, ''),
    webhookUrl: publicUrl ? `${publicUrl}/api/crm-meta/webhook` : null,
  };
}

/** Which env vars are missing (names only). Empty = the integration can be used. */
function missingConfig(cfg = metaConfig()) {
  const missing = [];
  if (!cfg.appId) missing.push('META_APP_ID');
  if (!cfg.appSecret) missing.push('META_APP_SECRET');
  if (!cfg.verifyToken) missing.push('META_WEBHOOK_VERIFY_TOKEN');
  if (!cfg.encryptionKey) missing.push('META_TOKEN_ENCRYPTION_KEY');
  if (!cfg.redirectUri) missing.push('META_OAUTH_REDIRECT_URI or PUBLIC_URL');
  return missing;
}

// ─── Token encryption ────────────────────────────────────────────────────────

function keyBytes(cfg) {
  if (!cfg.encryptionKey) throw new Error('META_TOKEN_ENCRYPTION_KEY is not set');
  return crypto.createHash('sha256').update(cfg.encryptionKey).digest();
}

function encryptToken(plain, cfg = metaConfig()) {
  if (!plain) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBytes(cfg), iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), enc.toString('base64')].join(':');
}

function decryptToken(stored, cfg = metaConfig()) {
  if (!stored) return null;
  const [v, iv, tag, data] = String(stored).split(':');
  if (v !== 'v1' || !iv || !tag || !data) return null;
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBytes(cfg), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
  } catch (_) {
    return null;
  }
}

function clientFor(token, cfg = metaConfig()) {
  return meta.createMetaClient(token, {
    graphVersion: cfg.graphVersion,
    baseUrl: cfg.baseUrl,
    appSecret: cfg.appSecret || undefined,
  });
}

// ─── Connection rows ─────────────────────────────────────────────────────────

async function getConnection(strapi, orgId) {
  const rows = await strapi.entityService.findMany(CONNECTION_UID, {
    filters: { organization: orgId },
    populate: { connectedBy: { fields: ['id'] }, organization: { fields: ['id'] } },
    limit: 1,
  });
  return rows[0] || null;
}

async function getConnectionByPage(strapi, pageId) {
  if (!pageId) return null;
  const rows = await strapi.entityService.findMany(CONNECTION_UID, {
    filters: { pageId: String(pageId), status: 'active' },
    populate: { connectedBy: { fields: ['id'] }, organization: { fields: ['id'] } },
    limit: 2,
  });
  // A Page is only ever active in one org (enforced when it is chosen); be defensive anyway.
  return rows.length === 1 ? rows[0] : null;
}

/** Safe shape for the browser: no tokens, ever. */
function publicConnection(row, cfg = metaConfig()) {
  const missing = missingConfig(cfg);
  if (!row) return { configured: missing.length === 0, missingConfig: missing, connected: false, webhookUrl: cfg.webhookUrl };
  return {
    configured: missing.length === 0,
    missingConfig: missing,
    connected: Boolean(row.userTokenEnc),
    status: row.status,
    metaUserName: row.metaUserName || null,
    userTokenExpiresAt: row.userTokenExpiresAt || null,
    page: row.pageId ? { id: row.pageId, name: row.pageName } : null,
    forms: Array.isArray(row.forms) ? row.forms : [],
    lastLeadAt: row.lastLeadAt || null,
    leadsCaptured: row.leadsCaptured || 0,
    lastError: row.lastError || null,
    lastErrorAt: row.lastErrorAt || null,
    webhookUrl: cfg.webhookUrl,
  };
}

async function recordError(strapi, connectionId, message) {
  try {
    await strapi.entityService.update(CONNECTION_UID, connectionId, {
      data: { lastError: String(message || 'Unknown error').slice(0, 500), lastErrorAt: new Date().toISOString() },
    });
  } catch (_) {
    /* best-effort */
  }
}

// ─── Ingestion ───────────────────────────────────────────────────────────────

// Meta can deliver the same lead twice at once; serialize per org + lead id inside this process.
const inFlight = new Map();
function withLeadLock(key, fn) {
  const prev = inFlight.get(key) || Promise.resolve();
  const run = prev.catch(() => {}).then(fn);
  const tail = run.finally(() => {
    if (inFlight.get(key) === tail) inFlight.delete(key);
  });
  inFlight.set(key, tail);
  return run;
}

const trim = (v, n) => (v == null ? v : String(v).trim().slice(0, n));

function attributionOf(lead, event, form, connection, via) {
  return {
    leadgenId: String(lead.id || event.leadgenId),
    formId: lead.form_id || event.formId || null,
    formName: form?.name || null,
    pageId: connection.pageId,
    pageName: connection.pageName || null,
    campaignId: lead.campaign_id || null,
    campaignName: lead.campaign_name || null,
    adsetId: lead.adset_id || event.adgroupId || null,
    adsetName: lead.adset_name || null,
    adId: lead.ad_id || event.adId || null,
    adName: lead.ad_name || null,
    platform: lead.platform || null,
    isOrganic: lead.is_organic ?? null,
    createdTime: lead.created_time || null,
    capturedVia: via,
    capturedAt: new Date().toISOString(),
  };
}

function campaignLine(a) {
  const parts = [];
  if (a.formName || a.formId) parts.push(`form "${a.formName || a.formId}"`);
  if (a.campaignName || a.campaignId) parts.push(`campaign "${a.campaignName || a.campaignId}"`);
  if (a.adName || a.adId) parts.push(`ad "${a.adName || a.adId}"`);
  return parts.join(', ');
}

function answersText(fieldData) {
  return (fieldData || [])
    .filter((f) => f?.name)
    .map((f) => `${f.name}: ${(f.values || []).join(', ')}`)
    .join('\n');
}

function descriptionFor(mapped, attribution, extraLines = []) {
  const lines = [`Captured from Meta Lead Ads (${campaignLine(attribution) || 'lead form'}).`];
  if (mapped.lead.notes) lines.push('', mapped.lead.notes);
  const unmapped = Object.entries(mapped.unmappedAnswers || {});
  if (unmapped.length) lines.push('', 'Other answers:', ...unmapped.map(([k, v]) => `${k}: ${v}`));
  if (extraLines.length) lines.push('', ...extraLines);
  return lines.join('\n').slice(0, 10000);
}

async function writeActivity(strapi, { orgId, leadId, action, summary, metaData }) {
  try {
    await strapi.entityService.create(ACTIVITY_UID, {
      data: {
        organization: orgId,
        actor: null,
        action,
        subjectType: 'lead_company',
        subjectId: leadId,
        leadCompany: leadId,
        summary: summary.slice(0, 1000),
        meta: metaData,
      },
    });
  } catch (err) {
    strapi.log.warn(`[meta-lead-ads] activity write failed: ${err?.message || err}`);
  }
}

/** Existing lead company for this person (email/phone on a lead or a linked contact), or null. */
async function findExistingPerson(strapi, orgId, email, phone) {
  if (!email && !phone) return null;
  const leadIndex = await buildIndex(strapi, orgId, 'lead');
  const leadMatch = matchIn(leadIndex, 'lead', { email, phone });
  if (leadMatch) return { leadId: leadMatch.id, matchedOn: leadMatch.matchedOn, contactId: null };
  const contactIndex = await buildIndex(strapi, orgId, 'contact');
  const contactMatch = matchIn(contactIndex, 'contact', { email, phone });
  if (!contactMatch) return null;
  const contact = await strapi.entityService.findOne(CONTACT_UID, contactMatch.id, {
    fields: ['id'],
    populate: { leadCompany: { fields: ['id'] } },
  });
  return { leadId: contact?.leadCompany?.id || null, matchedOn: contactMatch.matchedOn, contactId: contactMatch.id };
}

/**
 * Turn one Meta lead into Grow records. Idempotent per (org, Meta lead id).
 * @param {object} p { connection, event: { leadgenId, formId, adId, adgroupId }, lead?: prefetched Graph lead, via }
 * @returns {Promise<{ status: 'created'|'duplicate'|'matched'|'skipped_form', leadId?: number, matchedOn?: string }>}
 */
async function ingestLead(strapi, { connection, event, lead: prefetched, via = 'webhook' }) {
  const orgId = Number(connection.organization?.id ?? connection.organization);
  const leadgenId = String(event.leadgenId);
  return withLeadLock(`${orgId}:${leadgenId}`, async () => {
    const already = await strapi.entityService.findMany(LEAD_UID, {
      filters: { organization: orgId, metaLeadId: leadgenId },
      fields: ['id'],
      limit: 1,
    });
    if (already[0]) return { status: 'duplicate', leadId: already[0].id };

    const forms = Array.isArray(connection.forms) ? connection.forms : [];
    const formOf = (id) => forms.find((f) => String(f.id) === String(id) && f.enabled !== false);
    if (event.formId && !formOf(event.formId)) return { status: 'skipped_form' };

    const cfg = metaConfig();
    let lead = prefetched;
    if (!lead) {
      const pageToken = decryptToken(connection.pageTokenEnc, cfg);
      if (!pageToken) throw new Error('The Meta connection has no Page token. Reconnect in Grow Settings.');
      lead = await clientFor(pageToken, cfg).fetchLeadById(leadgenId);
    }
    const form = formOf(lead.form_id || event.formId);
    if (!form) return { status: 'skipped_form' };

    const mapped = meta.mapFieldData(lead.field_data, form.mapping || {});
    const attribution = { ...attributionOf(lead, event, form, connection, via), utm: mapped.utm };
    const email = normalizeEmail(mapped.lead.email || mapped.contact.email);
    const phoneRaw = mapped.lead.phone || mapped.contact.phone || null;
    const phone = normalizePhone(phoneRaw);

    // Same person already in Grow → log on their lead instead of creating another one.
    const existing = await findExistingPerson(strapi, orgId, email, phone);
    if (existing?.leadId) {
      const marker = `[Meta lead ${leadgenId}]`;
      const logged = await strapi.entityService.findMany(ACTIVITY_UID, {
        filters: { organization: orgId, leadCompany: existing.leadId, summary: { $contains: marker } },
        fields: ['id'],
        limit: 1,
      });
      if (!logged[0]) {
        await writeActivity(strapi, {
          orgId,
          leadId: existing.leadId,
          action: 'comment',
          summary: `New Meta Lead Ads submission from an existing lead (matched by ${existing.matchedOn}) — ${campaignLine(attribution)} ${marker}`,
          metaData: { source: 'meta_lead_ads', duplicate: true, matchedOn: existing.matchedOn, attribution, answers: answersText(lead.field_data) },
        });
      }
      return { status: 'matched', leadId: existing.leadId, matchedOn: existing.matchedOn };
    }

    const fullName = mapped.contact.fullName || [mapped.contact.firstName, mapped.contact.lastName].filter(Boolean).join(' ');
    const data = { organization: orgId, source: LEAD_SOURCE, status: 'NEW', metaLeadId: leadgenId, metaAttribution: attribution };
    for (const k of LEAD_FIELDS) if (mapped.lead[k]) data[k] = trim(mapped.lead[k], 255);
    data.companyName = trim(mapped.lead.companyName || fullName || email || phoneRaw || `Meta lead ${leadgenId}`, 255);
    const extraLines = [];
    if (data.email && !normalizeEmail(data.email)) {
      extraLines.push(`Email (as entered): ${data.email}`);
      delete data.email;
    } else if (data.email) data.email = normalizeEmail(data.email);
    if (phone) data.phone = phone;
    if (Object.keys(mapped.customFields).length) data.customFields = { ...mapped.customFields };

    const connectedBy = connection.connectedBy?.id ?? connection.connectedBy ?? null;
    await applyAssignmentOnCreate(strapi, orgId, data, { explicitOwner: false, fallbackUserId: connectedBy });
    if (data.customFields) {
      const cfError = await applyCustomFields(strapi, orgId, 'lead', data, null);
      if (cfError) {
        extraLines.push(...Object.entries(mapped.customFields).map(([k, v]) => `${k}: ${v}`));
        delete data.customFields;
      }
    }
    data.description = descriptionFor(mapped, attribution, extraLines);

    const entry = await strapi.entityService.create(LEAD_UID, { data });

    // Contact (the person who filled the form)
    const hasPerson = mapped.contact.firstName || email || phone;
    if (hasPerson) {
      try {
        if (existing?.contactId) {
          await strapi.entityService.update(CONTACT_UID, existing.contactId, { data: { leadCompany: entry.id } });
        } else {
          const first = trim(mapped.contact.firstName || (email ? email.split('@')[0] : 'Meta'), 120);
          await strapi.entityService.create(CONTACT_UID, {
            data: {
              organization: orgId,
              leadCompany: entry.id,
              firstName: first,
              lastName: trim(mapped.contact.lastName, 120) || '-',
              ...(email && { email }),
              ...(phone && { phone }),
              ...(mapped.contact.jobTitle && { jobTitle: trim(mapped.contact.jobTitle, 255) }),
              ...(mapped.lead.companyName && { companyName: trim(mapped.lead.companyName, 255) }),
              source: LEAD_SOURCE,
              isPrimaryContact: true,
              ...(data.assignedTo && { assignedTo: data.assignedTo }),
            },
          });
        }
      } catch (err) {
        strapi.log.warn(`[meta-lead-ads] contact create failed for lead ${entry.id}: ${err?.message || err}`);
      }
    }

    await writeActivity(strapi, {
      orgId,
      leadId: entry.id,
      action: 'create',
      summary: `Lead captured from Meta Lead Ads — ${campaignLine(attribution) || 'lead form'} [Meta lead ${leadgenId}]`,
      metaData: { source: 'meta_lead_ads', attribution },
    });

    if (data.assignedTo) {
      await notifyUsers(strapi, {
        userIds: [Number(data.assignedTo)],
        organizationId: orgId,
        type: 'lead_assigned',
        title: `New Meta lead: ${entry.companyName}`,
        message: data.assignedByRule ? `Assigned by the "${data.assignedByRule}" rule` : campaignLine(attribution) || 'From Meta Lead Ads',
        data: { subjectType: 'lead_company', subjectId: entry.id, href: `/sales/lead-companies/${entry.id}` },
      });
    }

    try {
      await strapi.entityService.update(CONNECTION_UID, connection.id, {
        data: { lastLeadAt: new Date().toISOString(), leadsCaptured: Number(connection.leadsCaptured || 0) + 1, lastError: null, lastErrorAt: null },
      });
      connection.leadsCaptured = Number(connection.leadsCaptured || 0) + 1;
    } catch (_) {
      /* best-effort */
    }
    return { status: 'created', leadId: entry.id };
  });
}

/** Clear cached GET responses for the org so new leads show at once (Redis api-cache). */
async function invalidateOrgCache(orgId) {
  try {
    await require('./cache').invalidateOrg(orgId);
  } catch (_) {
    /* cache is optional */
  }
}

module.exports = {
  CONNECTION_UID,
  LEAD_SOURCE,
  MAX_BACKFILL,
  metaConfig,
  missingConfig,
  encryptToken,
  decryptToken,
  clientFor,
  getConnection,
  getConnectionByPage,
  publicConnection,
  recordError,
  ingestLead,
  invalidateOrgCache,
};
