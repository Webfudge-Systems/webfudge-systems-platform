import {
  MetaApiError,
  type CampaignInsights,
  type ConversionEventInput,
  type ConversionEventResult,
  type DateRange,
  type MetaCampaign,
  type MetaClient,
  type MetaClientOptions,
  type MetaLead,
} from './types'
import { sha256Hex } from './hash'

export const DEFAULT_GRAPH_VERSION = 'v25.0'
const DEFAULT_BASE_URL = 'https://graph.facebook.com'

interface GraphErrorBody {
  error?: {
    message?: string
    type?: string
    code?: number
    fbtrace_id?: string
  }
}

/**
 * Create a Meta Graph API client bound to an access token.
 * Pure fetch-based, framework-agnostic. NEVER logs tokens or lead PII.
 */
export function createMetaClient(accessToken: string, options: MetaClientOptions = {}): MetaClient {
  if (!accessToken) throw new Error('createMetaClient: accessToken is required')
  const version = options.graphVersion || DEFAULT_GRAPH_VERSION
  const baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '')
  const fetchImpl = options.fetchImpl || fetch

  async function graphRequest<T>(
    path: string,
    params: Record<string, string> = {},
    init?: { method?: 'GET' | 'POST'; body?: unknown }
  ): Promise<T> {
    const url = new URL(`${baseUrl}/${version}/${path.replace(/^\//, '')}`)
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
    url.searchParams.set('access_token', accessToken)

    const response = await fetchImpl(url.toString(), {
      method: init?.method || 'GET',
      ...(init?.body !== undefined && {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(init.body),
      }),
    })

    const json = (await response.json().catch(() => ({}))) as T & GraphErrorBody
    if (!response.ok || json.error) {
      const err = json.error || {}
      // Meta error messages are safe to surface; the token lives in the query
      // string and is never echoed back in the error body.
      throw new MetaApiError(err.message || `Graph API HTTP ${response.status}`, {
        status: response.status,
        type: err.type,
        code: err.code,
        fbtraceId: err.fbtrace_id,
      })
    }
    return json
  }

  return {
    /** Full lead including the field_data answers array. */
    async fetchLeadById(leadgenId: string): Promise<MetaLead> {
      return graphRequest<MetaLead>(leadgenId, {
        fields: 'id,created_time,ad_id,adset_id,campaign_id,form_id,field_data',
      })
    },

    async listCampaigns(adAccountId: string): Promise<MetaCampaign[]> {
      const accountPath = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
      const result = await graphRequest<{ data: MetaCampaign[] }>(`${accountPath}/campaigns`, {
        fields: 'id,name,status,objective',
        limit: '200',
      })
      return result.data || []
    },

    async fetchCampaignInsights(
      campaignId: string,
      dateRange?: DateRange
    ): Promise<CampaignInsights> {
      const params: Record<string, string> = {
        fields: 'spend,impressions,clicks,actions,date_start,date_stop',
      }
      if (dateRange) {
        params.time_range = JSON.stringify({ since: dateRange.since, until: dateRange.until })
      }
      const result = await graphRequest<{
        data: Array<{
          spend?: string
          impressions?: string
          clicks?: string
          date_start?: string
          date_stop?: string
          actions?: Array<{ action_type: string; value: string }>
        }>
      }>(`${campaignId}/insights`, params)

      const row = result.data?.[0]
      const spend = row?.spend ? parseFloat(row.spend) : 0
      const leads = (row?.actions || [])
        .filter((a) => a.action_type === 'lead' || a.action_type === 'leadgen_grouped')
        .reduce((sum, a) => sum + (parseInt(a.value, 10) || 0), 0)

      return {
        campaignId,
        dateStart: row?.date_start,
        dateStop: row?.date_stop,
        spend,
        impressions: row?.impressions ? parseInt(row.impressions, 10) : 0,
        clicks: row?.clicks ? parseInt(row.clicks, 10) : 0,
        leads,
        costPerLead: leads > 0 ? spend / leads : null,
      }
    },

    /**
     * Conversions API (CAPI): send the SCORED lead back to Meta so the
     * delivery algorithm optimises toward real qualified buyers instead of
     * form-openers. Email/phone are SHA-256 hashed per Meta requirements
     * before leaving this function — raw PII is never transmitted or logged.
     */
    async sendConversionEvent(input: ConversionEventInput): Promise<ConversionEventResult> {
      const userData: Record<string, unknown> = {}
      if (input.email) userData.em = [await sha256Hex(input.email.trim().toLowerCase())]
      if (input.phone) userData.ph = [await sha256Hex(input.phone.replace(/[^0-9]/g, ''))]
      if (input.leadgenId) userData.lead_id = input.leadgenId

      const body: Record<string, unknown> = {
        data: [
          {
            event_name: input.eventName || 'QualifiedLead',
            event_time: input.eventTime || Math.floor(Date.now() / 1000),
            event_id: input.eventId || input.leadgenId,
            action_source: 'system_generated',
            user_data: userData,
            custom_data: {
              lead_score: input.score,
              lead_tier: input.tier,
            },
          },
        ],
      }
      if (input.testEventCode) body.test_event_code = input.testEventCode

      const result = await graphRequest<{ events_received?: number; fbtrace_id?: string }>(
        `${input.pixelId}/events`,
        {},
        { method: 'POST', body }
      )
      return { eventsReceived: result.events_received ?? 0, fbtraceId: result.fbtrace_id }
    },
  }
}
