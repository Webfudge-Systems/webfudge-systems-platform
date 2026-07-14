export type Timeline = 'immediate' | 'three_to_six_months' | 'browsing'
export type Purpose = 'own_use' | 'investment'
export type Tier = 'hot' | 'warm' | 'cold'

export interface ScoringInput {
  // from the Meta lead form (may be partially missing):
  budgetRange?: string
  /** Parsed lower bound of their budget range. */
  budgetMinValue?: number
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
  /** Clamped 0-100. */
  score: number
  tier: Tier
  breakdown: ScoreFactor[]
}

/** A page-time bucket: awarded when pageTimeSeconds >= minSeconds (first match wins, so order high-to-low). */
export interface PageTimeBucket {
  minSeconds: number
  points: number
}

/**
 * Every weight and threshold is overridable so scoring can be tuned per
 * project without a code change. Pass a deep-partial override to scoreLead.
 */
export interface ScoringConfig {
  base: {
    timeline: {
      immediate: number
      three_to_six_months: number
      browsing: number
      missing: number
    }
    budget: {
      meetsProjectMin: number
      belowProjectMin: number
      notDisclosed: number
    }
    purpose: {
      own_use: number
      investment: number
      missing: number
    }
    configInterest: {
      specified: number
      missing: number
    }
  }
  enrichment: {
    /** Ordered high-to-low; first bucket whose minSeconds <= pageTimeSeconds wins. */
    pageTimeBuckets: PageTimeBucket[]
    pointsPerOptionalAnswer: number
    optionalAnswersCap: number
    /** Brochure download OR floor plan view — awarded once, not stacked. */
    assetEngagement: number
  }
  tiers: {
    /** score >= hot -> 'hot' */
    hot: number
    /** score >= warm (and < hot) -> 'warm', else 'cold' */
    warm: number
  }
  minScore: number
  maxScore: number
}

type DeepPartialObject<T> = {
  [K in keyof T]?: T[K] extends readonly unknown[]
    ? T[K]
    : T[K] extends object
      ? DeepPartialObject<T[K]>
      : T[K]
}

export type PartialScoringConfig = DeepPartialObject<ScoringConfig>
