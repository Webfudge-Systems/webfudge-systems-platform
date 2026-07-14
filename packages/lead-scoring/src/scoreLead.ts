import { resolveConfig } from './config'
import type {
  PartialScoringConfig,
  ScoreFactor,
  ScoringConfig,
  ScoringInput,
  ScoringResult,
  Tier,
} from './types'

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function tierFor(score: number, config: ScoringConfig): Tier {
  if (score >= config.tiers.hot) return 'hot'
  if (score >= config.tiers.warm) return 'warm'
  return 'cold'
}

function scoreTimeline(input: ScoringInput, config: ScoringConfig): ScoreFactor {
  const weights = config.base.timeline
  switch (input.timeline) {
    case 'immediate':
      return { factor: 'timeline', points: weights.immediate, reason: 'Buying immediately' }
    case 'three_to_six_months':
      return {
        factor: 'timeline',
        points: weights.three_to_six_months,
        reason: 'Buying in 3-6 months',
      }
    case 'browsing':
      return { factor: 'timeline', points: weights.browsing, reason: 'Just browsing' }
    default:
      return { factor: 'timeline', points: weights.missing, reason: 'Timeline not provided' }
  }
}

function scoreBudget(input: ScoringInput, config: ScoringConfig): ScoreFactor {
  const weights = config.base.budget
  const budgetMin = typeof input.budgetMinValue === 'number' ? input.budgetMinValue : undefined
  if (budgetMin === undefined) {
    return { factor: 'budget', points: weights.notDisclosed, reason: 'Budget not disclosed' }
  }
  const projectMin = typeof input.projectMinPrice === 'number' ? input.projectMinPrice : 0
  if (budgetMin >= projectMin) {
    return {
      factor: 'budget',
      points: weights.meetsProjectMin,
      reason: 'Budget meets the project minimum price',
    }
  }
  return {
    factor: 'budget',
    points: weights.belowProjectMin,
    reason: 'Budget is below the project minimum price',
  }
}

function scorePurpose(input: ScoringInput, config: ScoringConfig): ScoreFactor {
  const weights = config.base.purpose
  switch (input.purpose) {
    case 'own_use':
      return { factor: 'purpose', points: weights.own_use, reason: 'Buying for own use' }
    case 'investment':
      return { factor: 'purpose', points: weights.investment, reason: 'Buying as an investment' }
    default:
      return { factor: 'purpose', points: weights.missing, reason: 'Purpose not provided' }
  }
}

function scoreConfigInterest(input: ScoringInput, config: ScoringConfig): ScoreFactor {
  const weights = config.base.configInterest
  const specified = typeof input.configInterest === 'string' && input.configInterest.trim() !== ''
  if (specified) {
    return {
      factor: 'config_interest',
      points: weights.specified,
      reason: `Interested in a specific configuration (${input.configInterest!.trim()})`,
    }
  }
  return {
    factor: 'config_interest',
    points: weights.missing,
    reason: 'No specific configuration interest',
  }
}

/**
 * Landing-page enrichment. ADDITIVE ONLY — returns factors worth >= 0 points
 * and returns nothing at all when the page was not visited. A lead who never
 * opened the landing page is scored fully on their form answers alone;
 * pageVisited === false must NEVER deduct points (genuine buyers often skip
 * the page — mobile, mid-commute, older buyers).
 */
function scoreEnrichment(input: ScoringInput, config: ScoringConfig): ScoreFactor[] {
  if (input.pageVisited !== true) return []

  const factors: ScoreFactor[] = []
  const enrichment = config.enrichment

  if (typeof input.pageTimeSeconds === 'number' && input.pageTimeSeconds >= 0) {
    const bucket = enrichment.pageTimeBuckets.find((b) => input.pageTimeSeconds! >= b.minSeconds)
    if (bucket && bucket.points > 0) {
      factors.push({
        factor: 'page_time',
        points: bucket.points,
        reason: `Spent ${Math.round(input.pageTimeSeconds)}s on the project page`,
      })
    }
  }

  const answers =
    typeof input.optionalAnswersCount === 'number' && input.optionalAnswersCount > 0
      ? Math.floor(input.optionalAnswersCount)
      : 0
  if (answers > 0) {
    const points = Math.min(answers * enrichment.pointsPerOptionalAnswer, enrichment.optionalAnswersCap)
    factors.push({
      factor: 'optional_answers',
      points,
      reason: `Answered ${answers} optional question${answers === 1 ? '' : 's'} on the project page`,
    })
  }

  // Brochure OR floor plan — awarded once, not stacked.
  if (input.brochureDownloaded === true || input.floorPlanViewed === true) {
    const what =
      input.brochureDownloaded && input.floorPlanViewed
        ? 'Downloaded the brochure and viewed floor plans'
        : input.brochureDownloaded
          ? 'Downloaded the brochure'
          : 'Viewed floor plans'
    factors.push({ factor: 'asset_engagement', points: enrichment.assetEngagement, reason: what })
  }

  // Additive-only invariant: drop anything non-positive rather than let a
  // bad config override subtract from the base score.
  return factors.filter((f) => f.points > 0)
}

export function scoreLead(input: ScoringInput, config?: PartialScoringConfig): ScoringResult {
  const cfg = resolveConfig(config)
  const safeInput: ScoringInput = input ?? { pageVisited: false, projectMinPrice: 0 }

  const breakdown: ScoreFactor[] = [
    scoreTimeline(safeInput, cfg),
    scoreBudget(safeInput, cfg),
    scorePurpose(safeInput, cfg),
    scoreConfigInterest(safeInput, cfg),
    ...scoreEnrichment(safeInput, cfg),
  ]

  const raw = breakdown.reduce((sum, f) => sum + f.points, 0)
  const score = clamp(Math.round(raw), cfg.minScore, cfg.maxScore)

  return { score, tier: tierFor(score, cfg), breakdown }
}
