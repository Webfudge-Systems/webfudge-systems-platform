import { Badge } from '@webfudge/ui'
import type { LeadTier } from '../lib/types'

// Match PM task/priority badges: shared `Badge` soft-filled pills (rounded-lg, md).
const TIER_VARIANTS: Record<LeadTier, string> = {
  hot: 'danger',
  warm: 'warning',
  cold: 'gray',
}

const TIER_LABELS: Record<LeadTier, string> = {
  hot: 'Hot',
  warm: 'Warm',
  cold: 'Cold',
}

export default function TierPill({ tier, className }: { tier: LeadTier; className?: string }) {
  return (
    <Badge variant={TIER_VARIANTS[tier] || 'gray'} className={className}>
      {TIER_LABELS[tier] || tier}
    </Badge>
  )
}
