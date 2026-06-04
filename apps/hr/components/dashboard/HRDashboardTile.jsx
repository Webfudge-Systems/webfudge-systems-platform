'use client'

import HRGlassCard from '../shared/HRGlassCard'

/** Matched-height dashboard tile (pair in a 2-col row) */
export default function HRDashboardTile({ children, className = '' }) {
  return (
    <HRGlassCard
      className={`flex h-full min-h-[300px] w-full flex-col !p-4 sm:min-h-[320px] sm:!p-5 ${className}`}
    >
      {children}
    </HRGlassCard>
  )
}
