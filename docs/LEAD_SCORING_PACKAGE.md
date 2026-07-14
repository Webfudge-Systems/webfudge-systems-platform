# Lead Scoring Package (Fudge Estate Stage 3)

## Summary

Stage 3 of the Fudge Estate build adds `packages/lead-scoring` (`@webfudge/lead-scoring`) — the core IP of the real-estate CRM. It converts Meta lead-form answers plus optional landing-page engagement into a 0–100 qualification score, a hot/warm/cold tier, and a transparent per-factor breakdown the sales team can read on the lead detail page.

It is a pure, framework-agnostic TypeScript package: no Next.js, no Strapi, no database imports, no side effects. Any FudgeOS app can reuse it.

## Scope

- `packages/lead-scoring/src/types.ts` — `ScoringInput`, `ScoringResult`, `ScoreFactor`, `ScoringConfig` (every weight/threshold overridable), `PartialScoringConfig`
- `packages/lead-scoring/src/config.ts` — `DEFAULT_CONFIG` + `resolveConfig` deep-partial merge
- `packages/lead-scoring/src/scoreLead.ts` — the engine
- `packages/lead-scoring/test/scoreLead.test.ts` — 15 vitest unit tests
- `packages/lead-scoring/README.md` — usage + scoring model

## The critical rule: no penalty for skipping the landing page

Landing-page engagement is **additive only**. When `pageVisited === false`, the engine produces zero enrichment factors — engagement fields are ignored entirely, never deducted. A lead who never opened the page is scored fully on their Meta form answers alone (a strong form-only lead still reaches 75 → hot). The implementation also filters out any non-positive enrichment factor so a bad config override can never subtract points.

Four tests assert this rule directly: form-only lead scores hot, no factor is ever negative, `pageVisited: false` equals `pageVisited: true` with zero engagement, and no enrichment factors appear when the page was skipped.

## Scoring model (defaults)

- **Base (max 75)**: timeline immediate 30 / 3–6 months 18 / browsing 5 / missing 8; budget ≥ project min 25 / below 5 / undisclosed 8; purpose own-use 12 / investment 10 (neither penalised); config interest specified 8.
- **Enrichment (only if `pageVisited`, effective max +25)**: page time >120s 12 / 60–120s 8 / 20–59s 4 / <20s 1; optional answers +4 each capped at +12; brochure OR floor plan +5 once.
- Clamped 0–100. Tiers: ≥70 hot, 45–69 warm, <45 cold.
- `scoreLead(input, override?)` accepts a deep-partial `ScoringConfig`, so weights, page-time buckets, and tier thresholds are tunable per project without code changes.

## Verification

- `npm run test --workspace=@webfudge/lead-scoring` — 15/15 passing (vitest 1.6)
- `npm run type-check --workspace=@webfudge/lead-scoring` — clean under `strict` + `noUncheckedIndexedAccess`

## Usage

```ts
import { scoreLead } from '@webfudge/lead-scoring'

const { score, tier, breakdown } = scoreLead({
  timeline: 'immediate',
  budgetMinValue: 9_000_000,
  purpose: 'own_use',
  pageVisited: false,
  projectMinPrice: 8_000_000,
})
```

Stage 4 (Meta webhook ingestion) and the landing-page enrichment endpoint will call this on lead creation and re-score on enrichment (re-scoring can only raise the score).
