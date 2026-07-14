export interface MetaFieldDataEntry {
  name: string
  values: string[]
}

/** A lead as returned by GET /{leadgen_id} on the Graph API. */
export interface MetaLead {
  id: string
  created_time?: string
  ad_id?: string
  adset_id?: string
  campaign_id?: string
  form_id?: string
  field_data: MetaFieldDataEntry[]
}

export interface MetaCampaign {
  id: string
  name: string
  status?: string
  objective?: string
}

export interface CampaignInsights {
  campaignId: string
  dateStart?: string
  dateStop?: string
  spend: number
  impressions: number
  clicks: number
  /** Lead count from the actions array (lead / leadgen actions). */
  leads: number
  /** Cost per lead: spend / leads (null when no leads). */
  costPerLead: number | null
}

export interface DateRange {
  /** YYYY-MM-DD */
  since: string
  /** YYYY-MM-DD */
  until: string
}

export interface ConversionEventInput {
  /** Meta Pixel / dataset id to send the event to. */
  pixelId: string
  /** Standard or custom event name; defaults to 'QualifiedLead'. */
  eventName?: string
  /** Unix seconds; defaults to now. */
  eventTime?: number
  /** leadgen id — lets Meta join the event back to the lead ad. */
  leadgenId?: string
  email?: string
  phone?: string
  score: number
  tier: string
  /** Deduplication id; defaults to leadgenId. */
  eventId?: string
  /** For CAPI test events (Meta Events Manager test code). */
  testEventCode?: string
}

export interface ConversionEventResult {
  eventsReceived: number
  fbtraceId?: string
}

export interface TokenExchangeResult {
  accessToken: string
  tokenType: string
  /** Seconds until expiry; long-lived user tokens are ~60 days. */
  expiresIn?: number
}

export interface MetaClientOptions {
  /** Graph API version, e.g. 'v23.0'. */
  graphVersion?: string
  /** Override fetch (for testing). */
  fetchImpl?: typeof fetch
  /** Base URL override (for testing). */
  baseUrl?: string
}

export interface MetaClient {
  fetchLeadById(leadgenId: string): Promise<MetaLead>
  listCampaigns(adAccountId: string): Promise<MetaCampaign[]>
  fetchCampaignInsights(campaignId: string, dateRange?: DateRange): Promise<CampaignInsights>
  sendConversionEvent(input: ConversionEventInput): Promise<ConversionEventResult>
}

export class MetaApiError extends Error {
  readonly status: number
  readonly type?: string
  readonly code?: number
  readonly fbtraceId?: string

  constructor(
    message: string,
    opts: { status: number; type?: string; code?: number; fbtraceId?: string }
  ) {
    // NOTE: message must never contain access tokens or lead PII.
    super(message)
    this.name = 'MetaApiError'
    this.status = opts.status
    this.type = opts.type
    this.code = opts.code
    this.fbtraceId = opts.fbtraceId
  }
}
