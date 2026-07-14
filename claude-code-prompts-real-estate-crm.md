# Claude Code Prompts — Webfudge Real Estate CRM

**Run these ONE AT A TIME. Verify + commit between each stage.**
Do not paste all six at once — Claude Code will lose the thread.

Repo: `D:\Work\Webfudge Systems\webfudge-platform`

---

## STAGE 0 — Recon (run this first, no code)

```
Before writing any code, explore this repo and report back:

1. Root: package.json, turbo.json, pnpm-workspace.yaml (or equivalent)
2. The full list of apps/* and packages/*
3. The existing CRM app (Fudge Grow) — its folder structure, route groups,
   and which shared packages it imports
4. The database layer: which ORM/client (Supabase client? Prisma? Drizzle?),
   where schemas live, how migrations are run
5. The auth/RBAC pattern — how org_id / multi-tenancy is enforced on queries
6. The shared UI package — component library, styling conventions, design tokens
7. How secrets/env vars are handled

Output a summary of the above. DO NOT write or modify any files yet.
I will confirm before you scaffold.
```

**→ Wait for output. Confirm the stack before continuing.**

---

## STAGE 1 — Scaffold the new app

```
Scaffold a new app at `apps/real-estate-crm`.

ARCHITECTURE RULE — read carefully:
Do NOT duplicate the existing CRM. Do NOT copy packages/ui, packages/db,
packages/auth, or any shared package. This new app CONSUMES the existing
shared packages. Only real-estate-specific code is new.

Requirements:
- Next.js 15 App Router, TypeScript, TailwindCSS
- Match the EXACT config of the existing CRM app: tsconfig, eslint,
  tailwind preset, next.config
- Import and reuse the existing shared packages (ui, db, auth) — same
  import aliases the existing CRM uses
- Register the app in turbo.json and the workspace config
- Same multi-tenant / RBAC pattern as the existing CRM

Port ONLY these modules from the existing CRM, simplified for real estate:
  - Leads
  - Contacts
  - Pipeline / stages
  - Settings
  - Auth + RBAC wiring

Do NOT port anything unrelated to real estate lead management.

Create these NEW empty route groups (stub pages for now):
  - /projects
  - /site-visits
  - /settings/integrations

BEFORE creating any file, print the complete file tree you intend to create
and wait for my confirmation.
```

---

## STAGE 2 — Database schema

```
Add the real-estate schema to the existing db package.

Follow the EXISTING schema conventions in this repo exactly — same ORM,
same file layout, same migration pattern, same multi-tenancy approach.
Do not introduce a new ORM or a new migration tool.

Tables:

projects
  id, org_id, name, developer_name, location,
  min_price (bigint), max_price (bigint),
  configurations (jsonb, e.g. ["2BHK","3BHK"]),
  possession_date, status,
  landing_page_url, meta_campaign_id,
  created_at, updated_at

leads
  id, org_id, project_id (fk),
  name, phone, email,
  source (enum: meta_instant_form | meta_whatsapp | landing_page | manual),
  meta_lead_id (unique, nullable), meta_campaign_id, meta_adset_id, meta_ad_id,

  -- qualifying answers captured in the Meta lead form:
  budget_range (text), timeline (enum: immediate | three_to_six_months | browsing),
  purpose (enum: own_use | investment), config_interest (text),

  -- enrichment captured on the landing page (all nullable):
  page_visited (boolean, default false),
  page_time_seconds (int, nullable),
  optional_answers (jsonb, nullable),

  -- scoring:
  score (int, 0-100), tier (enum: hot | warm | cold),
  score_breakdown (jsonb), scored_at,

  -- sales pipeline:
  status (enum: new | contacted | site_visit_scheduled | site_visit_done |
          negotiating | booked | lost),
  assigned_to (fk user), last_contacted_at,

  created_at, updated_at

site_visits
  id, org_id, lead_id (fk), project_id (fk),
  scheduled_at, completed_at, outcome, notes, created_at

lead_activities
  id, org_id, lead_id (fk), type, payload (jsonb), created_at

Indexes: (org_id, tier), (org_id, status), (project_id),
unique on meta_lead_id, index on (org_id, created_at desc)

Multi-tenancy: EVERY query must be scoped by org_id following the existing
RBAC pattern. If the repo uses RLS policies, add them.

Generate the migration file. Show me the schema diff before applying.
```

---

## STAGE 3 — Lead scoring engine (the core IP — get this right)

