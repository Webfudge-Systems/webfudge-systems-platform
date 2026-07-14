import type { ReactNode } from 'react'
import { formatSeconds } from '../lib/format'
import type { RealEstateLead } from '../lib/types'

/**
 * Page-time cell. "did not visit" is rendered muted and NEUTRAL — never as a
 * warning. Genuine buyers often skip the landing page (mobile, mid-commute,
 * older buyers); a no-show is not a negative signal.
 */
export function formatPageTimeCell(lead: Pick<RealEstateLead, 'pageVisited' | 'pageTimeSeconds'>): ReactNode {
  if (!lead.pageVisited) {
    return <span className="whitespace-nowrap text-gray-400">did not visit</span>
  }
  return <span className="whitespace-nowrap">{formatSeconds(lead.pageTimeSeconds ?? 0)}</span>
}
