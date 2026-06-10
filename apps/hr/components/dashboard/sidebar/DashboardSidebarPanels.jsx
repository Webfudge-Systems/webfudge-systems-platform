'use client'

import { Wallet, TrendingDown } from 'lucide-react'
import HRDashboardInsightShell, { HRInsightCountBadge } from '../HRDashboardInsightShell'
import HRDashboardTile from '../HRDashboardTile'
import { TileHighlightCard, TileKpiStrip } from '../tiles/DashboardTileUI'
import { HRSidebarActionRow, HRSidebarInfoRow } from './HRSidebarPanel'
import { PENDING_APPROVALS, UPCOMING_EVENTS, PAYROLL_STATUS, ATTRITION } from '../../../lib/mock-data/dashboard'

const EVENT_ICONS = {
  holiday: '🎉',
  birthday: '🎂',
  anniversary: '⭐',
}

export function PendingApprovalsPanel() {
  const sorted = [...PENDING_APPROVALS].sort((a, b) => Number(b.overdue) - Number(a.overdue))
  const overdueCount = PENDING_APPROVALS.filter((a) => a.overdue).length

  return (
    <HRDashboardInsightShell
      title="Pending approvals"
      badge={
        overdueCount > 0 ? (
          <HRInsightCountBadge tone="red">{overdueCount} overdue</HRInsightCountBadge>
        ) : (
          <HRInsightCountBadge>{sorted.length}</HRInsightCountBadge>
        )
      }
      subtitle={
        overdueCount > 0
          ? 'Leave & expenses awaiting action'
          : 'Leave and expense claims'
      }
      panelClassName="divide-y divide-gray-100/90"
    >
      {sorted.map((item, i) => (
        <HRSidebarActionRow key={i} href={item.href} title={item.title} overdue={item.overdue} />
      ))}
    </HRDashboardInsightShell>
  )
}

export function CurrentGoodPanel() {
  return (
    <HRDashboardInsightShell
      title="Current good"
      badge={<HRInsightCountBadge tone="violet">{UPCOMING_EVENTS.length}</HRInsightCountBadge>}
      subtitle="Holidays, birthdays & milestones"
      panelClassName="divide-y divide-gray-100/90"
    >
      {UPCOMING_EVENTS.map((e, i) => (
        <HRSidebarInfoRow
          key={i}
          leading={EVENT_ICONS[e.type] || '•'}
          title={e.title}
          trailing={e.date}
        />
      ))}
    </HRDashboardInsightShell>
  )
}

export function WorkforceStatusPanel({ activeEmployeeCount }) {
  const headcount = activeEmployeeCount ?? PAYROLL_STATUS.employees

  return (
    <HRDashboardTile
      title="Workforce status"
      badge={<HRInsightCountBadge tone="orange">{headcount}</HRInsightCountBadge>}
      subtitle="Payroll cycle & attrition"
      panelClassName="flex flex-col gap-2 p-3"
    >
      <TileHighlightCard
        icon={Wallet}
        label="Payroll"
        title={PAYROLL_STATUS.amount}
        meta={`${PAYROLL_STATUS.month} · ${headcount} on roster`}
        badge={PAYROLL_STATUS.status}
      />
      <TileKpiStrip
        icon={TrendingDown}
        label="Attrition rate"
        value={`${ATTRITION.rate}%`}
        hint="Rolling 30-day average"
        trend={ATTRITION.change}
        trendPositive={ATTRITION.trend === 'down'}
      />
    </HRDashboardTile>
  )
}

export default function DashboardSidebar() {
  return (
    <div className="space-y-4">
      <PendingApprovalsPanel />
      <CurrentGoodPanel />
    </div>
  )
}
