'use client'

import { Clock, Sparkles, Activity, Wallet, TrendingDown } from 'lucide-react'
import HRDashboardTile from '../HRDashboardTile'
import HRPanelHeader from '../../shared/HRPanelHeader'
import { TileHighlightCard, TileKpiStrip } from '../tiles/DashboardTileUI'
import {
  HRSidebarPanel,
  HRSidebarPanelHeader,
  HRSidebarActionRow,
  HRSidebarInfoRow,
  HRSidebarMetricBlock,
} from './HRSidebarPanel'
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
    <HRSidebarPanel>
      <HRSidebarPanelHeader
        title="Pending approvals"
        subtitle={
          overdueCount > 0
            ? `Leave & expenses · ${overdueCount} overdue`
            : 'Leave and expense claims'
        }
        icon={Clock}
      />
      <ul className="space-y-2">
        {sorted.map((item, i) => (
          <li key={i}>
            <HRSidebarActionRow href={item.href} title={item.title} overdue={item.overdue} />
          </li>
        ))}
      </ul>
    </HRSidebarPanel>
  )
}

export function CurrentGoodPanel() {
  return (
    <HRSidebarPanel>
      <HRSidebarPanelHeader
        title="Current good"
        subtitle="Holidays, birthdays & milestones"
        icon={Sparkles}
      />
      <ul className="space-y-2">
        {UPCOMING_EVENTS.map((e, i) => (
          <HRSidebarInfoRow
            key={i}
            leading={EVENT_ICONS[e.type] || '•'}
            title={e.title}
            trailing={e.date}
          />
        ))}
      </ul>
    </HRSidebarPanel>
  )
}

export function WorkforceStatusPanel({ activeEmployeeCount }) {
  const headcount = activeEmployeeCount ?? PAYROLL_STATUS.employees

  return (
    <HRDashboardTile>
      <HRPanelHeader
        className="mb-3 shrink-0"
        title="Workforce status"
        subtitle="Payroll cycle & attrition"
        icon={Activity}
      />

      <div className="flex flex-col gap-2">
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
      </div>
    </HRDashboardTile>
  )
}

export default function DashboardSidebar() {
  return (
    <div className="space-y-6">
      <PendingApprovalsPanel />
      <CurrentGoodPanel />
    </div>
  )
}
