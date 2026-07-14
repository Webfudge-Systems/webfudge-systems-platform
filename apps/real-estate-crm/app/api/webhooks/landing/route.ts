import { NextRequest, NextResponse } from 'next/server'
import { scoreLead } from '@webfudge/lead-scoring'
import { parseBudgetMinValue } from '@webfudge/meta-ads'
import { enrichLead, getLeadById } from '../../../../lib/server/backendWebhookClient'
import { clientIpFrom, rateLimit } from '../../../../lib/server/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Public-facing endpoint (landing pages beacon here) — rate limit per IP.
const RATE_LIMIT = 30
const RATE_WINDOW_MS = 60_000

interface LandingPayload {
  leadId?: string | number
  timeOnPage?: number
  optionalAnswers?: Record<string, unknown>
  brochureDownloaded?: boolean
  floorPlanViewed?: boolean
}

/**
 * POST — landing-page enrichment. Updates the lead's engagement fields and
 * RE-SCORES it. Enrichment is additive-only: the score can only go up (the
 * backend also refuses to store a lower score).
 */
export async function POST(request: NextRequest) {
  const ip = clientIpFrom(request.headers)
  const limit = rateLimit(`landing:${ip}`, RATE_LIMIT, RATE_WINDOW_MS)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    )
  }

  let payload: LandingPayload
  try {
    payload = (await request.json()) as LandingPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const leadId = payload?.leadId
  if (leadId === undefined || leadId === null || String(leadId).trim() === '') {
    return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
  }
  // Internal numeric id — reject anything else before it reaches the backend.
  if (!/^\d+$/.test(String(leadId))) {
    return NextResponse.json({ error: 'Invalid leadId' }, { status: 400 })
  }

  // 1. Validate the lead exists and is org-attached (backend is the source of
  //    truth for tenancy — an unknown or orphaned id gets a 404, so this
  //    public endpoint can never write across tenants).
  const lead = await getLeadById(String(leadId)).catch(() => null)
  if (!lead || !lead.organizationId) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  // 2. Merge enrichment signals (never downgrade previously seen engagement).
  const timeOnPage =
    typeof payload.timeOnPage === 'number' && payload.timeOnPage >= 0
      ? Math.min(Math.floor(payload.timeOnPage), 24 * 60 * 60)
      : undefined
  const pageTimeSeconds = Math.max(timeOnPage ?? 0, lead.pageTimeSeconds ?? 0) || undefined

  const previousAnswers =
    lead.optionalAnswers && typeof lead.optionalAnswers === 'object' ? lead.optionalAnswers : {}
  const newAnswers =
    payload.optionalAnswers && typeof payload.optionalAnswers === 'object'
      ? payload.optionalAnswers
      : {}
  const optionalAnswers = { ...previousAnswers, ...newAnswers }
  const optionalAnswersCount = Object.keys(optionalAnswers).length

  // 3. Re-score with full context. pageVisited is now true; the additive-only
  //    engine guarantees this can only raise the score.
  const scoring = scoreLead({
    budgetRange: lead.budgetRange,
    // Re-derive the budget bound exactly as ingestion did, so the base
    // score stays consistent and enrichment remains purely additive.
    budgetMinValue: parseBudgetMinValue(lead.budgetRange),
    timeline: lead.timeline,
    purpose: lead.purpose,
    configInterest: lead.configInterest,
    pageVisited: true,
    pageTimeSeconds,
    optionalAnswersCount,
    brochureDownloaded: payload.brochureDownloaded === true,
    floorPlanViewed: payload.floorPlanViewed === true,
    projectMinPrice: lead.project?.minPrice ?? 0,
  })

  const result = await enrichLead(lead.id, {
    pageVisited: true,
    pageTimeSeconds,
    optionalAnswers: optionalAnswersCount ? optionalAnswers : undefined,
    score: scoring.score,
    tier: scoring.tier,
    scoreBreakdown: scoring.breakdown,
    scoredAt: new Date().toISOString(),
  }).catch((err) => {
    console.error('[landing-webhook] enrich failed:', err?.name, err?.message)
    return null
  })

  if (!result) {
    return NextResponse.json({ error: 'Enrichment failed' }, { status: 502 })
  }

  return NextResponse.json({
    ok: true,
    score: result.score,
    tier: result.tier,
    upgradedToHot: result.upgradedToHot,
  })
}
