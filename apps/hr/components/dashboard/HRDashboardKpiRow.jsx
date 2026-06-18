'use client'

import { KPICard } from '@webfudge/ui'

const DEFAULT_SCHEMES = ['orange', 'orange', 'orange', 'orange', 'orange', 'orange']

/**
 * HR KPI row — passes subtitle, navigation, and per-card overrides to KPICard
 * without changing the shared DashboardKpiRow / KPICard UI.
 */
export default function HRDashboardKpiRow({ stats = [], columns = 'md:grid-cols-2 lg:grid-cols-4' }) {
  if (!stats.length) return null
  return (
    <div className={`grid grid-cols-1 gap-4 ${columns}`}>
      {stats.map((stat, index) => (
        <KPICard
          key={stat.title}
          title={stat.title}
          value={stat.value}
          valueTitle={stat.valueTitle}
          subtitle={stat.subtitle}
          change={stat.change}
          changeType={stat.changeType}
          icon={stat.icon}
          colorScheme={stat.colorScheme || DEFAULT_SCHEMES[index] || 'orange'}
          onClick={stat.onClick}
          className={stat.className}
        />
      ))}
    </div>
  )
}
