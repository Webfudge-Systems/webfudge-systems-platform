'use client'

import { useRouter } from 'next/navigation'
import { Button, DashboardInsightShell, InsightCountBadge } from '@webfudge/ui'

export default function ESSLeaveBalancesWidget({ rows = [], className = '' }) {
  const router = useRouter()
  const totalBalance = rows.reduce((sum, row) => sum + Number(row.balance || 0), 0)

  return (
    <DashboardInsightShell
      className={className}
      title="Leave balances"
      badge={<InsightCountBadge tone="orange">{totalBalance} days</InsightCountBadge>}
      subtitle="Casual, sick, and privilege leave"
      action={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/leave')}
          className="!h-7 !px-2 text-[11px] font-semibold text-orange-600 hover:text-orange-700"
        >
          Apply leave
        </Button>
      }
      panelClassName="p-3"
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {rows.map((row) => (
          <div
            key={row.id}
            className="rounded-lg border border-gray-100 bg-white px-3 py-3 shadow-sm"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-gray-900">{row.type}</span>
              <span className="text-sm font-bold text-orange-600">{row.balance}</span>
            </div>
            <p className="mt-1 text-[11px] text-gray-500">
              Used {row.used} / {row.entitlement}
            </p>
          </div>
        ))}
      </div>
    </DashboardInsightShell>
  )
}
