import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, scoreLead } from '../src'
import type { ScoringInput } from '../src'

const PROJECT_MIN = 8_000_000

/** Strong Meta form answers: immediate, budget fits, own use, specific config. */
const strongForm: Omit<ScoringInput, 'pageVisited'> = {
  timeline: 'immediate',
  budgetMinValue: 9_000_000,
  purpose: 'own_use',
  configInterest: '3BHK',
  projectMinPrice: PROJECT_MIN,
}

/** Weak Meta form answers: browsing, budget below project minimum, no config interest. */
const weakForm: Omit<ScoringInput, 'pageVisited'> = {
  timeline: 'browsing',
  budgetMinValue: 2_000_000,
  purpose: 'investment',
  projectMinPrice: PROJECT_MIN,
}

const highEngagement = {
  pageTimeSeconds: 300,
  optionalAnswersCount: 4,
  brochureDownloaded: true,
  floorPlanViewed: true,
}

describe('scoreLead — THE NO-PENALTY RULE', () => {
  it('scores a strong lead who never visited the landing page fully on form answers (hot)', () => {
    const result = scoreLead({ ...strongForm, pageVisited: false })
    // 30 (immediate) + 25 (budget) + 12 (own use) + 8 (config) = 75
    expect(result.score).toBe(75)
    expect(result.tier).toBe('hot')
  })

  it('never awards negative points for any factor', () => {
    const inputs: ScoringInput[] = [
      { ...strongForm, pageVisited: false },
      { ...weakForm, pageVisited: false },
      { ...strongForm, pageVisited: true, pageTimeSeconds: 0 },
      { pageVisited: false, projectMinPrice: PROJECT_MIN },
    ]
    for (const input of inputs) {
      for (const factor of scoreLead(input).breakdown) {
        expect(factor.points).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('pageVisited=false never scores lower than the identical lead pre-enrichment', () => {
    const noVisit = scoreLead({ ...strongForm, pageVisited: false })
    const visitNoEngagement = scoreLead({ ...strongForm, pageVisited: true })
    // Skipping the page must not subtract anything relative to visiting with zero engagement.
    expect(noVisit.score).toBe(visitNoEngagement.score)
  })

  it('produces no enrichment factors at all when the page was not visited', () => {
    const result = scoreLead({ ...strongForm, ...highEngagement, pageVisited: false })
    const enrichmentFactors = result.breakdown.filter((f) =>
      ['page_time', 'optional_answers', 'asset_engagement'].includes(f.factor)
    )
    expect(enrichmentFactors).toHaveLength(0)
    expect(result.score).toBe(75) // base score only, engagement fields ignored
  })
})

describe('scoreLead — enrichment boost', () => {
  it('scores a strong lead with high page engagement hot (clamped at 100)', () => {
    const result = scoreLead({ ...strongForm, ...highEngagement, pageVisited: true })
    // 75 base + 12 page time + 12 answers (capped) + 5 asset = 104 -> clamped 100
    expect(result.score).toBe(100)
    expect(result.tier).toBe('hot')
  })

  it('does NOT let high page engagement rescue a weak lead into hot', () => {
    const result = scoreLead({ ...weakForm, ...highEngagement, pageVisited: true })
    // 5 + 5 + 10 + 0 = 20 base, +29 max enrichment = 49 -> warm at best
    expect(result.score).toBeLessThan(DEFAULT_CONFIG.tiers.hot)
    expect(result.tier).not.toBe('hot')
  })

  it('applies page-time buckets correctly', () => {
    const base = { ...strongForm, pageVisited: true }
    const points = (seconds: number) =>
      scoreLead({ ...base, pageTimeSeconds: seconds }).breakdown.find(
        (f) => f.factor === 'page_time'
      )?.points
    expect(points(300)).toBe(12) // > 120
    expect(points(90)).toBe(8) // 60-120
    expect(points(30)).toBe(4) // 20-59
    expect(points(10)).toBe(1) // < 20
  })

  it('caps optional answer points and awards asset engagement once, not stacked', () => {
    const result = scoreLead({
      ...weakForm,
      pageVisited: true,
      optionalAnswersCount: 10, // 10 * 4 = 40 -> capped at 12
      brochureDownloaded: true,
      floorPlanViewed: true, // both true -> still one +5
    })
    const answers = result.breakdown.find((f) => f.factor === 'optional_answers')
    const asset = result.breakdown.filter((f) => f.factor === 'asset_engagement')
    expect(answers?.points).toBe(12)
    expect(asset).toHaveLength(1)
    expect(asset[0]!.points).toBe(5)
  })
})

describe('scoreLead — robustness', () => {
  it('never throws on missing fields', () => {
    expect(() => scoreLead({ pageVisited: false, projectMinPrice: 0 })).not.toThrow()
    expect(() =>
      scoreLead({ pageVisited: true, projectMinPrice: PROJECT_MIN })
    ).not.toThrow()
    expect(() =>
      scoreLead({
        pageVisited: true,
        projectMinPrice: PROJECT_MIN,
        pageTimeSeconds: undefined,
        optionalAnswersCount: undefined,
        budgetMinValue: undefined,
        timeline: undefined,
        purpose: undefined,
      })
    ).not.toThrow()
    // Defensive: even a null input must not throw.
    expect(() => scoreLead(null as unknown as ScoringInput)).not.toThrow()
  })

  it('always clamps the score to 0-100', () => {
    const maxed = scoreLead(
      { ...strongForm, ...highEngagement, pageVisited: true },
      { base: { timeline: { immediate: 500 } } }
    )
    expect(maxed.score).toBe(100)

    const floor = scoreLead({ pageVisited: false, projectMinPrice: 0 })
    expect(floor.score).toBeGreaterThanOrEqual(0)
    expect(floor.score).toBeLessThanOrEqual(100)
  })

  it('applies tier thresholds at exact boundaries', () => {
    // immediate 30 + meets budget 25 + investment 10 + config 8 = 73 -> hot
    const hot = scoreLead({ ...strongForm, purpose: 'investment', pageVisited: false })
    expect(hot.score).toBe(73)
    expect(hot.tier).toBe('hot')

    // three_to_six 18 + meets budget 25 + missing purpose 0 + config 8 = 51 -> warm
    const warm = scoreLead({
      timeline: 'three_to_six_months',
      budgetMinValue: 9_000_000,
      configInterest: '2BHK',
      pageVisited: false,
      projectMinPrice: PROJECT_MIN,
    })
    expect(warm.score).toBe(51)
    expect(warm.tier).toBe('warm')

    // browsing 5 + below budget 5 + missing purpose 0 = 10 -> cold
    const cold = scoreLead({ ...weakForm, purpose: undefined, pageVisited: false })
    expect(cold.tier).toBe('cold')
  })
})

describe('scoreLead — configurability', () => {
  it('custom config overrides default weights (deep-partial merge)', () => {
    const result = scoreLead(
      { ...strongForm, pageVisited: false },
      { base: { timeline: { immediate: 10 } }, tiers: { hot: 90 } }
    )
    // 10 (overridden) + 25 + 12 + 8 = 55; hot threshold raised to 90 -> warm
    expect(result.score).toBe(55)
    expect(result.tier).toBe('warm')
    // Non-overridden weights stay at defaults
    expect(result.breakdown.find((f) => f.factor === 'budget')?.points).toBe(
      DEFAULT_CONFIG.base.budget.meetsProjectMin
    )
  })

  it('supports custom page-time buckets', () => {
    const result = scoreLead(
      { ...strongForm, pageVisited: true, pageTimeSeconds: 45 },
      { enrichment: { pageTimeBuckets: [{ minSeconds: 30, points: 20 }] } }
    )
    expect(result.breakdown.find((f) => f.factor === 'page_time')?.points).toBe(20)
  })
})

describe('scoreLead — transparent breakdown', () => {
  it('breakdown explains every point awarded and sums to the (unclamped) score', () => {
    const result = scoreLead({ ...strongForm, pageVisited: true, pageTimeSeconds: 90 })
    for (const factor of result.breakdown) {
      expect(factor.factor).toBeTruthy()
      expect(typeof factor.points).toBe('number')
      expect(factor.reason).toBeTruthy()
    }
    const sum = result.breakdown.reduce((acc, f) => acc + f.points, 0)
    expect(result.score).toBe(Math.min(100, Math.max(0, Math.round(sum))))
  })

  it('always includes the four base factors, even when inputs are missing', () => {
    const result = scoreLead({ pageVisited: false, projectMinPrice: 0 })
    const factors = result.breakdown.map((f) => f.factor)
    expect(factors).toEqual(
      expect.arrayContaining(['timeline', 'budget', 'purpose', 'config_interest'])
    )
  })
})
