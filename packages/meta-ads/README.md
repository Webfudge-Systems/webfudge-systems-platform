# @webfudge/meta-ads

Framework-agnostic Meta (Facebook) Graph API client for FudgeOS apps: lead ads retrieval, campaign insights, OAuth connection flow, webhook verification, and the Conversions API (CAPI). Pure fetch + Web Crypto — no Node-only or framework dependencies. Defaults to Graph API v25.0 (overridable).

Security invariants: access tokens and lead PII are never logged; CAPI email/phone are SHA-256 hashed before leaving the process; webhook signatures are compared in constant time.

## Client

```ts
import { createMetaClient } from '@webfudge/meta-ads'

const meta = createMetaClient(accessToken)
const lead = await meta.fetchLeadById('1234567890')          // incl. field_data
const campaigns = await meta.listCampaigns('act_987654321')
const insights = await meta.fetchCampaignInsights('c1', { since: '2026-06-01', until: '2026-06-30' })
// insights.costPerLead — spend / lead actions (null when no leads)

// CAPI: send the SCORED lead back so Meta optimises for qualified buyers,
// not form-openers. Email/phone are hashed automatically.
await meta.sendConversionEvent({ pixelId, leadgenId: lead.id, email, phone, score: 82, tier: 'hot' })
```

## OAuth (connect a client's ad account)

```ts
import { getOAuthUrl, exchangeCodeForToken } from '@webfudge/meta-ads'

const url = getOAuthUrl(orgId, redirectUri, { appId })
// after redirect back:
const { accessToken, expiresIn } = await exchangeCodeForToken(code, { appId, appSecret, redirectUri })
// ^ long-lived (~60 day) token — store encrypted, never log it
```

## Webhooks

```ts
import { verifyWebhookChallenge, verifyWebhookSignature, extractLeadgenEvents } from '@webfudge/meta-ads'

// GET: echo hub.challenge when hub.verify_token matches
// POST: ALWAYS verify X-Hub-Signature-256 against the RAW body first
const ok = await verifyWebhookSignature(rawBody, signatureHeader, appSecret)
const events = extractLeadgenEvents(JSON.parse(rawBody)) // [{ leadgenId, formId, ... }]
```

## Field mapping

Meta form field names differ per form, so mapping to our qualifying fields is configurable per project (stored in the project's `metaFormFieldMapping`) and merged over sensible defaults:

```ts
import { mapFieldData, parseBudgetMinValue } from '@webfudge/meta-ads'

const fields = mapFieldData(lead.field_data, project.metaFormFieldMapping)
// fields.timeline -> 'immediate' | 'three_to_six_months' | 'browsing' (synonym-coerced)
// fields.unmappedAnswers -> everything else, preserved
const budgetMin = parseBudgetMinValue(fields.budgetRange) // "80L-1Cr" -> 8_000_000
```

## Scripts

- `npm run test --workspace=@webfudge/meta-ads`
- `npm run type-check --workspace=@webfudge/meta-ads`
