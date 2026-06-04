'use client'

import { KPICard } from '@webfudge/ui'
import { HR_GLASS_CARD_CLASS } from '../shared/HRGlassCard'

const KPI_GLASS = `${HR_GLASS_CARD_CLASS} !border-white/40 h-full`

/**
 * PM-style compact KPI row with dashboard glass surfaces.
 */
export default function HRAnalyticsKpiRow({ items }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {items.map((item) => (
        <KPICard
          key={item.title}
          compact
          title={item.title}
          value={item.value}
          subtitle={item.subtitle}
          change={item.change}
          changeType={item.changeType}
          icon={item.icon}
          colorScheme="orange"
          className={KPI_GLASS}
        />
      ))}
    </div>
  )
}
