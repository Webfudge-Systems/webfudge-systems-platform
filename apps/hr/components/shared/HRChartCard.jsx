'use client'

import { ResponsiveContainer } from 'recharts'
import HRGlassCard from './HRGlassCard'

export default function HRChartCard({ title, subtitle, children, className = '', height = 280 }) {
  return (
    <HRGlassCard className={className}>
      {title ? (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle ? <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p> : null}
        </div>
      ) : null}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </HRGlassCard>
  )
}
