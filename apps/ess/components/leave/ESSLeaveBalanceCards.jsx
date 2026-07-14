'use client'

import { DashboardInsightShell, DashboardProgressRow, InsightCountBadge, progressBarColorForValue } from '@webfudge/ui'

export default function ESSLeaveBalanceCards({ rows = [], className = '' }) {
  const totalBalance = rows.reduce((sum, row) => sum + Number(row.balance || 0), 0)

  return (
    <DashboardInsightShell
      className={className}
      title="Leave balances"
      badge={<InsightCountBadge tone="orange">{totalBalance} days left</InsightCountBadge>}
      subtitle="Casual, sick, and privilege leave entitlements"
      panelClassName="divide-y divide-gray-100/90"
    >
      {rows.map((row) => {
        const usedPercent =
          row.entitlement > 0 ? Math.min(100, Math.round((row.used / row.entitlement) * 100)) : 0
        return (
          <div key={row.id} className="px-3 py-3">
            <DashboardProgressRow
              label={`${row.type} — ${row.balance} left`}
              meta={`Used ${row.used} / ${row.entitlement}`}
              percent={usedPercent}
              avatarFallback={row.type.charAt(0)}
              avatarClassName="bg-orange-500 text-white"
              barColor={progressBarColorForValue(100 - usedPercent)}
            />
          </div>
        )
      })}
    </DashboardInsightShell>
  )
}
