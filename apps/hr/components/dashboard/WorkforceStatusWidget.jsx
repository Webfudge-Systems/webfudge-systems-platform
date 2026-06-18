'use client'

import { useRouter } from 'next/navigation'
import {
  Button,
  DashboardProgressRow,
  progressBarColorForValue,
} from '@webfudge/ui'
import HRDashboardInsightShell, { HRInsightCountBadge } from './HRDashboardInsightShell'
import { PAYROLL_STATUS, ATTRITION } from '../../lib/mock-data/dashboard'

function payrollProgressPercent(status) {
  if (status === 'Paid') return 100
  if (status === 'Processing') return 72
  if (status === 'Pending') return 48
  return 35
}

export default function WorkforceStatusWidget({ activeEmployeeCount, className = '' }) {
  const router = useRouter()
  const headcount = activeEmployeeCount ?? PAYROLL_STATUS.employees
  const payrollPct = payrollProgressPercent(PAYROLL_STATUS.status)
  const attritionPct = Math.min(100, Math.round(ATTRITION.rate * 12))

  return (
    <HRDashboardInsightShell
      fillHeight
      className={className}
      title="Workforce status"
      badge={<HRInsightCountBadge tone="orange">{headcount}</HRInsightCountBadge>}
      subtitle="Payroll cycle & attrition"
      action={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/payroll')}
          className="!h-7 !px-2 text-[11px] font-semibold text-orange-600 hover:text-orange-700"
        >
          View all
        </Button>
      }
      panelClassName="flex min-h-0 flex-1 flex-col divide-y divide-gray-100/90"
    >
      <div className="px-3 py-2">
        <DashboardProgressRow
          label={PAYROLL_STATUS.amount}
          meta={`${PAYROLL_STATUS.month} · ${headcount} on roster · ${PAYROLL_STATUS.status}`}
          percent={payrollPct}
          avatarFallback="₹"
          avatarClassName="bg-orange-500 text-white"
          barColor={progressBarColorForValue(payrollPct)}
        />
      </div>
      <div className="px-3 py-2">
        <DashboardProgressRow
          label={`${ATTRITION.rate}% attrition`}
          meta={ATTRITION.change}
          percent={attritionPct}
          avatarFallback="A"
          avatarClassName="bg-emerald-500 text-white"
          barColor={ATTRITION.trend === 'down' ? 'green' : 'red'}
        />
      </div>
    </HRDashboardInsightShell>
  )
}
