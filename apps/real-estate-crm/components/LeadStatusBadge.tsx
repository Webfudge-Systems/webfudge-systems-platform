import { Badge } from '@webfudge/ui'
import { LEAD_STATUS_LABELS, type LeadStatus } from '../lib/types'

const STATUS_VARIANTS: Record<LeadStatus, string> = {
  new: 'info',
  contacted: 'default',
  site_visit_scheduled: 'warning',
  site_visit_done: 'orange',
  negotiating: 'pending',
  booked: 'success',
  lost: 'danger',
}

export default function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge variant={STATUS_VARIANTS[status] || 'default'}>
      {LEAD_STATUS_LABELS[status] || status}
    </Badge>
  )
}
