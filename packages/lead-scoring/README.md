# @webfudge/lead-scoring

Pure, framework-agnostic lead qualification scoring for FudgeOS apps. No Next.js, no database, no side effects — just input in, `{ score, tier, breakdown }` out.

## Usage

```ts
import { scoreLead, DEFAULT_CONFIG } from '@webfudge/lead-scoring'

const result = scoreLead({
  timeline: 'immediate',
  budgetMinValue: 9_000_000,
  purpose: 'own_use',
  configInterest: '3BHK',
  pageVisited: true,
  pageTimeSeconds: 140,
  optionalAnswersCount: 2,
  brochureDownloaded: true,
  projectMinPrice: 8_000_000,
})
// result.score      -> 0-100
// result.tier       -> 'hot' | 'warm' | 'cold'
// result.breakdown  -> every factor + points + human-readable reason
```

Weights and thresholds are tunable per project via a deep-partial config override:

```ts
scoreLead(input, { base: { timeline: { immediate: 35 } }, tiers: { hot: 75 } })
```

## The no-penalty rule (do not break this)

Landing-page engagement is **additive only**. `pageVisited: false` produces zero enrichment factors — never a deduction. A lead who skips the landing page is scored fully on their Meta form answers. Genuine buyers often skip the page (mobile, mid-commute, older buyers); treating a no-show as a negative signal kills good leads. `test/scoreLead.test.ts` asserts this explicitly.

## Scoring model (defaults)

Base — Meta form answers (max 75):

| Factor | Points |
| --- | --- |
| Timeline: immediate / 3-6 months / browsing / missing | 30 / 18 / 5 / 8 |
| Budget: ≥ project min / below / not disclosed | 25 / 5 / 8 |
| Purpose: own use / investment / missing | 12 / 10 / 0 |
| Config interest specified | 8 |

Enrichment — landing page, only when `pageVisited === true` (max +25 effective):

| Signal | Points |
| --- | --- |
| Page time > 120s / 60–120s / 20–59s / < 20s | 12 / 8 / 4 / 1 |
| Optional answers | +4 each, capped at +12 |
| Brochure download or floor plan view | +5 once (not stacked) |

Score is clamped 0–100. Tiers: ≥ 70 hot, 45–69 warm, < 45 cold.

## Scripts

- `npm run test --workspace=@webfudge/lead-scoring`
- `npm run type-check --workspace=@webfudge/lead-scoring`