```
Create a new shared package: `packages/lead-scoring`.

It must be a PURE, framework-agnostic TypeScript package — no Next.js,
no DB imports, no side effects. Just input -> output. So it can be reused
by other FudgeOS apps later.

Public API:

export type Timeline = 'immediate' | 'three_to_six_months' | 'browsing'
export type Purpose  = 'own_use' | 'investment'
export type Tier     = 'hot' | 'warm' | 'cold'

export interface ScoringInput {
  // from the Meta lead form (may be partially missing):
  budgetRange?: string
  budgetMinValue?: number          // parsed lower bound of their budget range
  timeline?: Timeline
  purpose?: Purpose
  configInterest?: string

  // from landing page enrichment (may be entirely absent):
  pageVisited: boolean
  pageTimeSeconds?: number
  optionalAnswersCount?: number
  brochureDownloaded?: boolean
  floorPlanViewed?: boolean

  // project context:
  projectMinPrice: number
}

export interface ScoreFactor {
  factor: string
  points: number
  reason: string
}

export interface ScoringResult {
  score: number        // clamped 0-100
  tier: Tier
  breakdown: ScoreFactor[]
}

export function scoreLead(input: ScoringInput, config?: ScoringConfig): ScoringResult
export const DEFAULT_CONFIG: ScoringConfig

=== THE CRITICAL RULE ===
Landing-page engagement is ADDITIVE ONLY. It can NEVER reduce a score.
A lead who never opened the landing page must still be scored fully on
their Meta form answers alone. NEVER deduct points for pageVisited === false.
Genuine buyers often skip the page (mobile, mid-commute, older buyers).
Treating a no-show as a negative signal would kill good leads.
Write an explicit unit test asserting this.

Base score — from Meta form answers (max 75):
  timeline: immediate +30 | three_to_six_months +18 | browsing +5 | missing +8
  budget: budgetMinValue >= projectMinPrice +25
        | budgetMinValue < projectMinPrice +5
        | not disclosed +8
  purpose: own_use +12 | investment +10   (both are valid buyers — neither
           is penalised; investors are a real segment)
  configInterest specified: +8 | missing 0

Enrichment boost — landing page (max +25, applied ONLY if pageVisited === true):
  pageTimeSeconds > 120: +12
  60-120: +8
  20-59: +4
  < 20: +1
  optionalAnswersCount: +4 each, capped at +12
  brochureDownloaded OR floorPlanViewed: +5 (once, not stacked)

Clamp final score to 0-100.
Tiers: score >= 70 -> hot | 45-69 -> warm | < 45 -> cold

ScoringConfig must make every weight and threshold overridable, so weights
can be tuned per project without a code change.

Unit tests (vitest or whatever the repo already uses) — cover at minimum:
  1. Lead with strong form answers + pageVisited=false still scores warm/hot
     (THE NO-PENALTY RULE)
  2. Lead with strong form answers + high page engagement scores hot
  3. Lead with weak form answers + high page engagement does NOT score hot
     (the page cannot rescue a bad lead)
  4. Missing fields never throw
  5. Score is always clamped 0-100
  6. Custom config overrides default weights
  7. breakdown[] always explains every point awarded
```

---

## STAGE 4 — Meta Ads integration

```
Create `packages/meta-ads` plus the webhook routes in apps/real-estate-crm.

=== packages/meta-ads ===
Framework-agnostic Meta Graph API client (use the current stable API version).

Exports:
  - createMetaClient(accessToken)
  - getOAuthUrl(orgId, redirectUri) — for connecting a client's ad account
  - exchangeCodeForToken(code) — long-lived token exchange
  - fetchLeadById(leadgenId) — full lead incl. field_data array
  - fetchCampaignInsights(campaignId, dateRange) — spend, impressions,
    leads, CPL
  - listCampaigns(adAccountId)
  - sendConversionEvent(lead) — Conversions API (CAPI). Sends the SCORED
    lead back to Meta so the algorithm optimises toward real qualified
    buyers instead of form-openers. This is essential — without it Meta
    optimises for cheap form fills and lead quality collapses.

Token storage: encrypted, following the existing secrets pattern in this repo.
NEVER log tokens or PII.

=== apps/real-estate-crm/app/api/webhooks/meta/route.ts ===

GET  — Meta webhook verification: echo hub.challenge when hub.verify_token
       matches the env var.

POST — Lead ingestion:
  1. Verify X-Hub-Signature-256 (HMAC SHA256 with app secret). Reject 401
     if invalid. This is mandatory — never trust an unverified webhook.
  2. Return 200 immediately, process async (Meta retries on timeout).
  3. Extract leadgen_id + form_id + campaign/adset/ad ids.
  4. Fetch full lead via packages/meta-ads.
  5. Map Meta field_data to our qualifying fields (budget_range, timeline,
     purpose, config_interest). Field names come from the form config —
     make this mapping configurable per project, not hardcoded.
  6. Resolve project via meta_campaign_id -> projects table.
  7. Score via packages/lead-scoring.
  8. Insert into leads (IDEMPOTENT on meta_lead_id — Meta will resend).
  9. If tier === 'hot', trigger a hot-lead notification (stub the channel;
     just create a lead_activity record + a TODO for WhatsApp/SMS).
 10. Fire CAPI conversion event back to Meta with the score.

=== apps/real-estate-crm/app/api/webhooks/landing/route.ts ===

POST — Landing page enrichment:
  Body: { leadId, timeOnPage, optionalAnswers, brochureDownloaded,
          floorPlanViewed }
  1. Validate leadId exists and belongs to a real org (no cross-tenant writes).
  2. Update the lead's enrichment fields.
  3. RE-SCORE via packages/lead-scoring (this only ever raises the score).
  4. If tier upgraded to hot, fire the hot-lead notification.
  5. Rate limit this endpoint — it's public-facing.

Security: verify signatures, rate limit, never log tokens/PII, scope every
write by org_id.
```

