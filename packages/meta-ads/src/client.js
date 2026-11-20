'use strict';

const { MetaApiError } = require('./errors');
const { appSecretProof, sha256Hex } = require('./hash');

const DEFAULT_GRAPH_VERSION = 'v25.0';
const DEFAULT_BASE_URL = 'https://graph.facebook.com';

const LEAD_FIELDS = [
  'id',
  'created_time',
  'ad_id',
  'ad_name',
  'adset_id',
  'adset_name',
  'campaign_id',
  'campaign_name',
  'form_id',
  'platform',
  'is_organic',
  'field_data',
].join(',');

/**
 * Graph API client bound to one access token (a user token or a Page token).
 * Options: { graphVersion, baseUrl, fetchImpl, appSecret } — with appSecret every call carries
 * appsecret_proof, which Meta requires when "Require App Secret" is on.
 * Never logs tokens or lead PII; errors carry only Meta's message and codes.
 */
function createMetaClient(accessToken, options = {}) {
  if (!accessToken) throw new Error('createMetaClient: accessToken is required');
  const version = options.graphVersion || DEFAULT_GRAPH_VERSION;
  const baseUrl = String(options.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const proof = options.appSecret ? appSecretProof(accessToken, options.appSecret) : null;

  async function graphRequest(path, params = {}, init = {}) {
    const url = new URL(/^https?:\/\//.test(path) ? path : `${baseUrl}/${version}/${String(path).replace(/^\//, '')}`);
    for (const [key, value] of Object.entries(params)) {
      if (value != null) url.searchParams.set(key, String(value));
    }
    url.searchParams.set('access_token', accessToken);
    if (proof) url.searchParams.set('appsecret_proof', proof);

    const response = await fetchImpl(url.toString(), {
      method: init.method || 'GET',
      ...(init.body !== undefined && {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(init.body),
      }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || (json && json.error)) {
      const err = (json && json.error) || {};
      throw new MetaApiError(err.message || `Graph API HTTP ${response.status}`, {
        status: response.status,
        type: err.type,
        code: err.code,
        subcode: err.error_subcode,
        fbtraceId: err.fbtrace_id,
      });
    }
    return json;
  }

  /** Follow paging.next up to `maxItems` rows. */
  async function collect(path, params, maxItems = 500) {
    const out = [];
    let page = await graphRequest(path, params);
    while (page) {
      for (const row of page.data || []) {
        out.push(row);
        if (out.length >= maxItems) return out;
      }
      const next = page.paging && page.paging.next;
      if (!next) break;
      // paging.next already carries the query (including the token); strip it and re-add ours.
      const u = new URL(next);
      u.searchParams.delete('access_token');
      u.searchParams.delete('appsecret_proof');
      page = await graphRequest(u.toString());
    }
    return out;
  }

  return {
    graphRequest,

    /** Full lead including field_data answers and ad/adset/campaign ids and names. */
    fetchLeadById(leadgenId) {
      return graphRequest(String(leadgenId), { fields: LEAD_FIELDS });
    },

    /** Pages the user manages, with a Page access token for each (user token only). */
    listPages() {
      return collect('me/accounts', { fields: 'id,name,access_token,tasks', limit: 100 }, 500);
    },

    /** Lead forms on a Page (Page token), including their questions for field mapping. */
    listLeadForms(pageId) {
      return collect(`${pageId}/leadgen_forms`, { fields: 'id,name,status,locale,questions,created_time', limit: 100 }, 500);
    },

    /** Leads on a form (Page token), newest first; `since` = unix seconds for backfill. */
    listFormLeads(formId, { since, maxItems = 500 } = {}) {
      const params = { fields: LEAD_FIELDS, limit: 100 };
      if (since) {
        params.filtering = JSON.stringify([{ field: 'time_created', operator: 'GREATER_THAN', value: Number(since) }]);
      }
      return collect(`${formId}/leads`, params, maxItems);
    },

    /** Subscribe our app to the Page's leadgen webhook (Page token). */
    async subscribePage(pageId) {
      const res = await graphRequest(`${pageId}/subscribed_apps`, { subscribed_fields: 'leadgen' }, { method: 'POST' });
      return Boolean(res && res.success);
    },

    async unsubscribePage(pageId) {
      const res = await graphRequest(`${pageId}/subscribed_apps`, {}, { method: 'DELETE' });
      return Boolean(res && res.success);
    },

    async listCampaigns(adAccountId) {
      const accountPath = String(adAccountId).startsWith('act_') ? adAccountId : `act_${adAccountId}`;
      return collect(`${accountPath}/campaigns`, { fields: 'id,name,status,objective', limit: 200 }, 1000);
    },

    async fetchCampaignInsights(campaignId, dateRange) {
      const params = { fields: 'spend,impressions,clicks,actions,date_start,date_stop' };
      if (dateRange) params.time_range = JSON.stringify({ since: dateRange.since, until: dateRange.until });
      const result = await graphRequest(`${campaignId}/insights`, params);
      const row = (result.data && result.data[0]) || {};
      const spend = row.spend ? parseFloat(row.spend) : 0;
      const leads = (row.actions || [])
        .filter((a) => a.action_type === 'lead' || a.action_type === 'leadgen_grouped')
        .reduce((sum, a) => sum + (parseInt(a.value, 10) || 0), 0);
      return {
        campaignId,
        dateStart: row.date_start,
        dateStop: row.date_stop,
        spend,
        impressions: row.impressions ? parseInt(row.impressions, 10) : 0,
        clicks: row.clicks ? parseInt(row.clicks, 10) : 0,
        leads,
        costPerLead: leads > 0 ? spend / leads : null,
      };
    },

    /**
     * Conversions API event (e.g. a qualified lead) so Meta optimises for real buyers.
     * Email/phone are SHA-256 hashed before they leave this function.
     */
    async sendConversionEvent(input) {
      const userData = {};
      if (input.email) userData.em = [sha256Hex(String(input.email).trim().toLowerCase())];
      if (input.phone) userData.ph = [sha256Hex(String(input.phone).replace(/[^0-9]/g, ''))];
      if (input.leadgenId) userData.lead_id = input.leadgenId;
      const body = {
        data: [
          {
            event_name: input.eventName || 'QualifiedLead',
            event_time: input.eventTime || Math.floor(Date.now() / 1000),
            event_id: input.eventId || input.leadgenId,
            action_source: 'system_generated',
            user_data: userData,
            custom_data: input.customData || {},
          },
        ],
      };
      if (input.testEventCode) body.test_event_code = input.testEventCode;
      const result = await graphRequest(`${input.pixelId}/events`, {}, { method: 'POST', body });
      return { eventsReceived: result.events_received || 0, fbtraceId: result.fbtrace_id };
    },
  };
}

module.exports = { createMetaClient, DEFAULT_GRAPH_VERSION, DEFAULT_BASE_URL, LEAD_FIELDS };
