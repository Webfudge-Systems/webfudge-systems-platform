'use client'

import { Card } from '@webfudge/ui'

/** PM-aligned dashboard insight card — glass `Card` + inner gray panel */
export function HRInsightCountBadge({ children, tone = 'orange' }) {
  const tones = {
    orange: 'bg-orange-100 text-orange-800',
    blue: 'bg-blue-100 text-blue-800',
    violet: 'bg-violet-100 text-violet-800',
    red: 'bg-red-100 text-red-800',
    emerald: 'bg-emerald-100 text-emerald-800',
  }
  return (
    <span
      className={`rounded-full px-1.5 py-px text-[10px] font-bold leading-none ${tones[tone] || tones.orange}`}
    >
      {children}
    </span>
  )
}

export default function HRDashboardInsightShell({
  title,
  badge,
  subtitle,
  action,
  children,
  className = '',
  panelClassName = '',
}) {
  return (
    <Card glass padding={false} className={`flex h-full flex-col p-4 ${className}`}>
      <div className="mb-2.5 flex shrink-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-base font-semibold leading-tight text-gray-900">{title}</h2>
            {badge}
          </div>
          {subtitle ? (
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-gray-500">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div
        className={`min-h-0 flex-1 overflow-hidden rounded-lg border border-gray-100 bg-gray-50/60 ${panelClassName}`}
      >
        {children}
      </div>
    </Card>
  )
}
