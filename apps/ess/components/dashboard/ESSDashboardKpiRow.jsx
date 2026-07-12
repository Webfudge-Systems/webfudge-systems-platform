'use client'

import { KPICard } from '@webfudge/ui'

const DEFAULT_SCHEMES = ['orange', 'orange', 'orange', 'orange']

/**
 * ESS overview KPI row — mirrors HRDashboardKpiRow without changing shared KPICard UI.
 */
export default function ESSDashboardKpiRow({ stats = [], columns = 'sm:grid-cols-2 lg:grid-cols-4' }) {
  const visible = stats.slice(0, 4)
  if (!visible.length) return null
  return (
    <div className={`grid grid-cols-1 gap-4 ${columns}`}>
      {visible.map((stat, index) => (
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
