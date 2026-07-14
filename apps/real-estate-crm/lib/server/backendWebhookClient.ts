/**
 * Server-only client for the Strapi internal webhook API (/api/re-webhooks/*).
 * Authenticates with the RE_WEBHOOK_SECRET shared-secret header — no user JWT
 * is involved; tenancy is derived by the backend from the project row.
 *
 * Never import this from client components. Never log secrets or lead PII.
 */

const API_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1338'

function secret(): string {
  const value = process.env.RE_WEBHOOK_SECRET
  if (!value) throw new Error('RE_WEBHOOK_SECRET is not configured')
  return value
}

async function request<T>(path: string, init?: Omit<RequestInit, 'body'> & { body?: unknown }): Promise<T> {
  const { body, headers, ...rest } = init || {}
  const response = await fetch(`${API_URL}/api/re-webhooks${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': secret(),
      ...(headers as Record<string, string>),
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
    cache: 'no-store',
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = (json as { error?: { message?: string } })?.error?.message
    throw new BackendWebhookError(message || `Backend webhook API HTTP ${response.status}`, response.status)
  }
  return json as T
}

export class BackendWebhookError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'BackendWebhookError'
    this.status = status
  }
}

export interface ProjectByCampaign {
  id: number
  name: string
  minPrice: number
  metaFormFieldMapping: Record<string, string[]>
  organizationId: number | null
}

export interface WebhookLead {
  id: number
  budgetRange?: string
  timeline?: 'immediate' | 'three_to_six_months' | 'browsing'
  purpose?: 'own_use' | 'investment'
  configInterest?: string
  pageVisited: boolean
  pageTimeSeconds?: number
  optionalAnswers?: Record<string, unknown>
  score?: number
  tier?: string
  organizationId: number | null
  project: { id: number; minPrice: number } | null
}

export async function getProjectByCampaign(campaignId: string): Promise<ProjectByCampaign | null> {
  try {
    const result = await request<{ data: ProjectByCampaign }>(
      `/project-by-campaign/${encodeURIComponent(campaignId)}`
    )
    return result.data
  } catch (err) {
    if (err instanceof BackendWebhookError && err.status === 404) return null
    throw err
  }
}

export async function getLeadById(leadId: string | number): Promise<WebhookLead | null> {
  try {
    const result = await request<{ data: WebhookLead }>(`/leads/${encodeURIComponent(String(leadId))}`)
    return result.data
  } catch (err) {
    if (err instanceof BackendWebhookError && err.status === 404) return null
    throw err
  }
}

export interface IngestLeadInput {
  projectId: number
  name: string
  phone?: string
  email?: string
  source: string
  metaLeadId?: string
  metaCampaignId?: string
  metaAdsetId?: string
  metaAdId?: string
  budgetRange?: string
  timeline?: string
  purpose?: string
  configInterest?: string
  optionalAnswers?: Record<string, unknown>
  score: number
  tier: string
  scoreBreakdown: unknown
  scoredAt: string
}

export async function ingestLead(
  input: IngestLeadInput
): Promise<{ id: number; tier: string; deduplicated: boolean }> {
  const result = await request<{ data: { id: number; tier: string }; meta: { deduplicated: boolean } }>(
    '/leads',
    { method: 'POST', body: { data: input } }
  )
  return { ...result.data, deduplicated: result.meta?.deduplicated ?? false }
}

export interface EnrichLeadInput {
  pageVisited: boolean
  pageTimeSeconds?: number
  optionalAnswers?: Record<string, unknown>
  score: number
  tier: string
  scoreBreakdown: unknown
  scoredAt: string
}

export async function enrichLead(
  leadId: string | number,
  input: EnrichLeadInput
): Promise<{ id: number; score: number; tier: string; upgradedToHot: boolean }> {
  const result = await request<{ data: { id: number; score: number; tier: string; upgradedToHot: boolean } }>(
    `/leads/${encodeURIComponent(String(leadId))}/enrich`,
    { method: 'PUT', body: { data: input } }
  )
  return result.data
}
