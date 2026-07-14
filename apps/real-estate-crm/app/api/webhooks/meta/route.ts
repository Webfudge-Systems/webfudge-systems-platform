import { NextRequest, NextResponse } from 'next/server'
import {
  createMetaClient,
  extractLeadgenEvents,
  mapFieldData,
  parseBudgetMinValue,
  verifyWebhookChallenge,
  verifyWebhookSignature,
  type LeadgenEvent,
} from '@webfudge/meta-ads'
import { scoreLead } from '@webfudge/lead-scoring'
import { getProjectByCampaign, ingestLead } from '../../../../lib/server/backendWebhookClient'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET — Meta webhook verification: echo hub.challenge when hub.verify_token
 * matches META_VERIFY_TOKEN.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const verification = verifyWebhookChallenge(
    {
      'hub.mode': params.get('hub.mode'),
      'hub.verify_token': params.get('hub.verify_token'),
      'hub.challenge': params.get('hub.challenge'),
    },
    process.env.META_VERIFY_TOKEN || ''
  )
  if (verification.ok) {
    return new NextResponse(verification.challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

/**
 * POST — lead ingestion.
 * 1. Verify X-Hub-Signature-256 against the RAW body (mandatory).
 * 2. Return 200 immediately; process asynchronously (Meta retries on timeout).
 */
export async function POST(request: NextRequest) {
  const appSecret = process.env.META_APP_SECRET || ''
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  const valid = await verifyWebhookSignature(rawBody, signature, appSecret)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const events = extractLeadgenEvents(payload)

  // Fire-and-forget: never keep Meta waiting (it retries on timeout, which
  // would double-process). Idempotency on metaLeadId makes retries safe anyway.
  if (events.length > 0) {
    void processLeadgenEvents(events).catch((err) => {
      // Log the error class/message only — never the payload (PII).
      console.error('[meta-webhook] processing failed:', err?.name, err?.message)
    })
  }

  return NextResponse.json({ received: true }, { status: 200 })
}

async function processLeadgenEvents(events: LeadgenEvent[]): Promise<void> {
  const accessToken = process.env.META_ACCESS_TOKEN
  if (!accessToken) {
    console.error('[meta-webhook] META_ACCESS_TOKEN not configured; skipping ingestion')
    return
  }
  const client = createMetaClient(accessToken)

  for (const event of events) {
    try {
      // 1. Fetch the full lead (field_data answers) from the Graph API.
      const metaLead = await client.fetchLeadById(event.leadgenId)

      // 2. Resolve the project via meta_campaign_id.
      const campaignId = metaLead.campaign_id
      if (!campaignId) {
        console.error(`[meta-webhook] lead ${event.leadgenId} has no campaign_id; skipping`)
        continue
      }
      const project = await getProjectByCampaign(campaignId)
      if (!project) {
        console.error(`[meta-webhook] no project mapped to campaign ${campaignId}; skipping lead`)
        continue
      }

      // 3. Map Meta field_data using the project's configurable mapping.
      const fields = mapFieldData(metaLead.field_data, project.metaFormFieldMapping)

      // 4. Score on form answers alone (no landing-page signal yet).
      const scoring = scoreLead({
        budgetRange: fields.budgetRange,
        budgetMinValue: parseBudgetMinValue(fields.budgetRange),
        timeline: fields.timeline,
        purpose: fields.purpose,
        configInterest: fields.configInterest,
        pageVisited: false,
        projectMinPrice: project.minPrice,
      })

      // 5. Insert (idempotent on metaLeadId; backend logs hot-lead activity).
      const result = await ingestLead({
        projectId: project.id,
        name: fields.name || 'Meta lead',
        phone: fields.phone,
        email: fields.email,
        source: 'meta_instant_form',
        metaLeadId: metaLead.id,
        metaCampaignId: campaignId,
        metaAdsetId: metaLead.adset_id,
        metaAdId: metaLead.ad_id || event.adId,
        budgetRange: fields.budgetRange,
        timeline: fields.timeline,
        purpose: fields.purpose,
        configInterest: fields.configInterest,
        optionalAnswers: Object.keys(fields.unmappedAnswers).length
          ? fields.unmappedAnswers
          : undefined,
        score: scoring.score,
        tier: scoring.tier,
        scoreBreakdown: scoring.breakdown,
        scoredAt: new Date().toISOString(),
      })

      if (result.deduplicated) continue

      // 6. CAPI: send the SCORED lead back to Meta so delivery optimises
      //    toward qualified buyers, not form-openers.
      const pixelId = process.env.META_PIXEL_ID
      if (pixelId) {
        try {
          await client.sendConversionEvent({
            pixelId,
            leadgenId: metaLead.id,
            email: fields.email,
            phone: fields.phone,
            score: scoring.score,
            tier: scoring.tier,
            testEventCode: process.env.META_CAPI_TEST_EVENT_CODE,
          })
        } catch (err) {
          const e = err as Error
          console.error('[meta-webhook] CAPI event failed:', e?.name, e?.message)
        }
      }
    } catch (err) {
      const e = err as Error
      console.error(`[meta-webhook] failed to process leadgen ${event.leadgenId}:`, e?.name, e?.message)
    }
  }
}
