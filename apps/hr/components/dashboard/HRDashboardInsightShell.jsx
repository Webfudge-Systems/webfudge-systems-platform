'use client'

import { DashboardInsightShell, InsightCountBadge } from '@webfudge/ui'

export { DashboardInsightShell as default }

/**
 * Extended InsightCountBadge with HR-specific tones (red, emerald).
 * Use InsightCountBadge from @webfudge/ui directly for orange/blue/violet tones.
 */
export function HRInsightCountBadge({ children, tone = 'orange' }) {
  const hrOnlyTones = {
    red: 'bg-red-100 text-red-800',
    emerald: 'bg-emerald-100 text-emerald-800',
  }
  if (hrOnlyTones[tone]) {
    return (
      <span className={`rounded-full px-1.5 py-px text-[10px] font-bold leading-none ${hrOnlyTones[tone]}`}>
        {children}
      </span>
    )
  }
  return <InsightCountBadge tone={tone}>{children}</InsightCountBadge>
}
