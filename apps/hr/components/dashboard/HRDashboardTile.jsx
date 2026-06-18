'use client'

import HRDashboardInsightShell from './HRDashboardInsightShell'

/** PM-aligned dashboard metric tile — glass card + inner gray panel */
export default function HRDashboardTile({
  title,
  badge,
  subtitle,
  action,
  panelClassName = 'p-3',
  children,
  className = '',
}) {
  return (
    <HRDashboardInsightShell
      title={title}
      badge={badge}
      subtitle={subtitle}
      action={action}
      panelClassName={panelClassName}
      className={`flex h-full min-h-[280px] flex-col sm:min-h-[300px] ${className}`}
    >
      {children}
    </HRDashboardInsightShell>
  )
}
