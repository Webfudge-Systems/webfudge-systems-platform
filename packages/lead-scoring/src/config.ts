import type { PartialScoringConfig, ScoringConfig } from './types'

/**
 * Default weights.
 *
 * Base score from Meta form answers maxes at 75:
 *   timeline 30 + budget 25 + purpose 12 + configInterest 8 = 75
 * Enrichment boost from the landing page maxes at +25:
 *   pageTime 12 + optionalAnswers 12 + assetEngagement 5 = 29, but the
 *   final score is clamped to 100 so the effective ceiling stays 100.
 */
export const DEFAULT_CONFIG: ScoringConfig = {
  base: {
    timeline: {
      immediate: 30,
      three_to_six_months: 18,
      browsing: 5,
      missing: 8,
    },
    budget: {
      meetsProjectMin: 25,
      belowProjectMin: 5,
      notDisclosed: 8,
    },
    // Both are valid buyers — neither is penalised; investors are a real segment.
    purpose: {
      own_use: 12,
      investment: 10,
      missing: 0,
    },
    configInterest: {
      specified: 8,
      missing: 0,
    },
  },
  enrichment: {
    pageTimeBuckets: [
      { minSeconds: 121, points: 12 },
      { minSeconds: 60, points: 8 },
      { minSeconds: 20, points: 4 },
      { minSeconds: 0, points: 1 },
    ],
    pointsPerOptionalAnswer: 4,
    optionalAnswersCap: 12,
    assetEngagement: 5,
  },
  tiers: {
    hot: 70,
    warm: 45,
  },
  minScore: 0,
  maxScore: 100,
}

/** Deep-merge a partial override onto the defaults. Arrays are replaced, not merged. */
export function resolveConfig(override?: PartialScoringConfig): ScoringConfig {
  if (!override) return DEFAULT_CONFIG
  return {
    base: {
      timeline: { ...DEFAULT_CONFIG.base.timeline, ...override.base?.timeline },
      budget: { ...DEFAULT_CONFIG.base.budget, ...override.base?.budget },
      purpose: { ...DEFAULT_CONFIG.base.purpose, ...override.base?.purpose },
      configInterest: { ...DEFAULT_CONFIG.base.configInterest, ...override.base?.configInterest },
    },
    enrichment: {
      ...DEFAULT_CONFIG.enrichment,
      ...override.enrichment,
      pageTimeBuckets:
        override.enrichment?.pageTimeBuckets ?? DEFAULT_CONFIG.enrichment.pageTimeBuckets,
    },
    tiers: { ...DEFAULT_CONFIG.tiers, ...override.tiers },
    minScore: override.minScore ?? DEFAULT_CONFIG.minScore,
    maxScore: override.maxScore ?? DEFAULT_CONFIG.maxScore,
  }
}
