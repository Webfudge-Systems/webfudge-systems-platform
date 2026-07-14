# Meta Ads Integration (Fudge Estate Stage 4)

## Summary

Stage 4 closes the lead-acquisition loop: Meta lead-ad webhooks flow into the CRM, get scored by `@webfudge/lead-scoring`, and the scored result is sent back to Meta via the Conversions API (CAPI) so ad delivery optimises toward qualified buyers instead of cheap form fills. Landing-page engagement posts back to a public enrichment endpoint that can only ever raise a lead's score.

## Scope

- `packages/meta-ads/` — new framework-agnostic Graph API client (v25.0 default)
- `apps/real-estate-crm/app/api/webhooks/meta/route.ts` — Meta webhook receiver
- `apps/real-estate-crm/app/api/webhooks/landing/route.ts` — landing-page enrichment
- `apps/real-estate-crm/lib/server/` — backend webhook client + in-memory rate limiter
- `apps/backend/src/api/real-estate-webhook/` — internal Strapi API for server-to-server ingestion
- `apps/backend/src/middlewares/api-cache.js` — `/api/re-webhooks` added to cache skip list
- `.env.example` updates in both apps

## Architecture: why an internal backend API

This repo has no machine-to-machine auth: the Strapi content API requires a user JWT + `X-Organization-Id`, but webhooks arrive with neither. Rather than weaken the content API, Stage 4 adds a dedicated internal API (`/api/re-webhooks/*`) guarded by a shared secret header (`X-Webhook-Secret` vs `RE_WEBHOOK_SECRET`, compared in constant time). Tenancy is derived server-side from the project row's organization — the caller can never choose the org. Field whitelists prevent a webhook from setting anything outside lead/enrichment fields.

Internal endpoints (all secret-gated):

| Endpoint | Purpose |
| --- | --- |
| `GET /api/re-webhooks/project-by-campaign/:campaignId` | Resolve project + org + `metaFormFieldMapping` + `minPrice` |
| `GET /api/re-webhooks/leads/:id` | Lead + project context for re-scoring |
| `POST /api/re-webhooks/leads` | Idempotent ingestion (dedupe on `metaLeadId`); logs `created` activity; hot leads log a `hot_lead_notification` activity (WhatsApp/SMS TODO) |
| `PUT /api/re-webhooks/leads/:id/enrich` | Store enrichment + re-score; refuses to lower a stored score; logs tier upgrades and fires the hot-notification stub on upgrade |

## Meta webhook (`POST /api/webhooks/meta` on the Next app)

1. `GET` echoes `hub.challenge` when `hub.verify_token` matches `META_VERIFY_TOKEN`.
2. `POST` verifies `X-Hub-Signature-256` (HMAC SHA-256 with `META_APP_SECRET`, constant-time) against the raw body — invalid signatures get 401, always.
3. Returns 200 immediately; processing continues async (Meta retries on timeout, and dedupe on `metaLeadId` makes retries safe).
4. Pipeline per leadgen event: fetch full lead from Graph API → resolve project via `meta_campaign_id` → map `field_data` through the project's configurable `metaFormFieldMapping` (unmapped answers are preserved, enum synonyms coerced) → parse budget lower bound (Indian notation: `80L-1Cr` → 8,000,000) → score with `pageVisited: false` → idempotent insert → CAPI `QualifiedLead` event with hashed email/phone plus score/tier.

## Landing enrichment (`POST /api/webhooks/landing`)

Public-facing, so: rate-limited per IP (30 req/min, in-memory — swap for Redis when multi-instance), numeric-id validation, and existence + org-attachment checks before any write. Merges engagement signals (page time never decreases, optional answers accumulate), re-scores with `pageVisited: true`, and the backend refuses score downgrades — enrichment is additive-only end to end.

## `packages/meta-ads` API

`createMetaClient(accessToken)` → `fetchLeadById`, `listCampaigns`, `fetchCampaignInsights` (computes cost-per-lead), `sendConversionEvent` (SHA-256 hashes PII). Plus `getOAuthUrl` / `exchangeCodeForToken` (long-lived token exchange) for the Stage 5 settings UI, webhook helpers (`verifyWebhookChallenge`, `verifyWebhookSignature`, `extractLeadgenEvents`), and field mapping utilities (`mapFieldData`, `parseBudgetMinValue`).

25 unit tests cover signature validation (valid/tampered/wrong-secret/missing), challenge verification, leadgen extraction, field mapping with custom per-project mappings, budget parsing, insights math, and that CAPI payloads contain hashed — never raw — PII.

## Configuration

| Var | Where | Purpose |
| --- | --- | --- |
| `RE_WEBHOOK_SECRET` | both apps | Shared secret for the internal ingestion API (generate: `openssl rand -hex 32`) |
| `META_APP_ID` / `META_APP_SECRET` | real-estate-crm | Meta app credentials; secret also signs webhooks |
| `META_VERIFY_TOKEN` | real-estate-crm | Webhook subscription verify token |
| `META_ACCESS_TOKEN` | real-estate-crm | Long-lived token with `leads_retrieval` (until per-org OAuth storage lands with the Stage 5 integrations UI) |
| `META_PIXEL_ID` | real-estate-crm | CAPI destination (strongly recommended) |
| `META_CAPI_TEST_EVENT_CODE` | real-estate-crm | Optional Events Manager test code |

Webhook URL to paste into the Meta App config: `https://<app-host>/api/webhooks/meta`.

## Verification performed

- 25/25 vitest tests passing; `tsc --noEmit` clean; `next build` succeeds with both routes registered.
- Live Strapi smoke test: `/api/re-webhooks/*` returns 401 without/with wrong secret, 404 for unmapped campaigns and unknown leads, 400 for ingestion without `projectId`.

## Known limitations / next steps

- Per-org encrypted token storage (and the OAuth connect flow UI) belongs to Stage 5's `/settings/integrations`; until then `META_ACCESS_TOKEN` is a single env var.
- Hot-lead notification is an activity-log stub (`hot_lead_notification`) — WhatsApp/SMS channel TODO.
- The rate limiter is per-process; use Redis when deploying serverless/multi-instance.
- Fire-and-forget async processing assumes a Node server runtime; on serverless, move processing to a queue.