---

## STAGE 5 — UI

```
Build the UI in apps/real-estate-crm using ONLY components from the shared
@repo/ui package. Match the existing CRM's design language exactly — same
tokens, same spacing, same component patterns. Do not introduce a new
component library or new design tokens.

This is a SALES TEAM tool: dense, scannable, fast. Not a marketing dashboard.

=== /leads (the core screen) ===
Table columns: Lead | Project | Budget | Timeline | Purpose | Page Time |
               Score | Tier | Status | Assigned
- Tier pills: HOT (red/pink), WARM (amber), COLD (grey)
- Default sort: score DESC — hot leads at the top, always
- Show "did not visit" (muted) for page time when pageVisited is false —
  do NOT show it as a negative or a warning; it's neutral
- Filters: tier, project, status, source, date range, assigned_to
- Bulk actions: assign, change status
- Row click -> lead detail

=== /leads/[id] ===
- Score breakdown panel: render score_breakdown[] as a list of factors and
  the points each contributed. Transparency is the product — the sales team
  must see WHY a lead is hot.
- Meta form answers section
- Landing page enrichment section (or "did not visit the project page" —
  stated neutrally)
- Activity timeline
- Actions: log call, schedule site visit, change status, reassign, add note

=== /projects ===
- Project list + create/edit
- Project detail: lead funnel for that project (total / hot / warm / cold),
  cost per qualified lead, site visits booked, conversion rates by tier

=== /site-visits ===
- Calendar/list of scheduled and completed visits, outcome logging

=== /settings/integrations ===
- "Connect Meta Ads Account" -> OAuth flow
- Show connection status + connected ad account
- Map Meta campaigns -> projects (dropdown per campaign)
- Configure the Meta form field mapping per project
- Webhook URL display (for pasting into Meta App config)

=== Dashboard (/) ===
Cards: Total Leads | Hot Leads | Cost per Qualified Lead | Site Visits Booked
Chart: leads by tier over time
Recent hot leads list
```

---

## STAGE 6 — Landing page enrichment (the other half of the loop)

```
Create a landing page template that closes the enrichment loop.

Location: apps/real-estate-crm/app/(public)/p/[projectSlug]/page.tsx
(or a separate app if the repo pattern prefers that — follow existing
conventions)

FLOW CONTEXT — this is important:
The lead is ALREADY captured by the Meta Instant Form. Meta has already
charged us for that lead. This page runs AFTER capture, on the form's
thank-you-screen redirect. Its job is NOT to convert — it is to ENRICH
and give us quality signal. So it must never gate content behind a form.

URL: /p/[projectSlug]?lid=<leadId>
  - lid = the lead ID we pass through the Meta form's thank-you screen
    redirect. Carry it through so page engagement maps back to the right
    lead in the CRM.
  - If lid is absent, the page still works (organic visitor) — capture as
    a new lead with source=landing_page.

Sections:
  - Hero: project name, price, config, possession, hero image/video
  - Gallery / walkthrough video
  - Floor plans (track floorPlanViewed on interaction)
  - Amenities
  - Location advantages
  - Brochure download (track brochureDownloaded)
  - EMI calculator (interactive — engagement signal)
  - AT THE END: 3-4 genuinely OPTIONAL questions, framed as value to the
    buyer, not as a form. Examples:
      "Want a floor plan matched to your budget?" -> budget confirm
      "Planning a site visit soon?" -> timeline
      "Pre-approved for a home loan?" -> loan status
    Chips/toggles, NOT text inputs. No submit gate. Skipping is fine.

Tracking:
  - Time on page (visibility-aware — pause when tab is hidden)
  - Scroll depth
  - Section views, floor plan opens, brochure downloads, EMI calc usage
  - Optional questions answered
  - POST all of it to /api/webhooks/landing on unload (navigator.sendBeacon)
    AND on a debounced interval, so we don't lose data if they close the tab

Also fire the Meta pixel so page visitors become a retargeting audience.

Mobile-first — most traffic is mobile from Meta ads.
Make it a reusable template driven by the projects table, so a new project
page is config, not code.
```

---

## Notes for each stage

- **Commit between stages.** If a stage goes sideways, you can reset.
- **Stage 3 is the moat.** The no-penalty rule is the thing most likely to be
  silently coded wrong. Read the tests it writes.
- **Stage 4 CAPI is not optional.** Without sending scored leads back to Meta,
  the algorithm optimises for form-openers and lead quality collapses — that's
  the exact failure this whole product exists to prevent.
- If Claude Code starts duplicating shared packages, stop it and re-state the
  architecture rule from Stage 1.
