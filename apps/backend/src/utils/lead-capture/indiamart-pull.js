'use strict';

/**
 * IndiaMART Lead Manager Pull API v2 client (ticket G7). Off unless an org turns on "Pull from IndiaMART"
 * and saves its CRM key in Grow Settings → Lead sources. The Push webhook is the recommended path; pull is
 * for accounts that can't activate push, or to back-fill.
 *
 * API (https://help.indiamart.com/knowledge-base/lms-crm-integration-v2):
 *   GET https://mapi.indiamart.com/wservce/crm/crmListing/v2/?glusr_crm_key=KEY&start_time=..&end_time=..
 *   times are IST "DD-Mon-YYYYHH:MM:SS"; max 7-day window; at most one call per 5 minutes per key
 *   (more than 5 calls/minute blocks the key for 15 minutes); the key expires after 7 days unused.
 *   Response { CODE, STATUS, MESSAGE, TOTAL_RECORDS, RESPONSE: [records] }; CODE 204 = no leads.
 *
 * Env: INDIAMART_PULL_URL (optional override of the endpoint, e.g. for a mock in tests).
 */

const { indiamartRecords, mapIndiaMartRecord } = require('./mappers');
const { getCaptureConfig, saveCaptureConfig, SOURCES } = require('./config');

const DEFAULT_URL = 'https://mapi.indiamart.com/wservce/crm/crmListing/v2/';
const MIN_INTERVAL_MS = 10 * 60 * 1000; // stay well clear of IndiaMART's 5-minute limit
const MAX_WINDOW_MS = 7 * 24 * 60 * 60 * 1000 - 60 * 1000;
const OVERLAP_MS = 5 * 60 * 1000; // re-read the last 5 minutes; UNIQUE_QUERY_ID dedupes repeats
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Date → IndiaMART IST timestamp "DD-Mon-YYYYHH:MM:SS". */
function formatIst(date) {
  const ist = new Date(date.getTime() + 330 * 60000);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(ist.getUTCDate())}-${MONTHS[ist.getUTCMonth()]}-${ist.getUTCFullYear()}${p(ist.getUTCHours())}:${p(ist.getUTCMinutes())}:${p(ist.getUTCSeconds())}`;
}

/** Window to request: from last pull (minus overlap), capped to 7 days; first run = last 24 hours. */
function pullWindow(lastPulledAt, now = new Date()) {
  const last = lastPulledAt ? new Date(lastPulledAt) : null;
  let start = last && !Number.isNaN(last.getTime()) ? new Date(last.getTime() - OVERLAP_MS) : new Date(now.getTime() - 24 * 3600 * 1000);
  if (now - start > MAX_WINDOW_MS) start = new Date(now.getTime() - MAX_WINDOW_MS);
  return { start, end: now };
}

/** One HTTP call. Returns { records, code, message }. Throws on network errors. */
async function fetchLeads(crmKey, start, end, { fetchImpl = fetch } = {}) {
  const url = new URL(process.env.INDIAMART_PULL_URL || DEFAULT_URL);
  url.searchParams.set('glusr_crm_key', crmKey);
  url.searchParams.set('start_time', formatIst(start));
  url.searchParams.set('end_time', formatIst(end));
  const res = await fetchImpl(url.toString(), { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
  const body = await res.json().catch(() => ({}));
  const code = Number(body.CODE) || res.status;
  return { code, message: String(body.MESSAGE || ''), records: code === 200 ? indiamartRecords(body) : [] };
}

/**
 * Pull and ingest new IndiaMART leads for one org.
 * @returns {{ skipped?: string, fetched?: number, created?: number, merged?: number, duplicates?: number, failed?: number }}
 */
async function pullForOrg(strapi, orgId, { force = false, fetchImpl } = {}) {
  const { ingestLead, logCaptureEvent } = require('../lead-ingest');
  const config = await getCaptureConfig(strapi, orgId);
  const src = config.sources.indiamart || {};
  const pull = src.pull || {};
  if (!src.enabled) return { skipped: 'IndiaMART is switched off' };
  if (!pull.enabled || !pull.crmKey) return { skipped: 'Pull is not configured' };
  const now = new Date();
  if (!force && pull.lastAttemptAt && now - new Date(pull.lastAttemptAt) < MIN_INTERVAL_MS) return { skipped: 'Pulled less than 10 minutes ago' };
  if (force && pull.lastAttemptAt && now - new Date(pull.lastAttemptAt) < 5 * 60 * 1000) {
    return { skipped: 'IndiaMART allows one pull every 5 minutes. Try again shortly.' };
  }

  const { start, end } = pullWindow(pull.lastPulledAt, now);
  const save = async (patch) => {
    const fresh = await getCaptureConfig(strapi, orgId);
    const s = fresh.sources.indiamart || {};
    fresh.sources.indiamart = { ...s, pull: { ...(s.pull || {}), ...patch } };
    await saveCaptureConfig(strapi, orgId, fresh);
  };
  await save({ lastAttemptAt: now.toISOString() });

  let resp;
  try {
    resp = await fetchLeads(pull.crmKey, start, end, { fetchImpl });
  } catch (err) {
    await save({ lastError: `Network error: ${err?.message || err}` });
    await logCaptureEvent(strapi, { orgId, sourceKey: 'indiamart', status: 'error', message: `Pull failed: ${err?.message || err}` });
    return { failed: 1, error: err?.message || String(err) };
  }
  if (resp.code !== 200 && resp.code !== 204) {
    const hint = resp.code === 401 ? ' (wrong or expired CRM key — keys expire after 7 days unused; generate a new one in IndiaMART Lead Manager)' : '';
    await save({ lastError: `IndiaMART ${resp.code}: ${resp.message}${hint}`.slice(0, 400) });
    await logCaptureEvent(strapi, { orgId, sourceKey: 'indiamart', status: 'error', message: `Pull: IndiaMART ${resp.code} ${resp.message}`.slice(0, 480) });
    return { failed: 1, error: resp.message, code: resp.code };
  }

  const counts = { fetched: resp.records.length, created: 0, merged: 0, duplicates: 0, failed: 0 };
  for (const rec of resp.records) {
    const mapped = mapIndiaMartRecord(rec);
    try {
      const r = await ingestLead(strapi, {
        orgId,
        source: SOURCES.indiamart.leadSource,
        sourceLabel: 'IndiaMART',
        sourceKey: 'indiamart',
        lead: mapped.lead,
        sourceDetails: { ...mapped.sourceDetails, via: 'pull' },
        externalId: mapped.externalId,
      });
      if (r.status === 'created') counts.created += 1;
      else if (r.status === 'merged') counts.merged += 1;
      else counts.duplicates += 1;
    } catch (err) {
      counts.failed += 1;
      await logCaptureEvent(strapi, { orgId, sourceKey: 'indiamart', status: 'rejected', externalId: mapped.externalId, message: `Pull: ${err?.message || err}` });
    }
  }
  await save({ lastPulledAt: end.toISOString(), lastError: null, lastResult: counts });
  return counts;
}

/** Cron: pull for every org that turned pull on. No-op when none did. */
async function pullAllConfigured(strapi) {
  const rows = await strapi.entityService.findMany('api::crm-org-setting.crm-org-setting', {
    filters: { key: 'lead_capture' },
    populate: { organization: { fields: ['id'] } },
    limit: 5000,
  });
  for (const row of rows) {
    const im = row.value?.sources?.indiamart;
    const orgId = row.organization?.id;
    if (!orgId || !im?.enabled || !im?.pull?.enabled || !im?.pull?.crmKey) continue;
    try {
      await pullForOrg(strapi, orgId);
    } catch (err) {
      strapi.log.warn(`[indiamart-pull] org ${orgId}: ${err?.message || err}`);
    }
  }
}

module.exports = { formatIst, pullWindow, fetchLeads, pullForOrg, pullAllConfigured, DEFAULT_URL };
